import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Bell,
  Calendar,
  UserCheck,
  TrendingUp,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'booking_created' | 'provider_assigned' | 'pps_updated' | 'system_health';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const RealTimeNotifications: React.FC = () => {
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const { connected, lastMessage } = useWebSocket(WS_URL);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (lastMessage) {
      const notification: Notification = {
        id: Date.now().toString(),
        type: lastMessage.type,
        title: getNotificationTitle(lastMessage.type),
        message: getNotificationMessage(lastMessage),
        timestamp: new Date(lastMessage.timestamp),
        read: false,
        priority: getNotificationPriority(lastMessage.type)
      };

      setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep only latest 20
    }
  }, [lastMessage]);

  const getNotificationTitle = (type: string): string => {
    switch (type) {
      case 'booking_created': return 'New Booking Created';
      case 'provider_assigned': return 'Provider Assigned';
      case 'pps_updated': return 'PPS Score Updated';
      case 'system_health': return 'System Update';
      default: return 'Notification';
    }
  };

  const getNotificationMessage = (data: any): string => {
    switch (data.type) {
      case 'booking_created':
        return `New booking for ${data.payload.service_name} - $${data.payload.amount}`;
      case 'provider_assigned':
        return `${data.payload.provider_name} assigned to booking #${data.payload.booking_id}`;
      case 'pps_updated':
        return `Provider PPS score updated: ${data.payload.old_score} → ${data.payload.new_score}`;
      case 'system_health':
        return `System status: ${data.payload.status}`;
      default:
        return 'New notification received';
    }
  };

  const getNotificationPriority = (type: string): 'low' | 'medium' | 'high' => {
    switch (type) {
      case 'booking_created': return 'high';
      case 'provider_assigned': return 'medium';
      case 'pps_updated': return 'low';
      case 'system_health': return 'medium';
      default: return 'low';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_created': return Calendar;
      case 'provider_assigned': return UserCheck;
      case 'pps_updated': return TrendingUp;
      case 'system_health': return AlertCircle;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPanel(!showPanel)}
        className="relative text-gray-300 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </Button>

      {/* WebSocket Connection Status */}
      <div className="absolute -bottom-8 right-0">
        <Badge className={connected ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} mr-2`}></div>
          {connected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {/* Notifications Panel */}
      {showPanel && (
        <div className="absolute top-12 right-0 w-80 max-h-96 overflow-hidden z-50">
          <Card className="bg-gray-900/95 backdrop-blur-xl border-gray-800/50 shadow-xl">
            <div className="p-4 border-b border-gray-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPanel(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <CardContent className="p-0 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-gray-800/50 transition-colors border-l-2 ${!notification.read ? 'border-blue-500 bg-gray-800/20' : 'border-transparent'}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 p-1 rounded ${getPriorityColor(notification.priority)}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white truncate">
                                {notification.title}
                              </p>
                              <div className="flex items-center space-x-1">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                    className="p-1 h-auto text-green-400 hover:text-green-300"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteNotification(notification.id)}
                                  className="p-1 h-auto text-red-400 hover:text-red-300"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};