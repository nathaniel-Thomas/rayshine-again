import { apiClient } from '../lib/apiClient';
import { DashboardMetrics, LiveBooking, UserActivity, SystemAlert } from './realTimeDashboardService';

export enum ConnectionMode {
  WEBSOCKET = 'websocket',
  POLLING = 'polling',
  DISCONNECTED = 'disconnected'
}

export enum ConnectionState {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed'
}

export interface ConnectionHealth {
  mode: ConnectionMode;
  state: ConnectionState;
  latency: number;
  lastSuccessfulConnection: Date | null;
  lastFailure: Date | null;
  consecutiveFailures: number;
  reconnectAttempts: number;
  isHealthy: boolean;
}

export interface ExponentialBackoffConfig {
  baseDelay: number;
  maxDelay: number;
  maxAttempts: number;
  multiplier: number;
  jitter: boolean;
}

export interface PollingConfig {
  metricsInterval: number;
  bookingsInterval: number;
  activitiesInterval: number;
  alertsInterval: number;
  maxRetries: number;
}

/**
 * Connection Manager handles fallback between WebSocket and HTTP polling
 * Provides seamless switching and connection monitoring
 */
export class ConnectionManager {
  private currentMode: ConnectionMode = ConnectionMode.DISCONNECTED;
  private currentState: ConnectionState = ConnectionState.DISCONNECTED;
  
  // Connection health tracking
  private health: ConnectionHealth = {
    mode: ConnectionMode.DISCONNECTED,
    state: ConnectionState.DISCONNECTED,
    latency: 0,
    lastSuccessfulConnection: null,
    lastFailure: null,
    consecutiveFailures: 0,
    reconnectAttempts: 0,
    isHealthy: false
  };

  // Backoff configuration
  private backoffConfig: ExponentialBackoffConfig = {
    baseDelay: 1000,      // Start with 1 second
    maxDelay: 30000,      // Max 30 seconds
    maxAttempts: 10,      // Try 10 times before switching modes
    multiplier: 2,        // Double delay each attempt
    jitter: true          // Add randomness to prevent thundering herd
  };

  // Polling configuration
  private pollingConfig: PollingConfig = {
    metricsInterval: 5000,      // Poll metrics every 5 seconds
    bookingsInterval: 10000,    // Poll bookings every 10 seconds
    activitiesInterval: 15000,  // Poll activities every 15 seconds
    alertsInterval: 20000,      // Poll alerts every 20 seconds
    maxRetries: 3               // Max retries per polling request
  };

  // Polling intervals
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private connectionTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Event listeners
  private modeChangeListeners: Set<(mode: ConnectionMode, state: ConnectionState) => void> = new Set();
  private healthChangeListeners: Set<(health: ConnectionHealth) => void> = new Set();

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Get current connection health status
   */
  public getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  /**
   * Get current connection mode
   */
  public getMode(): ConnectionMode {
    return this.currentMode;
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.currentState;
  }

  /**
   * Check if connection is healthy and reliable
   */
  public isHealthy(): boolean {
    return this.health.isHealthy && (
      this.currentMode === ConnectionMode.WEBSOCKET || 
      this.currentMode === ConnectionMode.POLLING
    );
  }

  /**
   * Update connection mode and state
   */
  public updateConnectionStatus(mode: ConnectionMode, state: ConnectionState, error?: Error) {
    const previousMode = this.currentMode;
    const previousState = this.currentState;

    this.currentMode = mode;
    this.currentState = state;

    // Update health tracking
    this.updateHealth(state, error);

    // Notify listeners of mode/state changes
    if (previousMode !== mode || previousState !== state) {
      this.notifyModeChangeListeners(mode, state);
    }

    // Log connection changes
    console.log(`🔄 Connection status: ${mode}/${state}${error ? ` (${error.message})` : ''}`);
  }

  /**
   * Record successful connection event
   */
  public recordSuccess(mode: ConnectionMode, latency?: number) {
    this.health.lastSuccessfulConnection = new Date();
    this.health.consecutiveFailures = 0;
    this.health.reconnectAttempts = 0;
    this.health.latency = latency || 0;
    this.health.isHealthy = true;

    this.updateConnectionStatus(mode, ConnectionState.CONNECTED);
  }

  /**
   * Record connection failure
   */
  public recordFailure(mode: ConnectionMode, error: Error) {
    this.health.lastFailure = new Date();
    this.health.consecutiveFailures++;
    this.health.isHealthy = false;

    // Determine if we should switch modes or keep retrying
    if (this.shouldSwitchMode()) {
      const newMode = this.getAlternateMode(mode);
      console.log(`🔀 Switching from ${mode} to ${newMode} after ${this.health.consecutiveFailures} failures`);
      this.switchToMode(newMode);
    } else {
      this.updateConnectionStatus(mode, ConnectionState.FAILED, error);
    }
  }

  /**
   * Manually switch to a specific connection mode
   */
  public async switchToMode(mode: ConnectionMode): Promise<boolean> {
    console.log(`🎯 Manually switching to ${mode} mode`);
    
    // Clean up current mode
    await this.cleanupCurrentMode();

    // Reset some health metrics when switching
    this.health.reconnectAttempts = 0;
    
    // Update status
    this.updateConnectionStatus(mode, ConnectionState.CONNECTING);

    try {
      switch (mode) {
        case ConnectionMode.WEBSOCKET:
          return await this.initializeWebSocket();
          
        case ConnectionMode.POLLING:
          return await this.initializePolling();
          
        case ConnectionMode.DISCONNECTED:
          this.updateConnectionStatus(ConnectionMode.DISCONNECTED, ConnectionState.DISCONNECTED);
          return true;
          
        default:
          throw new Error(`Unsupported connection mode: ${mode}`);
      }
    } catch (error) {
      console.error(`❌ Failed to switch to ${mode}:`, error);
      this.recordFailure(mode, error as Error);
      return false;
    }
  }

