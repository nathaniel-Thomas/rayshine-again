import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketData {
  type: 'booking_created' | 'provider_assigned' | 'pps_updated' | 'system_health' | 'heartbeat' | 'connection_status';
  payload: any;
  timestamp: string;
}

interface ConnectionStats {
  socketId: string;
  userId: string;
  userRole: string;
  connectedSockets: string[];
  totalConnections: number;
  uptime: number;
  latency?: number;
}

export const useWebSocket = (url: string, authToken?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketData | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [latency, setLatency] = useState<number>(0);

  const getConnectionStatus = useCallback(() => {
    if (socket && connected) {
      socket.emit('get_connection_status');
    }
  }, [socket, connected]);

  const gracefulDisconnect = useCallback((reason?: string) => {
    if (socket && connected) {
      socket.emit('graceful_disconnect', { reason });
    }
  }, [socket, connected]);

  useEffect(() => {
    if (!url) return;
    
    setConnecting(true);
    
    const socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      auth: {
        token: authToken
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketInstance.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setConnected(true);
      setConnecting(false);
      
      // Request connection status
      socketInstance.emit('get_connection_status');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setConnected(false);
      setConnecting(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
      setConnecting(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setConnecting(false);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
      setConnecting(true);
    });

    // Handle connection establishment
    socketInstance.on('connection_established', (data) => {
      console.log('✅ Connection established:', data);
      setConnectionStats(data);
    });

    // Handle connection status response
    socketInstance.on('connection_status', (data) => {
      setConnectionStats(data);
    });

    // Handle heartbeat ping from server
    socketInstance.on('heartbeat_ping', (data) => {
      const pongTime = Date.now();
      socketInstance.emit('heartbeat_pong', { timestamp: data.timestamp });
    });

    // Handle heartbeat acknowledgment from server
    socketInstance.on('heartbeat_ack', (data) => {
      setLatency(data.latency);
    });

    // Handle server shutdown notification
    socketInstance.on('server_shutdown', (data) => {
      console.warn('⚠️ Server shutting down:', data.message);
      setLastMessage({
        type: 'system_health',
        payload: { status: 'server_shutdown', ...data },
        timestamp: new Date().toISOString()
      });
    });

    // Handle graceful disconnect acknowledgment
    socketInstance.on('disconnect_acknowledged', (data) => {
      console.log('👋 Graceful disconnect acknowledged:', data);
    });

    // Listen for real-time updates and dispatch custom events for notifications
    socketInstance.on('booking_created', (data) => {
      setLastMessage({
        type: 'booking_created',
        payload: data,
        timestamp: new Date().toISOString()
      });
      
      // Dispatch custom event for notification system
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type: 'booking_created', data }
      }));
    });

    socketInstance.on('provider_assigned', (data) => {
      setLastMessage({
        type: 'provider_assigned',
        payload: data,
        timestamp: new Date().toISOString()
      });
    });

    socketInstance.on('pps_updated', (data) => {
      setLastMessage({
        type: 'pps_updated',
        payload: data,
        timestamp: new Date().toISOString()
      });
    });

    socketInstance.on('system_health', (data) => {
      setLastMessage({
        type: 'system_health',
        payload: data,
        timestamp: new Date().toISOString()
      });
      
      // Dispatch custom event for notification system
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type: 'system_health', data }
      }));
    });

    // Listen for provider status changes
    socketInstance.on('provider_offline', (data) => {
      setLastMessage({
        type: 'provider_assigned',
        payload: { type: 'provider_offline', ...data },
        timestamp: new Date().toISOString()
      });
      
      // Dispatch custom event for notification system
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type: 'provider_offline', data }
      }));
    });

    // Listen for job assignment notifications
    socketInstance.on('new_job_assignment', (data) => {
      setLastMessage({
        type: 'booking_created',
        payload: { type: 'new_job_assignment', ...data },
        timestamp: new Date().toISOString()
      });
      
      // Dispatch custom event for notification system
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type: 'new_job_assignment', data }
      }));
    });

    // Listen for booking confirmations
    socketInstance.on('booking_confirmed', (data) => {
      setLastMessage({
        type: 'booking_created',
        payload: { type: 'booking_confirmed', ...data },
        timestamp: new Date().toISOString()
      });
      
      // Dispatch custom event for notification system
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type: 'booking_confirmed', data }
      }));
    });

    // Listen for assignment status updates
    socketInstance.on('assignment_status_update', (data) => {
      setLastMessage({
        type: 'system_health',
        payload: { type: 'assignment_status_update', ...data },
        timestamp: new Date().toISOString()
      });
      
      // Dispatch custom event for notification system
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type: 'assignment_status_update', data }
      }));
    });

    setSocket(socketInstance);

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      socketInstance.disconnect();
      setSocket(null);
      setConnected(false);
      setConnecting(false);
      setConnectionStats(null);
    };
  }, [url, authToken]);

  const sendMessage = useCallback((event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }, [socket, connected]);

  return {
    socket,
    connected,
    connecting,
    lastMessage,
    connectionStats,
    latency,
    sendMessage,
    getConnectionStatus,
    gracefulDisconnect
  };
};