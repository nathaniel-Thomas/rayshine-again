import { PushNotificationOptions } from './pushNotificationService';

export interface QueuedMessage {
  id: string;
  type: 'notification' | 'message' | 'action';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: any;
  createdAt: number;
  expiresAt?: number;
  retryCount: number;
  maxRetries: number;
  category?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface QueuedNotification extends QueuedMessage {
  type: 'notification';
  data: PushNotificationOptions & {
    deliveryAttempts?: number;
    lastDeliveryAttempt?: number;
  };
}

export interface QueuedChatMessage extends QueuedMessage {
  type: 'message';
  data: {
    threadId: string;
    senderId: string;
    content: string;
    messageId: string;
    timestamp: number;
    attachments?: any[];
  };
}

export interface QueuedAction extends QueuedMessage {
  type: 'action';
  data: {
    action: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    payload?: any;
    headers?: Record<string, string>;
  };
}

export interface QueueStats {
  total: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  pending: number;
  failed: number;
  expired: number;
}

class OfflineMessageQueue {
  private readonly STORAGE_KEY = 'rayshine-offline-message-queue';
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly BATCH_SIZE = 10;

  private queue: QueuedMessage[] = [];
  private processing = false;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private syncCallbacks: Set<() => Promise<void>> = new Set();
  private listeners: Set<(stats: QueueStats) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.startCleanupTimer();
    this.setupVisibilityChangeListener();
    this.setupOnlineStatusListener();
  }

  // Queue management
  public enqueue(message: Omit<QueuedMessage, 'id' | 'createdAt' | 'retryCount'>): string {
    const id = this.generateId();
    const queuedMessage: QueuedMessage = {
      ...message,
      id,
      createdAt: Date.now(),
      retryCount: 0,
      expiresAt: message.expiresAt || (Date.now() + this.DEFAULT_TTL)
    };

    // Check queue size and remove oldest low-priority items if needed
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.makeRoom();
    }

    // Insert based on priority
    const insertIndex = this.findInsertIndex(queuedMessage);
    this.queue.splice(insertIndex, 0, queuedMessage);

    this.persistQueue();
    this.notifyListeners();

    console.log(`📥 Message queued (ID: ${id}, Priority: ${message.priority})`);

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  public enqueueNotification(
    notification: PushNotificationOptions,
    priority: QueuedMessage['priority'] = 'medium',
    options?: {
      category?: string;
      userId?: string;
      maxRetries?: number;
      expiresIn?: number;
    }
  ): string {
    return this.enqueue({
      type: 'notification',
      priority,
      data: notification,
      maxRetries: options?.maxRetries || 3,
      category: options?.category || notification.type || 'general',
      userId: options?.userId,
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
      metadata: {
        source: 'offline-queue',
        queuedAt: new Date().toISOString()
      }
    });
  }

  public enqueueChatMessage(
    message: QueuedChatMessage['data'],
    priority: QueuedMessage['priority'] = 'high',
    options?: {
      maxRetries?: number;
      expiresIn?: number;
    }
  ): string {
    return this.enqueue({
      type: 'message',
      priority,
      data: message,
      maxRetries: options?.maxRetries || 5,
      category: 'chat',
      userId: message.senderId,
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
      metadata: {
        threadId: message.threadId,
        messageType: 'chat'
      }
    });
  }

  public enqueueAction(
    action: QueuedAction['data'],
    priority: QueuedMessage['priority'] = 'medium',
    options?: {
      category?: string;
      userId?: string;
      maxRetries?: number;
      expiresIn?: number;
    }
  ): string {
    return this.enqueue({
      type: 'action',
      priority,
      data: action,
      maxRetries: options?.maxRetries || 3,
      category: options?.category || 'api-action',
      userId: options?.userId,
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
      metadata: {
        endpoint: action.endpoint,
        method: action.method
      }
    });
  }

