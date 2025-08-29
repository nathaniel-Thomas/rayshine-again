import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';
import { realTimeKPIService } from './realTimeKpiService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 25000; // 25 seconds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-production-domain.com'] 
          : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: this.HEARTBEAT_TIMEOUT,
      pingInterval: this.HEARTBEAT_INTERVAL
    });

    this.setupAuthenticationMiddleware();
    this.setupConnectionHandlers();
    this.startHeartbeatMonitoring();
    this.initializeKPIService();
  }

  private setupAuthenticationMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          return next(new Error('Invalid authentication token'));
        }

        // Get user profile for role information
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        socket.userId = user.id;
        socket.userRole = profile?.role || 'customer';
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      const timestamp = Date.now();
      
      // Send ping to all connected clients
      this.io.emit('heartbeat_ping', { timestamp });
      
      // Log connection health
      console.log(`💓 Heartbeat sent to ${this.connectedUsers.size} connected users`);
      
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeatMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private setupConnectionHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 User connected: ${socket.userId} (${socket.userRole}) - Socket ID: ${socket.id}`);
      
      // Store connected user and track multiple connections per user
      if (socket.userId) {
        this.connectedUsers.set(socket.id, socket);
        
        // Track multiple connections per user
        if (!this.userConnections.has(socket.userId)) {
          this.userConnections.set(socket.userId, new Set());
        }
        this.userConnections.get(socket.userId)!.add(socket.id);
        
        // Join role-based room
        socket.join(socket.userRole!);
        
        // Join user-specific room
        socket.join(`user:${socket.userId}`);
        
        // If provider, join provider-specific room
        if (socket.userRole === 'provider') {
          socket.join('providers');
        }

        // Send connection acknowledgment with user info
        socket.emit('connection_established', {
          userId: socket.userId,
          userRole: socket.userRole,
          socketId: socket.id,
          connectedAt: new Date().toISOString(),
          totalConnections: this.userConnections.get(socket.userId)?.size || 0
        });
      }

      // Handle heartbeat response
      socket.on('heartbeat_pong', (data) => {
        const latency = Date.now() - data.timestamp;
        console.log(`💗 Heartbeat response from ${socket.userId} - Latency: ${latency}ms`);
        
        socket.emit('heartbeat_ack', {
          latency,
          timestamp: Date.now()
        });
      });

      // Handle connection status requests
      socket.on('get_connection_status', () => {
        const userConnections = this.userConnections.get(socket.userId!) || new Set();
        socket.emit('connection_status', {
          socketId: socket.id,
          userId: socket.userId,
          userRole: socket.userRole,
          connectedSockets: Array.from(userConnections),
          totalConnections: userConnections.size,
          uptime: process.uptime()
        });
      });

      // Handle job assignment responses
      socket.on('job_assignment_response', async (data) => {
        await this.handleJobAssignmentResponse(socket, data);
      });

      // Handle booking status updates
      socket.on('booking_status_update', async (data) => {
        await this.handleBookingStatusUpdate(socket, data);
      });

      // Handle real-time chat messages
      socket.on('chat_message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('typing_indicator', (data) => {
        const { threadId, isTyping } = data;
        if (threadId && socket.userId) {
          // Forward typing indicator to other participants
          socket.to(`thread:${threadId}`).emit('typing_indicator', {
            userId: socket.userId,
            threadId,
            isTyping,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Join thread rooms for real-time messaging
      socket.on('join_thread', (threadId) => {
        if (threadId && socket.userId) {
          socket.join(`thread:${threadId}`);
          console.log(`👥 User ${socket.userId} joined thread ${threadId}`);
        }
      });

      // Leave thread rooms
      socket.on('leave_thread', (threadId) => {
        if (threadId && socket.userId) {
          socket.leave(`thread:${threadId}`);
          console.log(`👋 User ${socket.userId} left thread ${threadId}`);
        }
      });

      // Handle provider location updates
      socket.on('provider_location_update', async (data) => {
        await this.handleProviderLocationUpdate(socket, data);
      });

      // Handle graceful disconnect
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User disconnected: ${socket.userId} (${socket.userRole}) - Socket ID: ${socket.id} - Reason: ${reason}`);
        
        if (socket.userId) {
          // Remove this specific socket connection
          this.connectedUsers.delete(socket.id);
          
          // Update user connections tracking
          const userSocketsSet = this.userConnections.get(socket.userId);
          if (userSocketsSet) {
            userSocketsSet.delete(socket.id);
            
            // If no more connections for this user, remove the user entirely
            if (userSocketsSet.size === 0) {
              this.userConnections.delete(socket.userId);
              console.log(`📱 All connections closed for user: ${socket.userId}`);
              
              // Notify admins if this was a provider going offline
              if (socket.userRole === 'provider') {
                this.notifyAdmins('provider_offline', {
                  providerId: socket.userId,
                  timestamp: new Date().toISOString(),
                  reason
                });
              }
            } else {
              console.log(`📱 User ${socket.userId} still has ${userSocketsSet.size} active connections`);
            }
          }
        }
      });

      // Handle dashboard-specific events
      socket.on('request_dashboard_metrics', async () => {
        if (socket.userRole === 'admin') {
          const metrics = await this.getDashboardMetrics();
          socket.emit('dashboard_metrics_update', metrics);
        }
      });

      socket.on('force_kpi_refresh', async () => {
        if (socket.userRole === 'admin') {
          console.log(`🔄 Admin ${socket.userId} requested KPI refresh`);
          const metrics = await realTimeKPIService.forceKPIRecalculation();
          socket.emit('dashboard_metrics_update', metrics);
        }
      });

      socket.on('request_live_bookings', async () => {
        if (socket.userRole === 'admin') {
          const bookings = await this.getLiveBookings();
          socket.emit('live_booking_update', bookings);
        }
      });

      socket.on('request_user_activities', async () => {
        if (socket.userRole === 'admin') {
          const activities = await this.getUserActivities();
          socket.emit('user_activity_update', activities);
        }
      });

      socket.on('request_system_alerts', async () => {
        if (socket.userRole === 'admin') {
          const alerts = await this.getSystemAlerts();
          socket.emit('system_alerts_update', alerts);
        }
      });

      socket.on('resolve_system_alert', async (data) => {
        if (socket.userRole === 'admin') {
          const { alertId } = data;
          await this.resolveAlert(alertId);
          this.notifyAdmins('system_alert_resolved', alertId);
        }
      });

      socket.on('broadcast_system_alert', (alert) => {
        if (socket.userRole === 'admin') {
          this.notifyAdmins('system_alert', alert);
        }
      });

      socket.on('dashboard_heartbeat', (data) => {
        socket.emit('dashboard_heartbeat_ack', {
          timestamp: Date.now(),
          latency: Date.now() - data.timestamp
        });
      });

      // Handle explicit graceful disconnect request
      socket.on('graceful_disconnect', (data) => {
        console.log(`🏃 Graceful disconnect requested by ${socket.userId}: ${data?.reason || 'No reason provided'}`);
        
        socket.emit('disconnect_acknowledged', {
          timestamp: new Date().toISOString(),
          message: 'Graceful disconnect acknowledged'
        });
        
        // Allow client to handle any final cleanup before disconnecting
        setTimeout(() => {
          socket.disconnect(true);
        }, 1000);
      });
    });
  }

  // Send job assignment notification to specific provider
  public async notifyProviderJobAssignment(providerId: string, assignmentData: any) {
    const userSocketIds = this.userConnections.get(providerId);
    
    // Send to all user's connections individually for acknowledgment tracking
    if (userSocketIds && userSocketIds.size > 0) {
      const assignmentWithDeadline = {
        ...assignmentData,
        expires_at: assignmentData.expires_at,
        response_deadline: new Date(Date.now() + 7 * 60 * 1000).toISOString()
      };

      userSocketIds.forEach(socketId => {
        const socket = this.connectedUsers.get(socketId);
        if (socket) {
          socket.emit('new_job_assignment', assignmentWithDeadline);
        }
      });
      
      console.log(`🎯 Job assignment sent to provider ${providerId} across ${userSocketIds.size} connections`);
    } else {
      console.log(`⚠️ Provider ${providerId} not connected - job assignment queued`);
      
      // Could implement persistent notification queue here for offline providers
      // Store in database for delivery when provider reconnects
    }

    // Also send to provider-specific room as fallback
    this.io.to(`user:${providerId}`).emit('new_job_assignment', assignmentData);
  }

  // Notify customer of booking confirmation
  public async notifyCustomerBookingConfirmed(customerId: string, bookingData: any) {
    this.io.to(`user:${customerId}`).emit('booking_confirmed', bookingData);
  }

  // Notify all relevant parties of booking status change
  public async notifyBookingStatusUpdate(bookingId: number, statusData: any) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id, provider_id')
      .eq('id', bookingId)
      .single();

    if (booking) {
      // Notify customer
      this.io.to(`user:${booking.customer_id}`).emit('booking_status_update', statusData);
      
      // Notify provider if assigned
      if (booking.provider_id) {
        this.io.to(`user:${booking.provider_id}`).emit('booking_status_update', statusData);
      }
    }
  }

  // Send real-time chat message
  public async sendChatMessage(bookingId: number, messageData: any) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id, provider_id')
      .eq('id', bookingId)
      .single();

    if (booking) {
      const participants = [booking.customer_id, booking.provider_id].filter(Boolean);
      
      participants.forEach(participantId => {
        this.io.to(`user:${participantId}`).emit('chat_message', messageData);
      });
    }
  }

  // Handle job assignment response from provider
  private async handleJobAssignmentResponse(socket: AuthenticatedSocket, data: any) {
    if (socket.userRole !== 'provider') {
      socket.emit('error', { message: 'Only providers can respond to job assignments' });
      return;
    }

    try {
      // Process the response (accept/decline)
      const { assignmentId, response, decline_reason } = data;
      
      // This would integrate with your JobAssignmentService
      // const result = await jobAssignmentService.handleProviderResponse(assignmentId, socket.userId!, response, decline_reason);
      
      // Emit response confirmation
      socket.emit('job_assignment_response_confirmed', {
        assignmentId,
        response,
        timestamp: new Date().toISOString()
      });

      // Notify admins of the response
      this.io.to('admin').emit('provider_assignment_response', {
        providerId: socket.userId,
        assignmentId,
        response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      socket.emit('error', { message: 'Failed to process assignment response' });
    }
  }

  // Handle booking status updates
  private async handleBookingStatusUpdate(socket: AuthenticatedSocket, data: any) {
    try {
      const { bookingId, status } = data;
      
      // Verify user has permission to update this booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_id, provider_id')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        socket.emit('error', { message: 'Booking not found' });
        return;
      }

      const canUpdate = socket.userRole === 'admin' || 
                       booking.customer_id === socket.userId || 
                       booking.provider_id === socket.userId;

      if (!canUpdate) {
        socket.emit('error', { message: 'Permission denied' });
        return;
      }

      // Broadcast to all interested parties
      await this.notifyBookingStatusUpdate(bookingId, {
        bookingId,
        status,
        updatedBy: socket.userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to update booking status' });
    }
  }

  // Handle real-time chat messages
  private async handleChatMessage(socket: AuthenticatedSocket, data: any) {
    try {
      const { bookingId, message, threadId } = data;
      
      // Verify user has access to this chat thread
      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_id, provider_id')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        socket.emit('error', { message: 'Booking not found' });
        return;
      }

      const hasAccess = booking.customer_id === socket.userId || booking.provider_id === socket.userId;

      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Save message to database
      const { data: chatMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: socket.userId,
          content: message
        })
        .select()
        .single();

      if (error) {
        socket.emit('error', { message: 'Failed to save message' });
        return;
      }

      // Broadcast message to participants
      await this.sendChatMessage(bookingId, {
        ...chatMessage,
        bookingId,
        senderRole: socket.userRole
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  // Handle provider location updates (for job tracking)
  private async handleProviderLocationUpdate(socket: AuthenticatedSocket, data: any) {
    if (socket.userRole !== 'provider') {
      socket.emit('error', { message: 'Only providers can update location' });
      return;
    }

    try {
      const { latitude, longitude, bookingId } = data;
      
      // Verify provider is assigned to this booking
      if (bookingId) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('customer_id, provider_id')
          .eq('id', bookingId)
          .eq('provider_id', socket.userId)
          .single();

        if (booking) {
          // Notify customer of provider location update
          this.io.to(`user:${booking.customer_id}`).emit('provider_location_update', {
            bookingId,
            providerId: socket.userId,
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  // Get connected users count by role
  public getConnectedUsersCount(role?: string): number {
    if (!role) {
      return this.userConnections.size; // Unique users, not socket connections
    }
    
    let count = 0;
    this.connectedUsers.forEach(socket => {
      if (socket.userRole === role) {
        // Only count each user once, even if they have multiple connections
        const userId = socket.userId;
        if (userId && this.userConnections.has(userId)) {
          // Check if this is the first socket we've seen for this user in our loop
          const userSockets = this.userConnections.get(userId)!;
          const firstSocketId = Array.from(userSockets)[0];
          if (socket.id === firstSocketId) {
            count++;
          }
        }
      }
    });
    
    return count;
  }

  // Get total socket connections count (including multiple per user)
  public getTotalSocketConnections(): number {
    return this.connectedUsers.size;
  }

  // Get connection stats
  public getConnectionStats() {
    const stats = {
      uniqueUsers: this.userConnections.size,
      totalSockets: this.connectedUsers.size,
      byRole: {
        customer: this.getConnectedUsersCount('customer'),
        provider: this.getConnectedUsersCount('provider'),
        admin: this.getConnectedUsersCount('admin')
      },
      averageConnectionsPerUser: this.userConnections.size > 0 ? 
        this.connectedUsers.size / this.userConnections.size : 0
    };
    
    return stats;
  }

  // Initialize KPI service integration
  private async initializeKPIService() {
    try {
      console.log('🚀 Initializing KPI Service integration with WebSocket...');
      
      // Set this WebSocket service in the KPI service
      realTimeKPIService.setWebSocketService(this);
      
      // Initialize the KPI service
      await realTimeKPIService.initialize();
      
      console.log('✅ KPI Service integration complete');
    } catch (error) {
      console.error('❌ Error initializing KPI service:', error);
    }
  }

  // Cleanup method for graceful shutdown
  public async cleanup() {
    console.log('🧹 Cleaning up WebSocket service...');
    
    this.stopHeartbeatMonitoring();
    
    // Cleanup KPI service
    await realTimeKPIService.cleanup();
    
    // Notify all clients of server shutdown
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down. Please reconnect in a moment.',
      timestamp: new Date().toISOString()
    });
    
    // Give clients time to process shutdown message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Disconnect all sockets
    this.io.disconnectSockets(true);
    
    // Clear internal maps
    this.connectedUsers.clear();
    this.userConnections.clear();
    
    console.log('✅ WebSocket service cleanup complete');
  }

  // Send notification to all admins
  public notifyAdmins(eventName: string, data: any) {
    this.io.to('admin').emit(eventName, data);
  }

  // Send notification to all providers
  public notifyAllProviders(eventName: string, data: any) {
    this.io.to('providers').emit(eventName, data);
  }

  // Check if a specific user is connected
  public isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId) && 
           (this.userConnections.get(userId)?.size || 0) > 0;
  }

  // Send message to specific room/user
  public sendMessage(room: string, eventName: string, data: any) {
    this.io.to(room).emit(eventName, data);
  }

  // Get all connected users by role
  public getConnectedUsersByRole(role: string): string[] {
    const users: string[] = [];
    
    this.connectedUsers.forEach(socket => {
      if (socket.userRole === role && socket.userId) {
        // Only add each user once (avoid duplicates from multiple connections)
        if (!users.includes(socket.userId)) {
          users.push(socket.userId);
        }
      }
    });
    
    return users;
  }

  // Dashboard data methods (now using KPI service)
  private async getDashboardMetrics() {
    try {
      // Use the real-time KPI service for cached metrics
      const metrics = await realTimeKPIService.getMetrics();
      return metrics;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return null;
    }
  }

  private async getLiveBookings() {
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, status, scheduled_start_time, final_cost, estimated_cost,
          created_at, updated_at, service_location,
          user_profiles!bookings_customer_id_fkey(full_name),
          services(name),
          providers:user_profiles!bookings_provider_id_fkey(full_name)
        `)
        .order('updated_at', { ascending: false })
        .limit(20);

      return bookings?.map(booking => ({
        id: booking.id,
        customer_name: booking.user_profiles?.full_name || 'Unknown',
        service_name: booking.services?.name || 'Unknown Service',
        provider_name: booking.providers?.full_name || 'Unassigned',
        status: booking.status,
        scheduled_time: booking.scheduled_start_time,
        cost: booking.final_cost || booking.estimated_cost || 0,
        location: booking.service_location || 'Unknown',
        created_at: booking.created_at,
        updated_at: booking.updated_at
      })) || [];
    } catch (error) {
      console.error('Error fetching live bookings:', error);
      return [];
    }
  }

  private async getUserActivities() {
    // Return mock activities for now - this would integrate with an audit log
    return [
      {
        userId: 'user_1',
        userName: 'System Admin',
        userRole: 'admin',
        action: 'logged in',
        timestamp: new Date().toISOString()
      }
    ];
  }

  private async getSystemAlerts() {
    try {
      const { data: alerts } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      return alerts || [];
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      return [];
    }
  }

  private async resolveAlert(alertId: string) {
    try {
      await supabase
        .from('system_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }

  // Broadcast dashboard updates to all admins
  public broadcastDashboardUpdate(updateType: string, data: any) {
    this.notifyAdmins(`dashboard_${updateType}`, data);
  }

  // Start periodic dashboard updates (now handled by KPI service)
  public startDashboardUpdates() {
    // KPI service now handles periodic updates via database change listeners
    // This method is kept for backwards compatibility but is no longer needed
    console.log('📊 Dashboard updates now handled by Real-Time KPI Service');
    
    // Still send periodic booking updates since they're not part of KPIs
    setInterval(async () => {
      const bookings = await this.getLiveBookings();
      this.notifyAdmins('live_booking_update', bookings);
    }, 30000); // Update every 30 seconds
  }
}