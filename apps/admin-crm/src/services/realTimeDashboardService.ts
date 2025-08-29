import { io, Socket } from 'socket.io-client';
import { supabase } from '../lib/supabaseClient';
import { connectionManager, ConnectionMode, ConnectionState } from './connectionManager';
import { errorRecoveryService, ErrorCode, ErrorSeverity } from './errorRecoveryService';

export interface DashboardMetrics {
  todaysBookings: number;
  totalRevenue: number;
  activeProviders: number;
  avgPPSScore: number;
  pendingApprovals: number;
  revenueToday: number;
  completedBookings: number;
  activeUsers: number;
  providerUtilization: number;
  systemHealth: {
    database: 'online' | 'offline';
    api: 'online' | 'offline';
    websocket: 'online' | 'offline';
    ppsSystem: 'online' | 'offline';
  };
  trends: {
    bookingsTrend: number;
    revenueTrend: number;
    providerTrend: number;
  };
}

export interface LiveBooking {
  id: number;
  customer_name: string;
  service_name: string;
  provider_name?: string;
  status: string;
  scheduled_time: string;
  cost: number;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  userId: string;
  userName: string;
  userRole: 'customer' | 'provider' | 'admin';
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'booking' | 'payment' | 'provider' | 'customer';
  resolved: boolean;
}

class RealTimeDashboardService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  // Connection fallback management
  private connectionMode: ConnectionMode = ConnectionMode.WEBSOCKET;
  private connectionStateUnsubscriber: (() => void) | null = null;
  private lastWebSocketFailure: Date | null = null;
  private pollingFallbackActive = false;

  // Event batching configuration
  private readonly BATCH_DELAY = 100; // 100ms debounce
  private pendingUpdates: Set<string> = new Set();
  private batchTimeout: NodeJS.Timeout | null = null;
  private lastUpdateTimestamp: number = 0;

  // Event listeners
  private metricsListeners: Set<(metrics: DashboardMetrics) => void> = new Set();
  private bookingListeners: Set<(bookings: LiveBooking[]) => void> = new Set();
  private userActivityListeners: Set<(activities: UserActivity[]) => void> = new Set();
  private alertListeners: Set<(alerts: SystemAlert[]) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  // Data caches
  private currentMetrics: DashboardMetrics | null = null;
  private currentBookings: LiveBooking[] = [];
  private recentActivities: UserActivity[] = [];
  private systemAlerts: SystemAlert[] = [];

  // Update queue for batching
  private updateQueue: {
    metrics?: DashboardMetrics;
    bookings?: LiveBooking[];
    activities?: UserActivity[];
    alerts?: SystemAlert[];
  } = {};

  constructor() {
    this.initializeConnectionManagement();
    this.initializeConnection();
  }

  private initializeConnectionManagement() {
    // Subscribe to connection manager state changes
    this.connectionStateUnsubscriber = connectionManager.onModeChange((mode, state) => {
      console.log(`🔄 Connection mode changed: ${mode}/${state}`);
      this.connectionMode = mode;
      
      // Handle mode transitions
      this.handleConnectionModeChange(mode, state);
    });

    // Try to start with WebSocket mode
    this.attemptWebSocketConnection();
  }

  private handleConnectionModeChange(mode: ConnectionMode, state: ConnectionState) {
    switch (mode) {
      case ConnectionMode.WEBSOCKET:
        if (state === ConnectionState.CONNECTED) {
          console.log('✅ WebSocket mode active');
          this.pollingFallbackActive = false;
          this.isConnected = true;
          this.notifyConnectionListeners(true);
        } else if (state === ConnectionState.FAILED) {
          console.log('❌ WebSocket mode failed, preparing for polling fallback');
          this.lastWebSocketFailure = new Date();
          this.isConnected = false;
          this.notifyConnectionListeners(false);
        }
        break;
        
      case ConnectionMode.POLLING:
        if (state === ConnectionState.CONNECTED) {
          console.log('📊 Polling mode active (fallback)');
          this.pollingFallbackActive = true;
          this.isConnected = true; // Consider polling as "connected" for UI purposes
          this.notifyConnectionListeners(true);
        } else if (state === ConnectionState.FAILED) {
          console.log('❌ Polling mode failed');
          this.isConnected = false;
          this.notifyConnectionListeners(false);
        }
        break;
        
      case ConnectionMode.DISCONNECTED:
        console.log('🔌 Disconnected mode');
        this.pollingFallbackActive = false;
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        break;
    }
  }

  private async attemptWebSocketConnection() {
    try {
      await this.initializeConnection();
    } catch (error) {
      console.error('Initial WebSocket connection failed, switching to polling:', error);
      connectionManager.recordFailure(ConnectionMode.WEBSOCKET, error as Error);
    }
  }

  private async initializeConnection() {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        const errorMessage = 'No valid session found for WebSocket connection';
        console.error(errorMessage);
        
        // Report authentication error
        errorRecoveryService.reportError(
          ErrorCode.WEBSOCKET_FAILED,
          errorMessage,
          { reason: 'no_session' },
          { connectionMode: ConnectionMode.WEBSOCKET }
        );
        return;
      }

      // Connect to WebSocket server
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-production-api.com'
        : 'http://localhost:3001';

      this.socket = io(socketUrl, {
        auth: {
          token: session.access_token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.setupEventListeners();
      this.startPeriodicUpdates();
      
    } catch (error) {
      console.error('Failed to initialize dashboard WebSocket connection:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Real-time dashboard connected to WebSocket');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Record successful connection in connection manager
      connectionManager.recordSuccess(ConnectionMode.WEBSOCKET);
      
      this.requestInitialData();
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Dashboard WebSocket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      
      // Record disconnection and potentially trigger fallback
      const error = new Error(`WebSocket disconnected: ${reason}`);
      connectionManager.recordFailure(ConnectionMode.WEBSOCKET, error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Dashboard WebSocket connection error:', error);
      this.isConnected = false;
      
      // Record connection error for fallback consideration
      connectionManager.recordFailure(ConnectionMode.WEBSOCKET, error);
      
      // Report error to recovery system
      errorRecoveryService.reportError(
        ErrorCode.WEBSOCKET_FAILED,
        `WebSocket connection failed: ${error.message}`,
        { error: error.toString() },
        {
          connectionMode: ConnectionMode.WEBSOCKET,
          connectionState: ConnectionState.FAILED,
          retryAttempts: this.reconnectAttempts
        }
      );
    });

    // Heartbeat
    this.socket.on('heartbeat_ping', (data) => {
      this.socket?.emit('heartbeat_pong', data);
    });

    this.socket.on('heartbeat_ack', (data) => {
      // Update connection quality metrics
      console.log(`💗 Dashboard heartbeat latency: ${data.latency}ms`);
      
      // Update connection manager with latency info
      connectionManager.recordSuccess(ConnectionMode.WEBSOCKET, data.latency);
    });

    // Real-time dashboard events with batching
    this.socket.on('dashboard_metrics_update', (metrics: DashboardMetrics) => {
      console.log('📊 Received metrics update, batching...');
      this.queueUpdate('metrics', metrics);
    });

    this.socket.on('live_booking_update', (bookings: LiveBooking[]) => {
      console.log('📋 Received bookings update, batching...');
      this.queueUpdate('bookings', bookings);
    });

    this.socket.on('user_activity_update', (activities: UserActivity[]) => {
      console.log('👥 Received activities update, batching...');
      // Keep only the latest 50 activities
      const mergedActivities = [...activities, ...this.recentActivities].slice(0, 50);
      this.queueUpdate('activities', mergedActivities);
    });

    this.socket.on('system_alert', (alert: SystemAlert) => {
      console.log('🚨 Received system alert, batching...');
      // Add new alert to the beginning of the array
      const updatedAlerts = [alert, ...this.systemAlerts].slice(0, 100);
      this.queueUpdate('alerts', updatedAlerts);
    });

    this.socket.on('system_alert_resolved', (alertId: string) => {
      console.log('✅ Alert resolved, batching update...');
      const updatedAlerts = this.systemAlerts.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      );
      this.queueUpdate('alerts', updatedAlerts);
    });

    // Booking status changes
    this.socket.on('booking_status_update', (bookingUpdate: Partial<LiveBooking> & { id: number }) => {
      const bookingIndex = this.currentBookings.findIndex(b => b.id === bookingUpdate.id);
      if (bookingIndex !== -1) {
        this.currentBookings[bookingIndex] = { 
          ...this.currentBookings[bookingIndex], 
          ...bookingUpdate,
          updated_at: new Date().toISOString()
        };
        this.notifyBookingListeners(this.currentBookings);
      }
    });

    // Provider status changes
    this.socket.on('provider_online', (data: { providerId: string, providerName: string }) => {
      this.addUserActivity({
        userId: data.providerId,
        userName: data.providerName,
        userRole: 'provider',
        action: 'came online',
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on('provider_offline', (data: { providerId: string, providerName: string }) => {
      this.addUserActivity({
        userId: data.providerId,
        userName: data.providerName,
        userRole: 'provider',
        action: 'went offline',
        timestamp: new Date().toISOString()
      });
    });

    // New registrations
    this.socket.on('new_user_registration', (data: { userId: string, userName: string, userRole: string }) => {
      this.addUserActivity({
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole as 'customer' | 'provider' | 'admin',
        action: 'registered',
        timestamp: new Date().toISOString()
      });
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('dashboard_heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startPeriodicUpdates() {
    // Request metrics updates every 5 seconds for critical data
    this.metricsUpdateInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('request_dashboard_metrics');
      }
    }, 5000);
  }

  private stopPeriodicUpdates() {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
  }

  private requestInitialData() {
    if (!this.socket) return;
    
    // Request all initial dashboard data
    this.socket.emit('request_dashboard_metrics');
    this.socket.emit('request_live_bookings');
    this.socket.emit('request_user_activities');
    this.socket.emit('request_system_alerts');
  }

  private addUserActivity(activity: UserActivity) {
    this.recentActivities.unshift(activity);
    this.recentActivities = this.recentActivities.slice(0, 50);
    this.notifyUserActivityListeners(this.recentActivities);
  }

  // Listener management methods
  public onMetricsUpdate(callback: (metrics: DashboardMetrics) => void): () => void {
    this.metricsListeners.add(callback);
    
    // Send current data if available
    if (this.currentMetrics) {
      callback(this.currentMetrics);
    }
    
    return () => this.metricsListeners.delete(callback);
  }

  public onBookingsUpdate(callback: (bookings: LiveBooking[]) => void): () => void {
    this.bookingListeners.add(callback);
    
    if (this.currentBookings.length > 0) {
      callback(this.currentBookings);
    }
    
    return () => this.bookingListeners.delete(callback);
  }

  public onUserActivityUpdate(callback: (activities: UserActivity[]) => void): () => void {
    this.userActivityListeners.add(callback);
    
    if (this.recentActivities.length > 0) {
      callback(this.recentActivities);
    }
    
    return () => this.userActivityListeners.delete(callback);
  }

  public onSystemAlerts(callback: (alerts: SystemAlert[]) => void): () => void {
    this.alertListeners.add(callback);
    
    if (this.systemAlerts.length > 0) {
      callback(this.systemAlerts);
    }
    
    return () => this.alertListeners.delete(callback);
  }

  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    
    // Send current connection status
    callback(this.isConnected);
    
    return () => this.connectionListeners.delete(callback);
  }

  // Event batching methods
  private queueUpdate(updateType: 'metrics' | 'bookings' | 'activities' | 'alerts', data: any) {
    // Add to update queue
    this.updateQueue[updateType] = data;
    this.pendingUpdates.add(updateType);

    // Clear existing timeout and set a new one
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatchedUpdates();
    }, this.BATCH_DELAY);
  }

  private processBatchedUpdates() {
    const now = Date.now();
    console.log(`🔄 Processing batched updates: ${Array.from(this.pendingUpdates).join(', ')} (${this.pendingUpdates.size} updates)`);

    // Process each type of update
    if (this.pendingUpdates.has('metrics') && this.updateQueue.metrics) {
      this.currentMetrics = this.updateQueue.metrics;
      this.notifyMetricsListeners(this.updateQueue.metrics);
    }

    if (this.pendingUpdates.has('bookings') && this.updateQueue.bookings) {
      this.currentBookings = this.updateQueue.bookings;
      this.notifyBookingListeners(this.updateQueue.bookings);
    }

    if (this.pendingUpdates.has('activities') && this.updateQueue.activities) {
      this.recentActivities = this.updateQueue.activities;
      this.notifyUserActivityListeners(this.updateQueue.activities);
    }

    if (this.pendingUpdates.has('alerts') && this.updateQueue.alerts) {
      this.systemAlerts = this.updateQueue.alerts;
      this.notifyAlertListeners(this.updateQueue.alerts);
    }

    // Clear the queues
    this.pendingUpdates.clear();
    this.updateQueue = {};
    this.batchTimeout = null;
    this.lastUpdateTimestamp = now;
  }

  private shouldBatchUpdate(): boolean {
    // Don't batch if it's been too long since last update (avoid indefinite delays)
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTimestamp;
    return timeSinceLastUpdate < 5000; // 5 seconds max delay
  }

  // Notification methods
  private notifyMetricsListeners(metrics: DashboardMetrics) {
    this.metricsListeners.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics listener callback:', error);
      }
    });
  }

  private notifyBookingListeners(bookings: LiveBooking[]) {
    this.bookingListeners.forEach(callback => {
      try {
        callback(bookings);
      } catch (error) {
        console.error('Error in booking listener callback:', error);
      }
    });
  }

  private notifyUserActivityListeners(activities: UserActivity[]) {
    this.userActivityListeners.forEach(callback => {
      try {
        callback(activities);
      } catch (error) {
        console.error('Error in user activity listener callback:', error);
      }
    });
  }

  private notifyAlertListeners(alerts: SystemAlert[]) {
    this.alertListeners.forEach(callback => {
      try {
        callback(alerts);
      } catch (error) {
        console.error('Error in alert listener callback:', error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection listener callback:', error);
      }
    });
  }

  // Public methods for manual actions
  public resolveAlert(alertId: string) {
    if (this.socket) {
      this.socket.emit('resolve_system_alert', { alertId });
    }
  }

  public requestMetricsRefresh() {
    if (this.socket) {
      this.socket.emit('request_dashboard_metrics');
    }
  }

  // New method to force KPI refresh using enhanced backend
  public forceKPIRefresh() {
    if (this.socket) {
      console.log('🔄 Requesting force KPI refresh from backend...');
      this.socket.emit('force_kpi_refresh');
    }
  }

  public broadcastAlert(alert: Omit<SystemAlert, 'id' | 'timestamp'>) {
    if (this.socket) {
      const fullAlert: SystemAlert = {
        ...alert,
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString()
      };
      this.socket.emit('broadcast_system_alert', fullAlert);
    }
  }

  // Connection management with fallback support
  public forceReconnect() {
    console.log('🔄 Force reconnection requested');
    
    if (this.connectionMode === ConnectionMode.WEBSOCKET && this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    } else {
      // Try to switch back to WebSocket if we're in polling mode
      this.attemptWebSocketRecovery();
    }
  }

  private async attemptWebSocketRecovery() {
    // Only attempt WebSocket recovery if we haven't failed recently
    const timeSinceFailure = this.lastWebSocketFailure 
      ? Date.now() - this.lastWebSocketFailure.getTime() 
      : Infinity;
    
    if (timeSinceFailure > 60000) { // Wait at least 1 minute before retry
      console.log('🔄 Attempting WebSocket recovery from polling mode...');
      try {
        await connectionManager.switchToMode(ConnectionMode.WEBSOCKET);
      } catch (error) {
        console.error('WebSocket recovery failed:', error);
      }
    } else {
      console.log('⏳ WebSocket recovery on cooldown, staying in polling mode');
    }
  }

  public getConnectionStatus() {
    const connectionHealth = connectionManager.getHealth();
    
    return {
      connected: this.isConnected,
      mode: this.connectionMode,
      pollingFallbackActive: this.pollingFallbackActive,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
      transport: this.socket?.io.engine?.transport?.name,
      health: connectionHealth,
      degradationLevel: this.getDegradationLevel()
    };
  }

  // Graceful degradation helpers
  private getDegradationLevel(): 'none' | 'minimal' | 'moderate' | 'severe' {
    if (!this.isConnected) {
      return 'severe';
    }
    
    if (this.pollingFallbackActive) {
      return 'moderate'; // Polling mode means some real-time features are degraded
    }
    
    const health = connectionManager.getHealth();
    if (health.latency > 1000) {
      return 'minimal'; // High latency but still connected
    }
    
    return 'none';
  }

  public getFeatureAvailability() {
    const degradationLevel = this.getDegradationLevel();
    
    return {
      realTimeUpdates: degradationLevel !== 'severe',
      instantNotifications: degradationLevel === 'none',
      liveCharts: degradationLevel !== 'severe',
      heartbeat: this.connectionMode === ConnectionMode.WEBSOCKET,
      pollingMode: this.pollingFallbackActive,
      updateFrequency: this.getUpdateFrequency()
    };
  }

  private getUpdateFrequency(): 'realtime' | 'frequent' | 'normal' | 'slow' {
    const degradationLevel = this.getDegradationLevel();
    
    switch (degradationLevel) {
      case 'none': return 'realtime';      // WebSocket: instant updates
      case 'minimal': return 'frequent';   // WebSocket with high latency: ~1s delays  
      case 'moderate': return 'normal';    // Polling: 5-15s intervals
      case 'severe': return 'slow';        // Disconnected: manual refresh only
    }
  }

  // Cleanup
  public disconnect() {
    this.stopHeartbeat();
    this.stopPeriodicUpdates();
    
    // Unsubscribe from connection manager
    if (this.connectionStateUnsubscriber) {
      this.connectionStateUnsubscriber();
      this.connectionStateUnsubscriber = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear all listeners
    this.metricsListeners.clear();
    this.bookingListeners.clear();
    this.userActivityListeners.clear();
    this.alertListeners.clear();
    this.connectionListeners.clear();
  }

  // Getters for current data
  public getCurrentMetrics(): DashboardMetrics | null {
    return this.currentMetrics;
  }

  public getCurrentBookings(): LiveBooking[] {
    return [...this.currentBookings];
  }

  public getRecentActivities(): UserActivity[] {
    return [...this.recentActivities];
  }

  public getSystemAlerts(): SystemAlert[] {
    return [...this.systemAlerts];
  }

  public getUnresolvedAlerts(): SystemAlert[] {
    return this.systemAlerts.filter(alert => !alert.resolved);
  }

  public getCriticalAlerts(): SystemAlert[] {
    return this.systemAlerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
  }

  // New batching control methods
  public getBatchingStats() {
    return {
      pendingUpdates: Array.from(this.pendingUpdates),
      pendingCount: this.pendingUpdates.size,
      lastUpdateTimestamp: this.lastUpdateTimestamp,
      hasPendingBatch: this.batchTimeout !== null,
      batchDelay: this.BATCH_DELAY
    };
  }

  public flushPendingUpdates() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.processBatchedUpdates();
    }
  }

  // Enhanced state management
  public getConnectionState() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
      hasActiveHeartbeat: this.heartbeatInterval !== null,
      lastUpdateTime: this.lastUpdateTimestamp
    };
  }

  // Enhanced cleanup with batching and connection management
  public cleanup() {
    console.log('🧹 Cleaning up Real-Time Dashboard Service...');
    
    // Clear any pending batch updates
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // Stop heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Stop periodic metrics updates
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
    
    // Unsubscribe from connection manager
    if (this.connectionStateUnsubscriber) {
      this.connectionStateUnsubscriber();
      this.connectionStateUnsubscriber = null;
    }
    
    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear all listeners and data
    this.metricsListeners.clear();
    this.bookingListeners.clear();
    this.userActivityListeners.clear();
    this.alertListeners.clear();
    this.connectionListeners.clear();
    
    // Clear caches and queues
    this.currentMetrics = null;
    this.currentBookings = [];
    this.recentActivities = [];
    this.systemAlerts = [];
    this.updateQueue = {};
    this.pendingUpdates.clear();
    
    // Reset connection state
    this.connectionMode = ConnectionMode.WEBSOCKET;
    this.pollingFallbackActive = false;
    this.lastWebSocketFailure = null;
    
    console.log('✅ Real-Time Dashboard Service cleanup complete');
  }
}

// Create and export singleton instance
export const realTimeDashboardService = new RealTimeDashboardService();
export default realTimeDashboardService;