  // Queue processing
  public async processQueue(): Promise<void> {
    if (this.processing || !navigator.onLine) {
      return;
    }

    this.processing = true;

    try {
      console.log(`🔄 Processing queue (${this.queue.length} items)`);

      // Process in batches by priority
      const batch = this.getNextBatch();
      const processPromises = batch.map(message => this.processMessage(message));
      
      await Promise.allSettled(processPromises);

      // Continue processing if there are more items
      if (this.queue.length > 0 && navigator.onLine) {
        setTimeout(() => this.processQueue(), 1000);
      }

    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.processing = false;
    }
  }

  private async processMessage(message: QueuedMessage): Promise<void> {
    try {
      console.log(`⚡ Processing message ${message.id} (${message.type}, priority: ${message.priority})`);

      let success = false;

      switch (message.type) {
        case 'notification':
          success = await this.processNotification(message as QueuedNotification);
          break;
        case 'message':
          success = await this.processChatMessage(message as QueuedChatMessage);
          break;
        case 'action':
          success = await this.processAction(message as QueuedAction);
          break;
      }

      if (success) {
        this.removeFromQueue(message.id);
        console.log(`✅ Message ${message.id} processed successfully`);
      } else {
        await this.handleProcessingFailure(message);
      }

    } catch (error) {
      console.error(`❌ Error processing message ${message.id}:`, error);
      await this.handleProcessingFailure(message);
    }
  }

