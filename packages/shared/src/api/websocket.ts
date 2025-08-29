import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from './config';

export interface WebSocketCallbacks {
  onNewJobAssignment?: (data: any) => void;
  onBookingConfirmed?: (data: any) => void;
  onBookingStatusUpdate?: (data: any) => void;
  onChatMessage?: (data: any) => void;
  onProviderLocationUpdate?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  public connect(token: string, callbacks: WebSocketCallbacks = {}) {
    this.token = token;
    this.callbacks = callbacks;

    this.socket = io(API_CONFIG.WEBSOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.callbacks.onDisconnect?.();
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('🔌 WebSocket connection error:', error);
      this.callbacks.onError?.(error);
      
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Job assignment events
    this.socket.on('new_job_assignment', (data: any) => {
      console.log('📝 New job assignment received:', data);
      this.callbacks.onNewJobAssignment?.(data);
    });

    this.socket.on('job_assignment_response_confirmed', (data: any) => {
      console.log('✅ Job assignment response confirmed:', data);
    });

    // Booking events
    this.socket.on('booking_confirmed', (data: any) => {
      console.log('🎉 Booking confirmed:', data);
      this.callbacks.onBookingConfirmed?.(data);
    });

    this.socket.on('booking_status_update', (data: any) => {
      console.log('📊 Booking status update:', data);
      this.callbacks.onBookingStatusUpdate?.(data);
    });

    // Chat events
    this.socket.on('chat_message', (data: any) => {
      console.log('💬 New chat message:', data);
      this.callbacks.onChatMessage?.(data);
    });

    // Provider location events
    this.socket.on('provider_location_update', (data: any) => {
      console.log('📍 Provider location update:', data);
      this.callbacks.onProviderLocationUpdate?.(data);
    });

    // Admin events
    this.socket.on('assignment_failures', (data: any) => {
      console.log('⚠️ Assignment failures:', data);
    });

    this.socket.on('daily_metrics', (data: any) => {
      console.log('📈 Daily metrics:', data);
    });

    this.socket.on('provider_assignment_response', (data: any) => {
      console.log('📋 Provider assignment response:', data);
    });

    // Error events
    this.socket.on('error', (error: any) => {
      console.error('🔌 WebSocket error:', error);
      this.callbacks.onError?.(error);
    });
  }

  // Send job assignment response
  public respondToJobAssignment(assignmentId: number, response: 'accept' | 'decline', declineReason?: string) {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('job_assignment_response', {
      assignmentId,
      response,
      decline_reason: declineReason
    });
  }

  // Update booking status
  public updateBookingStatus(bookingId: number, status: string) {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('booking_status_update', {
      bookingId,
      status
    });
  }

  // Send chat message
  public sendChatMessage(bookingId: number, threadId: number, message: string) {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('chat_message', {
      bookingId,
      threadId,
      message
    });
  }

  // Update provider location (for job tracking)
  public updateProviderLocation(latitude: number, longitude: number, bookingId?: number) {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('provider_location_update', {
      latitude,
      longitude,
      bookingId
    });
  }

  // Disconnect
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check if connected
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket ID
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Create singleton instance
export const websocketClient = new WebSocketClient();
export default websocketClient;