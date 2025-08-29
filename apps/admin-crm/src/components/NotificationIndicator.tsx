import React, { useState, useEffect } from 'react';
import { notificationSoundService } from '../lib/notificationSounds';

interface NotificationIndicatorProps {
  className?: string;
}

interface ActiveNotification {
  id: string;
  type: 'job_assignment' | 'booking_confirmed' | 'message' | 'system_alert' | 'error';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  autoClose?: number;
  actions?: Array<{
    id: string;
    title: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

export const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({ 
  className = '' 
}) => {
  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for WebSocket notifications
    const handleWebSocketNotification = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      let notification: ActiveNotification | null = null;

      switch (type) {
        case 'new_job_assignment':
          notification = {
            id: `job-${data.assignmentId}-${Date.now()}`,
            type: 'job_assignment',
            title: '🚨 New Job Assignment',
            message: `New job available! Respond within 7 minutes.`,
            priority: 'urgent',
            timestamp: new Date(),
            autoClose: 420, // 7 minutes
            actions: [
              {
                id: 'accept',
                title: '✅ Accept',
                action: () => handleJobResponse(data.assignmentId, 'accept'),
                variant: 'primary'
              },
              {
                id: 'decline',
                title: '❌ Decline',
                action: () => handleJobResponse(data.assignmentId, 'decline'),
                variant: 'danger'
              }
            ]
          };
          break;

        case 'booking_confirmed':
          notification = {
            id: `booking-${data.bookingId}-${Date.now()}`,
            type: 'booking_confirmed',
            title: '✅ Booking Confirmed',
            message: data.message || 'Your booking has been confirmed!',
            priority: 'high',
            timestamp: new Date(),
            autoClose: 5
          };
          break;

        case 'assignment_status_update':
          notification = {
            id: `status-${data.assignmentId}-${Date.now()}`,
            type: 'system_alert',
            title: '📊 Assignment Update',
            message: `Assignment ${data.response}: ${data.result?.message || ''}`,
            priority: 'medium',
            timestamp: new Date(),
            autoClose: 3
          };
          break;

        case 'provider_offline':
          notification = {
            id: `offline-${data.providerId}-${Date.now()}`,
            type: 'system_alert',
            title: '📱 Provider Offline',
            message: `Provider went offline: ${data.reason}`,
            priority: 'medium',
            timestamp: new Date(),
            autoClose: 3
          };
          break;

        case 'server_shutdown':
          notification = {
            id: `shutdown-${Date.now()}`,
            type: 'error',
            title: '⚠️ Server Maintenance',
            message: data.message || 'Server is shutting down',
            priority: 'high',
            timestamp: new Date(),
            autoClose: 10
          };
          break;

        default:
          console.log('Unhandled notification type:', type);
          return;
      }

      if (notification) {
        addNotification(notification);
      }
    };

    // Listen for browser notification clicks
    const handleNotificationClick = (event: CustomEvent) => {
      const { tag, data } = event.detail;
      console.log('Notification clicked:', tag, data);
      
      // Handle specific notification actions
      if (tag?.startsWith('job-assignment-')) {
        // Focus on job assignment interface
        setIsVisible(true);
      }
    };

    window.addEventListener('websocket-message', handleWebSocketNotification as EventListener);
    window.addEventListener('notification-clicked', handleNotificationClick as EventListener);

    return () => {
      window.removeEventListener('websocket-message', handleWebSocketNotification as EventListener);
      window.removeEventListener('notification-clicked', handleNotificationClick as EventListener);
    };
  }, []);

  const addNotification = (notification: ActiveNotification) => {
    setNotifications(prev => {
      // Remove duplicate notifications of same type
      const filtered = prev.filter(n => 
        !(n.type === notification.type && n.id !== notification.id)
      );
      
      return [...filtered, notification].slice(-5); // Keep only last 5 notifications
    });

    // Show the notification panel
    setIsVisible(true);

    // Play sound and show browser notification
    notificationSoundService.showNotification(
      notification.title,
      notification.message,
      {
        sound: true,
        vibrate: true,
        priority: notification.priority,
        persistent: notification.priority === 'urgent',
        autoClose: notification.autoClose,
        data: { type: notification.type },
        tag: notification.id,
        actions: notification.actions?.map(action => ({
          action: action.id,
          title: action.title
        }))
      }
    );

    // Auto-close notification after specified time
    if (notification.autoClose) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, notification.autoClose * 1000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleJobResponse = async (assignmentId: number, response: 'accept' | 'decline') => {
    try {
      // This would send the response via WebSocket
      window.dispatchEvent(new CustomEvent('job-response', {
        detail: { assignmentId, response }
      }));

      // Remove the job assignment notification
      setNotifications(prev => prev.filter(n => !n.id.includes(`job-${assignmentId}`)));
      
      console.log(`Job ${assignmentId} ${response}ed`);
    } catch (error) {
      console.error('Failed to respond to job assignment:', error);
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 border-red-600';
      case 'high': return 'bg-orange-500 border-orange-600';
      case 'medium': return 'bg-blue-500 border-blue-600';
      case 'low': return 'bg-gray-500 border-gray-600';
      default: return 'bg-blue-500 border-blue-600';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'job_assignment': return '🚨';
      case 'booking_confirmed': return '✅';
      case 'message': return '💬';
      case 'system_alert': return '📊';
      case 'error': return '⚠️';
      default: return '🔔';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Badge */}
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`relative p-3 rounded-full shadow-lg transition-all duration-200 ${
            notifications.some(n => n.priority === 'urgent') 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
          title={`${notifications.length} active notifications`}
        >
          <div className="text-xl">🔔</div>
          
          {/* Notification Count */}
          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
            {notifications.length}
          </div>
          
          {/* Urgent indicator */}
          {notifications.some(n => n.priority === 'urgent') && (
            <div className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping"></div>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {isVisible && (
        <div className="fixed top-16 right-4 z-40 w-96 max-w-full">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 border-b border-gray-100 last:border-b-0 ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl flex-shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-gray-800 text-sm">
                          {notification.title}
                        </h4>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        
                        {notification.priority === 'urgent' && notification.autoClose && (
                          <span className="text-xs text-red-500">
                            Expires in {Math.ceil(notification.autoClose / 60)}min
                          </span>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {notification.actions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => {
                                action.action();
                                removeNotification(notification.id);
                              }}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                action.variant === 'primary' 
                                  ? 'bg-green-500 hover:bg-green-600 text-white'
                                  : action.variant === 'danger'
                                  ? 'bg-red-500 hover:bg-red-600 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              }`}
                            >
                              {action.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationIndicator;