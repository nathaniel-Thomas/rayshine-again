// Offline Message Queue Service for Rayshine Admin CRM
// Handles message queuing when offline and synchronization when back online

export interface QueuedMessage {
  id: string;
  type: 'notification' | 'message' | 'assignment_response' | 'status_update';
  timestamp: number;
  data: any;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: number;
}

export interface MessageSyncStatus {
  isOnline: boolean;
  queueSize: number;
  lastSyncAttempt: number | null;
  syncInProgress: boolean;
  failedMessages: number;
}

export interface NotificationFrequencySettings {
  enabled: boolean;
  maxNotificationsPerHour: number;
  maxNotificationsPerDay: number;
  batchSimilarNotifications: boolean;
  batchDelay: number; // seconds
  throttleByPriority: {
    low: number;    // minutes between notifications
    medium: number; 
    high: number;   
    urgent: number; 
  };
}

class OfflineMessageQueueService {
  private queue: QueuedMessage[] = [];
  private readonly STORAGE_KEY = 'rayshine-offline-message-queue';
  private readonly FREQUENCY_STORAGE_KEY = 'rayshine-notification-frequency';
  private readonly MAX_QUEUE_SIZE = 1000;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private lastSyncAttempt: number | null = null;
  private frequencySettings: NotificationFrequencySettings;
  private notificationCounts = {
    hourly: new Map<number, number>(),
    daily: new Map<number, number>()
  };
  private lastNotificationTime = new Map<string, number>();

  constructor() {
    this.loadQueue();
    this.loadFrequencySettings();
    this.setupOnlineListeners();
    this.startPeriodicSync();
    this.cleanupExpiredMessages();
  }

  // Queue Management
  async addToQueue(
    type: QueuedMessage['type'],
    data: any,
    priority: QueuedMessage['priority'] = 'medium',
    maxRetries: number = 3,
    expiresIn?: number // seconds
  ): Promise<string> {
    const messageId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      type,
      timestamp: Date.now(),
      data,
      retryCount: 0,
      maxRetries,
      priority,
      expiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : undefined
    };