  /**
   * Calculate next backoff delay using exponential backoff with jitter
   */
  public calculateBackoffDelay(): number {
    const { baseDelay, maxDelay, multiplier, jitter } = this.backoffConfig;
    const attempts = Math.min(this.health.reconnectAttempts, 10); // Cap for calculation
    
    let delay = Math.min(baseDelay * Math.pow(multiplier, attempts), maxDelay);
    
    if (jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitterAmount = delay * 0.25;
      delay += (Math.random() * 2 - 1) * jitterAmount;
    }
    
    return Math.max(delay, baseDelay);
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  public async attemptReconnection(): Promise<boolean> {
    if (this.health.reconnectAttempts >= this.backoffConfig.maxAttempts) {
      console.log(`🚫 Max reconnection attempts reached (${this.backoffConfig.maxAttempts}), switching modes`);
      
      const alternateMode = this.getAlternateMode(this.currentMode);
      return await this.switchToMode(alternateMode);
    }

    this.health.reconnectAttempts++;
    const delay = this.calculateBackoffDelay();
    
    console.log(`🔄 Attempting reconnection #${this.health.reconnectAttempts} in ${delay}ms`);
    
    return new Promise((resolve) => {
      this.connectionTimeout = setTimeout(async () => {
        try {
          this.updateConnectionStatus(this.currentMode, ConnectionState.RECONNECTING);
          const success = await this.switchToMode(this.currentMode);
          resolve(success);
        } catch (error) {
          console.error('Reconnection attempt failed:', error);
          this.recordFailure(this.currentMode, error as Error);
          resolve(false);
        }
      }, delay);
    });
  }

  /**
   * Subscribe to connection mode changes
   */
  public onModeChange(callback: (mode: ConnectionMode, state: ConnectionState) => void): () => void {
    this.modeChangeListeners.add(callback);
    return () => this.modeChangeListeners.delete(callback);
  }

  /**
   * Subscribe to health changes
   */
  public onHealthChange(callback: (health: ConnectionHealth) => void): () => void {
    this.healthChangeListeners.add(callback);
    return () => this.healthChangeListeners.delete(callback);
  }

  /**
   * Start HTTP polling for dashboard data
   */
  private async initializePolling(): Promise<boolean> {
    try {
      console.log('📊 Initializing HTTP polling mode...');
      
      // Test initial connection
      const testMetrics = await this.pollMetrics();
      if (!testMetrics) {
        throw new Error('Failed to fetch initial metrics via polling');
      }

      // Start polling intervals
      this.startPollingIntervals();
      
      this.recordSuccess(ConnectionMode.POLLING);
      return true;
      
    } catch (error) {
      console.error('Failed to initialize polling:', error);
      this.recordFailure(ConnectionMode.POLLING, error as Error);
      return false;
    }
  }

  /**
   * Initialize WebSocket connection (placeholder - will be implemented by realTimeDashboardService)
   */
  private async initializeWebSocket(): Promise<boolean> {
    // This is a placeholder - the actual WebSocket initialization
    // will be handled by the realTimeDashboardService
    console.log('🔌 WebSocket initialization requested (handled by realTimeDashboardService)');
    return true;
  }

  /**
   * Start all polling intervals
   */
  private startPollingIntervals() {
    const { metricsInterval, bookingsInterval, activitiesInterval, alertsInterval } = this.pollingConfig;

    // Poll metrics
    this.pollingIntervals.set('metrics', setInterval(() => {
      this.pollMetrics().catch(error => {
        console.error('Metrics polling failed:', error);
        this.recordFailure(ConnectionMode.POLLING, error);
      });
    }, metricsInterval));

    // Poll bookings
    this.pollingIntervals.set('bookings', setInterval(() => {
      this.pollBookings().catch(error => {
        console.error('Bookings polling failed:', error);
        this.recordFailure(ConnectionMode.POLLING, error);
      });
    }, bookingsInterval));

    // Poll activities
    this.pollingIntervals.set('activities', setInterval(() => {
      this.pollActivities().catch(error => {
        console.error('Activities polling failed:', error);
        this.recordFailure(ConnectionMode.POLLING, error);
      });
    }, activitiesInterval));

    // Poll alerts
    this.pollingIntervals.set('alerts', setInterval(() => {
      this.pollAlerts().catch(error => {
        console.error('Alerts polling failed:', error);
        this.recordFailure(ConnectionMode.POLLING, error);
      });
    }, alertsInterval));

    console.log('📊 HTTP polling intervals started');
  }

  /**
   * Stop all polling intervals
   */
  private stopPollingIntervals() {
    for (const [name, interval] of this.pollingIntervals) {
      clearInterval(interval);
      console.log(`⏹️ Stopped ${name} polling`);
    }
    this.pollingIntervals.clear();
  }

  /**
   * Poll dashboard metrics via HTTP
   */
  private async pollMetrics(): Promise<DashboardMetrics | null> {
    try {
      const startTime = Date.now();
      
      // Make API call for metrics (you'll need to implement this endpoint)
      const response = await fetch('/api/dashboard/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers as needed
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metrics: DashboardMetrics = await response.json();
      const latency = Date.now() - startTime;
      
      // Update health with successful request
      this.health.latency = latency;
      
      return metrics;
      
    } catch (error) {
      console.error('Failed to poll metrics:', error);
      return null;
    }
  }

  /**
   * Poll live bookings via HTTP
   */
  private async pollBookings(): Promise<LiveBooking[] | null> {
    try {
      const response = await fetch('/api/dashboard/bookings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const bookings: LiveBooking[] = await response.json();
      return bookings;
      
    } catch (error) {
      console.error('Failed to poll bookings:', error);
      return null;
    }
  }

  /**
   * Poll user activities via HTTP
   */
  private async pollActivities(): Promise<UserActivity[] | null> {
    try {
      const response = await fetch('/api/dashboard/activities', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const activities: UserActivity[] = await response.json();
      return activities;
      
    } catch (error) {
      console.error('Failed to poll activities:', error);
      return null;
    }
  }

  /**
   * Poll system alerts via HTTP
   */
  private async pollAlerts(): Promise<SystemAlert[] | null> {
    try {
      const response = await fetch('/api/dashboard/alerts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const alerts: SystemAlert[] = await response.json();
      return alerts;
      
    } catch (error) {
      console.error('Failed to poll alerts:', error);
      return null;
    }
  }

  /**
   * Update health metrics
   */
  private updateHealth(state: ConnectionState, error?: Error) {
    this.health.mode = this.currentMode;
    this.health.state = state;

    if (error) {
      this.health.lastFailure = new Date();
      this.health.consecutiveFailures++;
      this.health.isHealthy = false;
    }

    // Notify health change listeners
    this.notifyHealthChangeListeners();
  }

  /**
   * Determine if we should switch connection modes
   */
  private shouldSwitchMode(): boolean {
    // Switch after 3 consecutive failures
    return this.health.consecutiveFailures >= 3;
  }

  /**
   * Get alternate connection mode
   */
  private getAlternateMode(currentMode: ConnectionMode): ConnectionMode {
    switch (currentMode) {
      case ConnectionMode.WEBSOCKET:
        return ConnectionMode.POLLING;
      case ConnectionMode.POLLING:
        return ConnectionMode.WEBSOCKET;
      default:
        return ConnectionMode.POLLING; // Default fallback
    }
  }

  /**
   * Clean up current connection mode
   */
  private async cleanupCurrentMode(): Promise<void> {
    switch (this.currentMode) {
      case ConnectionMode.POLLING:
        this.stopPollingIntervals();
        break;
      case ConnectionMode.WEBSOCKET:
        // WebSocket cleanup will be handled by realTimeDashboardService
        break;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check health every 30 seconds
  }

  /**
   * Perform periodic health check
   */
  private performHealthCheck() {
    const now = Date.now();
    const timeSinceLastSuccess = this.health.lastSuccessfulConnection 
      ? now - this.health.lastSuccessfulConnection.getTime() 
      : Infinity;

    // If no successful connection in 5 minutes, consider unhealthy
    if (timeSinceLastSuccess > 5 * 60 * 1000) {
      console.log('⚠️ Connection health degraded - no successful connection in 5+ minutes');
      this.health.isHealthy = false;
      
      // Try to recover
      if (this.currentState !== ConnectionState.CONNECTING && this.currentState !== ConnectionState.RECONNECTING) {
        console.log('🔄 Attempting health recovery...');
        this.attemptReconnection();
      }
    }
  }

  /**
   * Notify mode change listeners
   */
  private notifyModeChangeListeners(mode: ConnectionMode, state: ConnectionState) {
    this.modeChangeListeners.forEach(callback => {
      try {
        callback(mode, state);
      } catch (error) {
        console.error('Error in mode change listener:', error);
      }
    });
  }

  /**
   * Notify health change listeners
   */
  private notifyHealthChangeListeners() {
    this.healthChangeListeners.forEach(callback => {
      try {
        callback(this.getHealth());
      } catch (error) {
        console.error('Error in health change listener:', error);
      }
    });
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown() {
    console.log('🔌 Shutting down Connection Manager...');
    
    this.cleanupCurrentMode();
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.modeChangeListeners.clear();
    this.healthChangeListeners.clear();

    this.updateConnectionStatus(ConnectionMode.DISCONNECTED, ConnectionState.DISCONNECTED);
    
    console.log('✅ Connection Manager shutdown complete');
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();
export default connectionManager;