import React, { createContext, useContext, useEffect, useRef } from 'react';
import { websocketClient, WebSocketCallbacks } from '../api/websocket';
import { useAuth } from './AuthProvider';

interface WebSocketContextType {
  isConnected: boolean;
  socketId?: string;
  respondToJobAssignment: (assignmentId: number, response: 'accept' | 'decline', declineReason?: string) => void;
  updateBookingStatus: (bookingId: number, status: string) => void;
  sendChatMessage: (bookingId: number, threadId: number, message: string) => void;
  updateProviderLocation: (latitude: number, longitude: number, bookingId?: number) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  callbacks?: WebSocketCallbacks;
}

export function WebSocketProvider({ children, callbacks = {} }: WebSocketProviderProps) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [socketId, setSocketId] = React.useState<string>();

  useEffect(() => {
    if (isAuthenticated) {
      const token = getAccessToken();
      if (token && !isConnectedRef.current) {
        websocketClient.connect(token, {
          ...callbacks,
          onConnect: () => {
            console.log('🔌 WebSocket connected');
            isConnectedRef.current = true;
            setIsConnected(true);
            setSocketId(websocketClient.getSocketId());
            callbacks.onConnect?.();
          },
          onDisconnect: () => {
            console.log('❌ WebSocket disconnected');
            isConnectedRef.current = false;
            setIsConnected(false);
            setSocketId(undefined);
            callbacks.onDisconnect?.();
          },
          onError: (error) => {
            console.error('🔌 WebSocket error:', error);
            callbacks.onError?.(error);
          }
        });
      }
    } else {
      if (isConnectedRef.current) {
        websocketClient.disconnect();
        isConnectedRef.current = false;
        setIsConnected(false);
        setSocketId(undefined);
      }
    }

    return () => {
      websocketClient.disconnect();
      isConnectedRef.current = false;
    };
  }, [isAuthenticated, callbacks]);

  const contextValue: WebSocketContextType = {
    isConnected,
    socketId,
    respondToJobAssignment: websocketClient.respondToJobAssignment.bind(websocketClient),
    updateBookingStatus: websocketClient.updateBookingStatus.bind(websocketClient),
    sendChatMessage: websocketClient.sendChatMessage.bind(websocketClient),
    updateProviderLocation: websocketClient.updateProviderLocation.bind(websocketClient)
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketProvider;