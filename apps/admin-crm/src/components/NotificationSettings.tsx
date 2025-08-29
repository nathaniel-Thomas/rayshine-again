import React, { useState, useEffect } from 'react';
import { pushNotificationService, NotificationPreferences } from '../services/pushNotificationService';
import { offlineMessageQueueService } from '../services/offlineMessageQueueService';

interface NotificationSettingsProps {
  className?: string;
}

interface ExtendedNotificationPreferences extends NotificationPreferences {
  frequency: {
    enabled: boolean;
    maxPerHour: number;
    maxPerDay: number;
    batchDelay: number;
    throttleLow: number;
    throttleMedium: number;
    throttleHigh: number;
  };
  doNotDisturb: {
    enabled: boolean;
    schedule: Array<{
      name: string;
      start: string;
      end: string;
      days: string[];
      allowUrgent: boolean;
    }>;
  };
  bulkActions: {
    enabled: boolean;
    maxBatchSize: number;
    autoMarkReadAfter: number; // hours
  };
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ 
  className = '' 
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [extendedPrefs, setExtendedPrefs] = useState<ExtendedNotificationPreferences | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [queueStatus, setQueueStatus] = useState(offlineMessageQueueService.getStatus());
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'queue'>('basic');

  useEffect(() => {
    loadSettings();
    
    // Listen for queue status updates
    const handleSyncComplete = () => {
      setQueueStatus(offlineMessageQueueService.getStatus());
    };
    
    window.addEventListener('message-sync-complete', handleSyncComplete);
    
    // Update queue status every 30 seconds
    const statusInterval = setInterval(() => {
      setQueueStatus(offlineMessageQueueService.getStatus());
    }, 30000);
    
    return () => {
      window.removeEventListener('message-sync-complete', handleSyncComplete);
      clearInterval(statusInterval);
    };
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Check current status
      setIsSubscribed(pushNotificationService.isSubscribed);
      setHasPermission(pushNotificationService.hasPermission);
      
      // Load preferences
      const prefs = await pushNotificationService.loadNotificationPreferences();
      setPreferences(prefs);
      
      // Load extended preferences
      const extended = await loadExtendedPreferences();
      setExtendedPrefs(extended);
      
      // Update queue status
      setQueueStatus(offlineMessageQueueService.getStatus());
      
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExtendedPreferences = async (): Promise<ExtendedNotificationPreferences> => {
    try {
      const stored = localStorage.getItem('rayshine-extended-notification-prefs');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading extended preferences:', error);
    }
    
    // Return default extended preferences
    const basePrefs = preferences || {
      enabled: false,
      categories: {
        job_assignment: true,
        booking_updates: true,
        messages: true,
        system_alerts: true,
        payment_updates: true,
        provider_status: false
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      sound: true,
      vibration: true
    };
    
    return {
      ...basePrefs,
      frequency: {
        enabled: true,
        maxPerHour: 20,
        maxPerDay: 100,
        batchDelay: 5,
        throttleLow: 15,
        throttleMedium: 5,
        throttleHigh: 1
      },
      doNotDisturb: {
        enabled: false,
        schedule: [
          {
            name: 'Sleep',
            start: '22:00',
            end: '08:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            allowUrgent: true
          }
        ]
      },
      bulkActions: {
        enabled: true,
        maxBatchSize: 50,
        autoMarkReadAfter: 24
      }
    };
  };

  const saveExtendedPreferences = async (prefs: ExtendedNotificationPreferences): Promise<void> => {
    try {
      localStorage.setItem('rayshine-extended-notification-prefs', JSON.stringify(prefs));
      
      // Update frequency settings in queue service
      await offlineMessageQueueService.updateFrequencySettings({
        enabled: prefs.frequency.enabled,
        maxNotificationsPerHour: prefs.frequency.maxPerHour,
        maxNotificationsPerDay: prefs.frequency.maxPerDay,
        batchDelay: prefs.frequency.batchDelay,
        throttleByPriority: {
          low: prefs.frequency.throttleLow,
          medium: prefs.frequency.throttleMedium,
          high: prefs.frequency.throttleHigh,
          urgent: 0
        }
      });
    } catch (error) {
      console.error('Error saving extended preferences:', error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setIsSaving(true);
      const success = await pushNotificationService.subscribe();
      
      if (success) {
        setIsSubscribed(true);
        setHasPermission(true);
        
        // Update preferences
        if (preferences) {
          const updatedPrefs = { ...preferences, enabled: true };
          await pushNotificationService.saveNotificationPreferences(updatedPrefs);
          setPreferences(updatedPrefs);
        }
      } else {
        alert('Failed to enable notifications. Please check your browser settings.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('An error occurred while enabling notifications.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      setIsSaving(true);
      const success = await pushNotificationService.unsubscribe();
      
      if (success) {
        setIsSubscribed(false);
        
        // Update preferences
        if (preferences) {
          const updatedPrefs = { ...preferences, enabled: false };
          await pushNotificationService.saveNotificationPreferences(updatedPrefs);
          setPreferences(updatedPrefs);
        }
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
      alert('An error occurred while disabling notifications.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;

    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);

    try {
      setIsSaving(true);
      await pushNotificationService.saveNotificationPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Revert changes on error
      setPreferences(preferences);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryChange = async (category: keyof NotificationPreferences['categories'], value: boolean) => {
    if (!preferences) return;

    const updatedPrefs = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: value
      }
    };
    
    setPreferences(updatedPrefs);

    try {
      setIsSaving(true);
      await pushNotificationService.saveNotificationPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error saving category preference:', error);
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuietHoursChange = async (field: 'enabled' | 'start' | 'end', value: any) => {
    if (!preferences) return;

    const updatedPrefs = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value
      }
    };
    
    setPreferences(updatedPrefs);

    try {
      setIsSaving(true);
      await pushNotificationService.saveNotificationPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error saving quiet hours:', error);
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const success = await pushNotificationService.sendTestNotification({
        title: '🔔 Test Notification',
        body: 'This is a test notification from Rayshine Admin!',
        type: 'system_alert',
        requireInteraction: false,
        timestamp: Date.now()
      });

      if (success) {
        setTestNotificationSent(true);
        setTimeout(() => setTestNotificationSent(false), 3000);
      } else {
        alert('Failed to send test notification.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('An error occurred while sending the test notification.');
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading notification settings...</div>
        </div>
      </div>
    );
  }

  if (!pushNotificationService.isSupported) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Push notifications not supported
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleExtendedPreferenceChange = async (section: keyof ExtendedNotificationPreferences, key: string, value: any) => {
    if (!extendedPrefs) return;
    
    const updatedPrefs = {
      ...extendedPrefs,
      [section]: {
        ...extendedPrefs[section],
        [key]: value
      }
    };
    
    setExtendedPrefs(updatedPrefs);
    
    try {
      setIsSaving(true);
      await saveExtendedPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error saving extended preferences:', error);
      setExtendedPrefs(extendedPrefs);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearQueue = async () => {
    if (confirm('Are you sure you want to clear all queued messages? This cannot be undone.')) {
      await offlineMessageQueueService.clearQueue();
      setQueueStatus(offlineMessageQueueService.getStatus());
    }
  };

  const handleForceSync = async () => {
    await offlineMessageQueueService.syncQueue();
    setQueueStatus(offlineMessageQueueService.getStatus());
  };

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header with Tabs */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">Push Notifications</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your notification preferences and settings
        </p>
        
        {/* Tab Navigation */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basic Settings
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Advanced
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'queue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Message Queue
              {queueStatus.queueSize > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {queueStatus.queueSize}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Main Enable/Disable Toggle */}
          <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Push Notifications
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isSubscribed 
                  ? 'You will receive push notifications for important updates'
                  : 'Enable push notifications to stay informed about important updates'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {testNotificationSent && (
                <span className="text-sm text-green-600 font-medium">
                  ✅ Test sent!
                </span>
              )}
              
              {isSubscribed && (
                <button
                  onClick={sendTestNotification}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Send Test
                </button>
              )}
              
              <button
                onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
                disabled={isSaving}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isSubscribed
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Processing...' : isSubscribed ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Categories */}
      {isSubscribed && preferences && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Notification Categories
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    🚨 Job Assignments
                  </label>
                  <p className="text-sm text-gray-500">
                    Urgent job assignment notifications with response timers
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.categories.job_assignment}
                  onChange={(e) => handleCategoryChange('job_assignment', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    📋 Booking Updates
                  </label>
                  <p className="text-sm text-gray-500">
                    Booking confirmations, cancellations, and status changes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.categories.booking_updates}
                  onChange={(e) => handleCategoryChange('booking_updates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    💬 Messages
                  </label>
                  <p className="text-sm text-gray-500">
                    New messages from customers and providers
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.categories.messages}
                  onChange={(e) => handleCategoryChange('messages', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ⚠️ System Alerts
                  </label>
                  <p className="text-sm text-gray-500">
                    Important system notifications and alerts
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.categories.system_alerts}
                  onChange={(e) => handleCategoryChange('system_alerts', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    💳 Payment Updates
                  </label>
                  <p className="text-sm text-gray-500">
                    Payment processing and payout notifications
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.categories.payment_updates}
                  onChange={(e) => handleCategoryChange('payment_updates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    👥 Provider Status
                  </label>
                  <p className="text-sm text-gray-500">
                    Provider availability and status changes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.categories.provider_status}
                  onChange={(e) => handleCategoryChange('provider_status', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sound and Vibration Settings */}
      {isSubscribed && preferences && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Notification Behavior
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    🔊 Sound
                  </label>
                  <p className="text-sm text-gray-500">
                    Play notification sounds
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sound}
                  onChange={(e) => handlePreferenceChange('sound', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    📳 Vibration
                  </label>
                  <p className="text-sm text-gray-500">
                    Vibrate device for notifications (mobile only)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.vibration}
                  onChange={(e) => handlePreferenceChange('vibration', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiet Hours */}
      {isSubscribed && preferences && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quiet Hours
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Enable Quiet Hours
                  </label>
                  <p className="text-sm text-gray-500">
                    Suppress non-urgent notifications during specified hours
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.quietHours.enabled}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

          {/* Browser Compatibility Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Browser Compatibility
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Push notifications work best in:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Chrome 50+ (Desktop & Android)</li>
                    <li>Firefox 44+ (Desktop & Android)</li>
                    <li>Safari 16+ (macOS & iOS)</li>
                    <li>Edge 17+</li>
                  </ul>
                  <p className="mt-2">
                    Make sure to allow notifications when prompted by your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Tab */}
      {activeTab === 'advanced' && extendedPrefs && (
        <div className="space-y-6">
          {/* Notification Frequency Controls */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                📊 Notification Frequency
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Enable Frequency Limits
                    </label>
                    <p className="text-sm text-gray-500">
                      Limit the number of notifications to prevent overwhelming
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={extendedPrefs.frequency.enabled}
                    onChange={(e) => handleExtendedPreferenceChange('frequency', 'enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                {extendedPrefs.frequency.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Max per Hour
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={extendedPrefs.frequency.maxPerHour}
                        onChange={(e) => handleExtendedPreferenceChange('frequency', 'maxPerHour', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Max per Day
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={extendedPrefs.frequency.maxPerDay}
                        onChange={(e) => handleExtendedPreferenceChange('frequency', 'maxPerDay', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Batch Delay (seconds)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={extendedPrefs.frequency.batchDelay}
                        onChange={(e) => handleExtendedPreferenceChange('frequency', 'batchDelay', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}

                {extendedPrefs.frequency.enabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Priority Throttling (minutes between notifications)
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Low Priority</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={extendedPrefs.frequency.throttleLow}
                          onChange={(e) => handleExtendedPreferenceChange('frequency', 'throttleLow', parseInt(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Medium Priority</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={extendedPrefs.frequency.throttleMedium}
                          onChange={(e) => handleExtendedPreferenceChange('frequency', 'throttleMedium', parseInt(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">High Priority</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={extendedPrefs.frequency.throttleHigh}
                          onChange={(e) => handleExtendedPreferenceChange('frequency', 'throttleHigh', parseInt(e.target.value))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Do Not Disturb Scheduling */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🌙 Do Not Disturb Schedules
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Enable Do Not Disturb
                    </label>
                    <p className="text-sm text-gray-500">
                      Suppress non-urgent notifications during scheduled times
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={extendedPrefs.doNotDisturb.enabled}
                    onChange={(e) => handleExtendedPreferenceChange('doNotDisturb', 'enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                {extendedPrefs.doNotDisturb.enabled && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    {extendedPrefs.doNotDisturb.schedule.map((schedule, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={schedule.name}
                            onChange={(e) => {
                              const newSchedule = [...extendedPrefs.doNotDisturb.schedule];
                              newSchedule[index] = { ...schedule, name: e.target.value };
                              handleExtendedPreferenceChange('doNotDisturb', 'schedule', newSchedule);
                            }}
                            placeholder="Schedule name"
                            className="text-sm font-medium border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={schedule.allowUrgent}
                              onChange={(e) => {
                                const newSchedule = [...extendedPrefs.doNotDisturb.schedule];
                                newSchedule[index] = { ...schedule, allowUrgent: e.target.checked };
                                handleExtendedPreferenceChange('doNotDisturb', 'schedule', newSchedule);
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="text-xs text-gray-500">Allow urgent</label>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={schedule.start}
                              onChange={(e) => {
                                const newSchedule = [...extendedPrefs.doNotDisturb.schedule];
                                newSchedule[index] = { ...schedule, start: e.target.value };
                                handleExtendedPreferenceChange('doNotDisturb', 'schedule', newSchedule);
                              }}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">End Time</label>
                            <input
                              type="time"
                              value={schedule.end}
                              onChange={(e) => {
                                const newSchedule = [...extendedPrefs.doNotDisturb.schedule];
                                newSchedule[index] = { ...schedule, end: e.target.value };
                                handleExtendedPreferenceChange('doNotDisturb', 'schedule', newSchedule);
                              }}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Active Days</label>
                          <div className="flex flex-wrap gap-2">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                              <label key={day} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={schedule.days.includes(day)}
                                  onChange={(e) => {
                                    const newSchedule = [...extendedPrefs.doNotDisturb.schedule];
                                    const days = e.target.checked 
                                      ? [...schedule.days, day]
                                      : schedule.days.filter(d => d !== day);
                                    newSchedule[index] = { ...schedule, days };
                                    handleExtendedPreferenceChange('doNotDisturb', 'schedule', newSchedule);
                                  }}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-1"
                                />
                                <span className="text-xs capitalize">{day.substr(0, 3)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Actions Settings */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                📦 Bulk Notification Management
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Enable Bulk Actions
                    </label>
                    <p className="text-sm text-gray-500">
                      Allow bulk operations on notifications
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={extendedPrefs.bulkActions.enabled}
                    onChange={(e) => handleExtendedPreferenceChange('bulkActions', 'enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                {extendedPrefs.bulkActions.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Max Batch Size
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="200"
                        value={extendedPrefs.bulkActions.maxBatchSize}
                        onChange={(e) => handleExtendedPreferenceChange('bulkActions', 'maxBatchSize', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Auto Mark Read After (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={extendedPrefs.bulkActions.autoMarkReadAfter}
                        onChange={(e) => handleExtendedPreferenceChange('bulkActions', 'autoMarkReadAfter', parseInt(e.target.value))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Queue Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Queue Status */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  📬 Offline Message Queue
                </h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${queueStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {queueStatus.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{queueStatus.queueSize}</div>
                  <div className="text-sm text-gray-500">Queued Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{queueStatus.failedMessages}</div>
                  <div className="text-sm text-gray-500">Failed Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {queueStatus.lastSyncAttempt 
                      ? new Date(queueStatus.lastSyncAttempt).toLocaleTimeString()
                      : 'Never'
                    }
                  </div>
                  <div className="text-sm text-gray-500">Last Sync</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleForceSync}
                  disabled={queueStatus.syncInProgress || queueStatus.queueSize === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {queueStatus.syncInProgress ? 'Syncing...' : 'Force Sync'}
                </button>
                <button
                  onClick={handleClearQueue}
                  disabled={queueStatus.queueSize === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Queue
                </button>
              </div>
            </div>
          </div>

          {/* Queue Details */}
          {queueStatus.queueSize > 0 && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Queued Messages</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {offlineMessageQueueService.getQueuedMessages().slice(0, 10).map((message) => (
                    <div key={message.id} className="border border-gray-200 rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium capitalize">{message.type.replace('_', ' ')}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            message.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            message.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            message.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.priority}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          Retry: {message.retryCount}/{message.maxRetries}
                        </div>
                      </div>
                      <div className="text-gray-600 mt-1">
                        {new Date(message.timestamp).toLocaleString()}
                      </div>
                      {message.expiresAt && (
                        <div className="text-red-600 text-xs mt-1">
                          Expires: {new Date(message.expiresAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                  {queueStatus.queueSize > 10 && (
                    <div className="text-center text-gray-500 text-sm">
                      ... and {queueStatus.queueSize - 10} more messages
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;