    // Check queue size limit
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest low priority messages
      this.queue = this.queue.filter(msg => msg.priority !== 'low').slice(-this.MAX_QUEUE_SIZE + 100);
    }

    this.queue.push(queuedMessage);
    this.sortQueueByPriority();
    await this.saveQueue();

    console.log(`📝 Added message to queue: ${messageId} (${type}, ${priority})`);

    // Try immediate sync if online
    if (this.isOnline) {
      this.syncQueue();
    }

    return messageId;
  }

  private sortQueueByPriority(): void {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp; // FIFO within same priority
    });
  }

  async removeFromQueue(messageId: string): Promise<boolean> {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(msg => msg.id !== messageId);
    
    if (this.queue.length < initialLength) {
      await this.saveQueue();
      console.log(`🗑️ Removed message from queue: ${messageId}`);
      return true;
    }
    return false;
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    console.log('🧹 Cleared message queue');
  }

  // Synchronization
  async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = Date.now();
    
    console.log(`🔄 Starting queue sync (${this.queue.length} messages)`);

    const messagesToSync = [...this.queue];
    const results = { success: 0, failed: 0, expired: 0 };

    for (const message of messagesToSync) {
      try {
        // Check if message expired
        if (message.expiresAt && Date.now() > message.expiresAt) {
          await this.removeFromQueue(message.id);
          results.expired++;
          continue;
        }

        const success = await this.syncMessage(message);
        
        if (success) {
          await this.removeFromQueue(message.id);
          results.success++;
        } else {
          message.retryCount++;
          
          if (message.retryCount >= message.maxRetries) {
            console.warn(`❌ Message ${message.id} exceeded max retries, removing`);
            await this.removeFromQueue(message.id);
            results.failed++;
          }
        }
      } catch (error) {
        console.error(`Error syncing message ${message.id}:`, error);
        message.retryCount++;
        results.failed++;
      }
    }

    this.syncInProgress = false;
    
    console.log(`✅ Sync complete: ${results.success} success, ${results.failed} failed, ${results.expired} expired`);

    // Emit sync complete event
    window.dispatchEvent(new CustomEvent('message-sync-complete', {
      detail: { results, queueSize: this.queue.length }
    }));
  }

  private async syncMessage(message: QueuedMessage): Promise<boolean> {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const authToken = localStorage.getItem('rayshine-auth-token') || '';

      let endpoint = '';
      let method = 'POST';
      let payload = message.data;

      switch (message.type) {
        case 'notification':
          endpoint = '/notifications/send';
          break;
        case 'message':
          endpoint = '/messages/send';
          break;
        case 'assignment_response':
          endpoint = '/assignments/respond';
          method = 'PUT';
          break;
        case 'status_update':
          endpoint = '/status/update';
          method = 'PUT';
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
          return false;
      }

      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...payload,
          queuedAt: message.timestamp,
          retryCount: message.retryCount
        })
      });

      return response.ok;

    } catch (error) {
      console.error('Error syncing message:', error);
      return false;
    }
  }

  // Notification Frequency Control
  async updateFrequencySettings(settings: Partial<NotificationFrequencySettings>): Promise<void> {
    this.frequencySettings = { ...this.frequencySettings, ...settings };
    await this.saveFrequencySettings();
    console.log('🔧 Updated frequency settings:', settings);
  }

  shouldAllowNotification(type: string, priority: QueuedMessage['priority']): boolean {
    if (!this.frequencySettings.enabled) {
      return true; // No frequency limits
    }

    const now = Date.now();
    const hourKey = Math.floor(now / (1000 * 60 * 60));
    const dayKey = Math.floor(now / (1000 * 60 * 60 * 24));

    // Check hourly limit
    const hourlyCount = this.notificationCounts.hourly.get(hourKey) || 0;
    if (hourlyCount >= this.frequencySettings.maxNotificationsPerHour) {
      console.log('⏰ Notification blocked: hourly limit reached');
      return false;
    }

    // Check daily limit
    const dailyCount = this.notificationCounts.daily.get(dayKey) || 0;
    if (dailyCount >= this.frequencySettings.maxNotificationsPerDay) {
      console.log('📅 Notification blocked: daily limit reached');
      return false;
    }

    // Check throttling by priority
    const lastTime = this.lastNotificationTime.get(type) || 0;
    const throttleDelay = this.frequencySettings.throttleByPriority[priority] * 60 * 1000;
    
    if (now - lastTime < throttleDelay) {
      console.log(`⏱️ Notification throttled: ${type} (${priority})`);
      return false;
    }

    return true;
  }

  recordNotification(type: string, priority: QueuedMessage['priority']): void {
    const now = Date.now();
    const hourKey = Math.floor(now / (1000 * 60 * 60));
    const dayKey = Math.floor(now / (1000 * 60 * 60 * 24));

    // Update counts
    this.notificationCounts.hourly.set(hourKey, (this.notificationCounts.hourly.get(hourKey) || 0) + 1);
    this.notificationCounts.daily.set(dayKey, (this.notificationCounts.daily.get(dayKey) || 0) + 1);
    this.lastNotificationTime.set(type, now);

    // Cleanup old entries
    this.cleanupNotificationCounts();
  }

  private cleanupNotificationCounts(): void {
    const now = Date.now();
    const currentHour = Math.floor(now / (1000 * 60 * 60));
    const currentDay = Math.floor(now / (1000 * 60 * 60 * 24));

    // Keep only last 24 hours
    for (const [hour] of this.notificationCounts.hourly) {
      if (hour < currentHour - 24) {
        this.notificationCounts.hourly.delete(hour);
      }
    }

    // Keep only last 7 days
    for (const [day] of this.notificationCounts.daily) {
      if (day < currentDay - 7) {
        this.notificationCounts.daily.delete(day);
      }
    }
  }

  // Bulk Operations
  async bulkMarkAsRead(messageIds: string[]): Promise<void> {
    if (!this.isOnline) {
      await this.addToQueue('status_update', {
        action: 'bulk_mark_read',
        messageIds,
        timestamp: Date.now()
      }, 'low');
    } else {
      try {
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
        const authToken = localStorage.getItem('rayshine-auth-token') || '';

        await fetch(`${apiBaseUrl}/notifications/bulk-mark-read`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ messageIds })
        });
      } catch (error) {
        console.error('Failed to bulk mark as read:', error);
      }
    }
  }

  async bulkDeleteNotifications(messageIds: string[]): Promise<void> {
    if (!this.isOnline) {
      await this.addToQueue('status_update', {
        action: 'bulk_delete',
        messageIds,
        timestamp: Date.now()
      }, 'low');
    } else {
      try {
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
        const authToken = localStorage.getItem('rayshine-auth-token') || '';

        await fetch(`${apiBaseUrl}/notifications/bulk-delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ messageIds })
        });
      } catch (error) {
        console.error('Failed to bulk delete:', error);
      }
    }
  }

  // Status and Info
  getStatus(): MessageSyncStatus {
    return {
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      lastSyncAttempt: this.lastSyncAttempt,
      syncInProgress: this.syncInProgress,
      failedMessages: this.queue.filter(msg => msg.retryCount > 0).length
    };
  }

  getQueuedMessages(): QueuedMessage[] {
    return [...this.queue];
  }

  getFrequencySettings(): NotificationFrequencySettings {
    return { ...this.frequencySettings };
  }

  // Private Methods
  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online - syncing queue');
      this.isOnline = true;
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Gone offline - messages will be queued');
      this.isOnline = false;
    });
  }

  private startPeriodicSync(): void {
    // Try to sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.syncQueue();
      }
    }, 30000);

    // Cleanup expired messages every 5 minutes
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 300000);
  }

  private async cleanupExpiredMessages(): Promise<void> {
    const now = Date.now();
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(msg => {
      return !msg.expiresAt || msg.expiresAt > now;
    });

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      console.log(`🧹 Cleaned up ${initialLength - this.queue.length} expired messages`);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📂 Loaded ${this.queue.length} messages from storage`);
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  private loadFrequencySettings(): void {
    try {
      const stored = localStorage.getItem(this.FREQUENCY_STORAGE_KEY);
      if (stored) {
        this.frequencySettings = JSON.parse(stored);
      } else {
        this.frequencySettings = this.getDefaultFrequencySettings();
      }
    } catch (error) {
      console.error('Failed to load frequency settings:', error);
      this.frequencySettings = this.getDefaultFrequencySettings();
    }
  }

  private async saveFrequencySettings(): Promise<void> {
    try {
      localStorage.setItem(this.FREQUENCY_STORAGE_KEY, JSON.stringify(this.frequencySettings));
    } catch (error) {
      console.error('Failed to save frequency settings:', error);
    }
  }

  private getDefaultFrequencySettings(): NotificationFrequencySettings {
    return {
      enabled: true,
      maxNotificationsPerHour: 20,
      maxNotificationsPerDay: 100,
      batchSimilarNotifications: true,
      batchDelay: 5,
      throttleByPriority: {
        low: 15,    // 15 minutes
        medium: 5,  // 5 minutes
        high: 1,    // 1 minute
        urgent: 0   // No throttling
      }
    };
  }
}

// Export singleton instance
export const offlineMessageQueueService = new OfflineMessageQueueService();
export default offlineMessageQueueService;