  private async processNotification(message: QueuedNotification): Promise<boolean> {
    try {
      // Send notification via API or display locally
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          ...message.data,
          queueId: message.id,
          priority: message.priority
        })
      });

      if (response.ok) {
        // Update delivery attempts
        message.data.deliveryAttempts = (message.data.deliveryAttempts || 0) + 1;
        message.data.lastDeliveryAttempt = Date.now();
        
        return true;
      }

      return false;

    } catch (error) {
      console.error('Failed to process notification:', error);
      return false;
    }
  }

  private async processChatMessage(message: QueuedChatMessage): Promise<boolean> {
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          ...message.data,
          queueId: message.id,
          offlineMessage: true
        })
      });

      return response.ok;

    } catch (error) {
      console.error('Failed to process chat message:', error);
      return false;
    }
  }

  private async processAction(message: QueuedAction): Promise<boolean> {
    try {
      const { endpoint, method, payload, headers = {} } = message.data;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          ...headers
        },
        body: payload ? JSON.stringify(payload) : undefined
      });

      return response.ok;

    } catch (error) {
      console.error('Failed to process action:', error);
      return false;
    }
  }

  private async handleProcessingFailure(message: QueuedMessage): Promise<void> {
    message.retryCount++;

    if (message.retryCount >= message.maxRetries) {
      console.warn(`📉 Message ${message.id} exceeded max retries, removing from queue`);
      this.removeFromQueue(message.id);
    } else {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, message.retryCount), 30000);
      console.log(`🔄 Message ${message.id} will retry in ${delay}ms (attempt ${message.retryCount}/${message.maxRetries})`);
      
      setTimeout(() => {
        if (navigator.onLine) {
          this.processMessage(message);
        }
      }, delay);
    }

    this.persistQueue();
    this.notifyListeners();
  }

  // Queue utilities
  private findInsertIndex(message: QueuedMessage): number {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const messagePriority = priorityOrder[message.priority];

    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].priority];
      if (messagePriority < queuePriority) {
        return i;
      }
    }

    return this.queue.length;
  }

  private getNextBatch(): QueuedMessage[] {
    return this.queue
      .filter(message => !this.isExpired(message))
      .slice(0, this.BATCH_SIZE);
  }

  private makeRoom(): void {
    // Remove expired messages first
    this.removeExpired();

    // If still over limit, remove oldest low-priority messages
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      const lowPriorityMessages = this.queue
        .filter(m => m.priority === 'low')
        .sort((a, b) => a.createdAt - b.createdAt);

      const toRemove = Math.min(lowPriorityMessages.length, 10);
      for (let i = 0; i < toRemove; i++) {
        this.removeFromQueue(lowPriorityMessages[i].id);
      }

      console.log(`🗑️ Removed ${toRemove} old low-priority messages to make room`);
    }
  }

  private removeFromQueue(id: string): void {
    const index = this.queue.findIndex(m => m.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.persistQueue();
      this.notifyListeners();
    }
  }

  private isExpired(message: QueuedMessage): boolean {
    return message.expiresAt ? Date.now() > message.expiresAt : false;
  }

  private removeExpired(): void {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(message => !this.isExpired(message));
    
    const removed = initialLength - this.queue.length;
    if (removed > 0) {
      console.log(`🗑️ Removed ${removed} expired messages`);
      this.persistQueue();
      this.notifyListeners();
    }
  }

  // Persistence
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📂 Loaded ${this.queue.length} messages from storage`);
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
      this.queue = [];
    }
  }

  private persistQueue(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist queue to storage:', error);
    }
  }

  // Event listeners
  private setupVisibilityChangeListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.processQueue();
      }
    });
  }

  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online, processing queue...');
      this.processQueue();
      this.syncCallbacks.forEach(callback => callback().catch(console.error));
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline, queuing will continue...');
    });
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.removeExpired();
    }, this.CLEANUP_INTERVAL);
  }

  // Public API
  public getStats(): QueueStats {
    const stats: QueueStats = {
      total: this.queue.length,
      byType: {},
      byPriority: {},
      byCategory: {},
      pending: 0,
      failed: 0,
      expired: 0
    };

    this.queue.forEach(message => {
      // By type
      stats.byType[message.type] = (stats.byType[message.type] || 0) + 1;
      
      // By priority
      stats.byPriority[message.priority] = (stats.byPriority[message.priority] || 0) + 1;
      
      // By category
      if (message.category) {
        stats.byCategory[message.category] = (stats.byCategory[message.category] || 0) + 1;
      }

      // Status counts
      if (this.isExpired(message)) {
        stats.expired++;
      } else if (message.retryCount >= message.maxRetries) {
        stats.failed++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  }

  public getQueuedMessages(filter?: {
    type?: string;
    priority?: string;
    category?: string;
    userId?: string;
  }): QueuedMessage[] {
    let filtered = [...this.queue];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(m => m.type === filter.type);
      }
      if (filter.priority) {
        filtered = filtered.filter(m => m.priority === filter.priority);
      }
      if (filter.category) {
        filtered = filtered.filter(m => m.category === filter.category);
      }
      if (filter.userId) {
        filtered = filtered.filter(m => m.userId === filter.userId);
      }
    }

    return filtered;
  }

  public clearQueue(filter?: Parameters<typeof this.getQueuedMessages>[0]): number {
    const before = this.queue.length;
    
    if (filter) {
      const toRemove = this.getQueuedMessages(filter);
      toRemove.forEach(message => this.removeFromQueue(message.id));
    } else {
      this.queue = [];
      this.persistQueue();
      this.notifyListeners();
    }

    const removed = before - this.queue.length;
    console.log(`🗑️ Cleared ${removed} messages from queue`);
    
    return removed;
  }

  public retryFailedMessages(): Promise<void> {
    const failedMessages = this.queue.filter(m => m.retryCount >= m.maxRetries);
    
    failedMessages.forEach(message => {
      message.retryCount = 0;
    });

    if (failedMessages.length > 0) {
      console.log(`🔄 Retrying ${failedMessages.length} failed messages`);
      this.persistQueue();
      this.notifyListeners();
      return this.processQueue();
    }

    return Promise.resolve();
  }

  // Sync callbacks
  public onSync(callback: () => Promise<void>): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  public onStatsChange(callback: (stats: QueueStats) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in stats listener:', error);
      }
    });
  }

  // Utilities
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private getAuthToken(): string {
    return localStorage.getItem('rayshine-auth-token') || '';
  }

  // Cleanup
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.syncCallbacks.clear();
    this.listeners.clear();
  }

  // Status getters
  get isOnline(): boolean {
    return navigator.onLine;
  }

  get isProcessing(): boolean {
    return this.processing;
  }

  get queueLength(): number {
    return this.queue.length;
  }
}

// Export singleton instance
export const offlineMessageQueue = new OfflineMessageQueue();
export default offlineMessageQueue;