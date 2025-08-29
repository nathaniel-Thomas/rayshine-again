import offlineMessageQueue, { QueuedMessage, QueuedChatMessage } from './offlineMessageQueue';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingMessages: number;
  syncInProgress: boolean;
  lastSyncError: string | null;
}

export interface MessageSyncData {
  messages: any[];
  notifications: any[];
  lastSyncTimestamp: number;
  serverTimestamp: number;
}

export interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  clientVersion: any;
  serverVersion: any;
  resolvedVersion?: any;
}

class MessageSyncService {
  private readonly SYNC_ENDPOINT = '/api/messages/sync';
  private readonly NOTIFICATION_SYNC_ENDPOINT = '/api/notifications/sync';
  private readonly LAST_SYNC_KEY = 'rayshine-last-sync';
  private readonly SYNC_BATCH_SIZE = 50;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_SYNC_RETRIES = 3;

  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingMessages: 0,
    syncInProgress: false,
    lastSyncError: null
  };

  private syncTimer: NodeJS.Timeout | null = null;
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private conflictHandlers: Set<(conflict: ConflictResolution) => Promise<any>> = new Set();

  constructor() {
    this.initializeSync();
  }

  private async initializeSync(): Promise<void> {
    // Load last sync timestamp
    const lastSyncStr = localStorage.getItem(this.LAST_SYNC_KEY);
    if (lastSyncStr) {
      this.syncStatus.lastSync = new Date(parseInt(lastSyncStr));
    }

    // Set up online/offline listeners
    this.setupConnectionListeners();
    
    // Set up queue sync callback
    this.setupQueueSyncCallback();
    
    // Start periodic sync if online
    if (navigator.onLine) {
      this.startPeriodicSync();
    }

    console.log('📱 Message Sync Service initialized');
  }

  private setupConnectionListeners(): void {
    window.addEventListener('online', async () => {
      console.log('🌐 Connection restored, starting full sync...');
      this.syncStatus.isOnline = true;
      this.syncStatus.lastSyncError = null;
      
      await this.performFullSync();
      this.startPeriodicSync();
      this.notifyStatusListeners();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost, stopping sync');
      this.syncStatus.isOnline = false;
      this.stopPeriodicSync();
      this.notifyStatusListeners();
    });
  }

  private setupQueueSyncCallback(): void {
    offlineMessageQueue.onSync(async () => {
      if (navigator.onLine) {
        await this.syncPendingMessages();
      }
    });
  }

  private startPeriodicSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      if (navigator.onLine && !this.syncStatus.syncInProgress) {
        await this.performIncrementalSync();
      }
    }, this.SYNC_INTERVAL);
  }

  private stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Main sync operations
  public async performFullSync(): Promise<boolean> {
    if (this.syncStatus.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...');
      return false;
    }

    try {
      this.setSyncInProgress(true);
      console.log('🔄 Starting full sync...');

      // Sync in order: pending messages, then incoming messages, then notifications
      await this.syncPendingMessages();
      await this.syncIncomingMessages();
      await this.syncNotifications();
      
      this.updateLastSync();
      this.syncStatus.lastSyncError = null;
      
      console.log('✅ Full sync completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Full sync failed:', error);
      this.syncStatus.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
      return false;
    } finally {
      this.setSyncInProgress(false);
    }
  }

  public async performIncrementalSync(): Promise<boolean> {
    if (this.syncStatus.syncInProgress) {
      return false;
    }

    try {
      this.setSyncInProgress(true);

      // Only sync new messages since last sync
      const lastSyncTimestamp = this.syncStatus.lastSync?.getTime() || 0;
      
      await this.syncIncomingMessages(lastSyncTimestamp);
      await this.syncNotifications(lastSyncTimestamp);
      
      this.updateLastSync();
      return true;

    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      this.syncStatus.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
      return false;
    } finally {
      this.setSyncInProgress(false);
    }
  }

  private async syncPendingMessages(): Promise<void> {
    const pendingMessages = offlineMessageQueue.getQueuedMessages({ type: 'message' }) as QueuedChatMessage[];
    
    if (pendingMessages.length === 0) {
      return;
    }

    console.log(`📤 Syncing ${pendingMessages.length} pending messages...`);

    // Process in batches
    for (let i = 0; i < pendingMessages.length; i += this.SYNC_BATCH_SIZE) {
      const batch = pendingMessages.slice(i, i + this.SYNC_BATCH_SIZE);
      await this.syncMessageBatch(batch);
    }
  }

  private async syncMessageBatch(messages: QueuedChatMessage[]): Promise<void> {
    try {
      const messageData = messages.map(msg => ({
        tempId: msg.id,
        threadId: msg.data.threadId,
        senderId: msg.data.senderId,
        content: msg.data.content,
        timestamp: msg.data.timestamp,
        attachments: msg.data.attachments,
        metadata: {
          queuedAt: msg.createdAt,
          retryCount: msg.retryCount
        }
      }));

      const response = await fetch(`${this.SYNC_ENDPOINT}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ messages: messageData })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Remove successfully synced messages from queue
        result.synced?.forEach((syncedMessage: any) => {
          offlineMessageQueue.getQueuedMessages().forEach(queuedMsg => {
            if (queuedMsg.id === syncedMessage.tempId) {
              offlineMessageQueue.clearQueue({ 
                type: 'message',
                category: 'chat'
              });
            }
          });
        });

        // Handle conflicts
        if (result.conflicts?.length > 0) {
          await this.handleSyncConflicts(result.conflicts);
        }

      } else {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      console.error('Failed to sync message batch:', error);
      throw error;
    }
  }

  private async syncIncomingMessages(since?: number): Promise<void> {
    try {
      const url = new URL(this.SYNC_ENDPOINT, window.location.origin);
      if (since) {
        url.searchParams.set('since', since.toString());
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        const data: MessageSyncData = await response.json();
        
        console.log(`📥 Received ${data.messages.length} new messages`);
        
        // Process new messages
        await this.processIncomingMessages(data.messages);
        
        // Update server timestamp
        if (data.serverTimestamp) {
          localStorage.setItem(`${this.LAST_SYNC_KEY}-server`, data.serverTimestamp.toString());
        }

      } else {
        throw new Error(`Failed to sync incoming messages: ${response.status}`);
      }

    } catch (error) {
      console.error('Failed to sync incoming messages:', error);
      throw error;
    }
  }

  private async syncNotifications(since?: number): Promise<void> {
    try {
      const url = new URL(this.NOTIFICATION_SYNC_ENDPOINT, window.location.origin);
      if (since) {
        url.searchParams.set('since', since.toString());
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        console.log(`🔔 Received ${data.notifications.length} new notifications`);
        
        // Process notifications
        await this.processIncomingNotifications(data.notifications);

      } else {
        throw new Error(`Failed to sync notifications: ${response.status}`);
      }

    } catch (error) {
      console.error('Failed to sync notifications:', error);
      throw error;
    }
  }

  // Message processing
  private async processIncomingMessages(messages: any[]): Promise<void> {
    for (const message of messages) {
      try {
        // Check for duplicates
        if (this.isMessageDuplicate(message)) {
          continue;
        }

        // Store message locally
        await this.storeMessageLocally(message);
        
        // Emit event for UI updates
        this.emitMessageReceived(message);

      } catch (error) {
        console.error('Error processing incoming message:', error);
      }
    }
  }

  private async processIncomingNotifications(notifications: any[]): Promise<void> {
    for (const notification of notifications) {
      try {
        // Check if notification should be displayed based on preferences
        if (await this.shouldDisplayNotification(notification)) {
          // Display notification
          this.displayNotification(notification);
        }

        // Store notification history
        await this.storeNotificationLocally(notification);

      } catch (error) {
        console.error('Error processing incoming notification:', error);
      }
    }
  }

  // Conflict resolution
  private async handleSyncConflicts(conflicts: any[]): Promise<void> {
    for (const conflict of conflicts) {
      try {
        const resolution: ConflictResolution = {
          strategy: 'server-wins', // Default strategy
          clientVersion: conflict.clientVersion,
          serverVersion: conflict.serverVersion
        };

        // Check if we have custom conflict handlers
        if (this.conflictHandlers.size > 0) {
          for (const handler of this.conflictHandlers) {
            try {
              const resolved = await handler(resolution);
              if (resolved) {
                resolution.resolvedVersion = resolved;
                resolution.strategy = 'manual';
                break;
              }
            } catch (handlerError) {
              console.error('Conflict handler error:', handlerError);
            }
          }
        }

        // Apply resolution
        await this.applyConflictResolution(conflict, resolution);

      } catch (error) {
        console.error('Error handling sync conflict:', error);
      }
    }
  }

  private async applyConflictResolution(conflict: any, resolution: ConflictResolution): Promise<void> {
    switch (resolution.strategy) {
      case 'server-wins':
        await this.storeMessageLocally(resolution.serverVersion);
        break;
      case 'client-wins':
        // Re-queue the client version for sync
        offlineMessageQueue.enqueueChatMessage(resolution.clientVersion, 'high');
        break;
      case 'merge':
        const merged = this.mergeMessages(resolution.clientVersion, resolution.serverVersion);
        await this.storeMessageLocally(merged);
        break;
      case 'manual':
        if (resolution.resolvedVersion) {
          await this.storeMessageLocally(resolution.resolvedVersion);
        }
        break;
    }
  }

  private mergeMessages(clientMsg: any, serverMsg: any): any {
    // Simple merge strategy - prefer server for metadata, client for content
    return {
      ...serverMsg,
      content: clientMsg.content,
      attachments: [...(clientMsg.attachments || []), ...(serverMsg.attachments || [])],
      metadata: {
        ...serverMsg.metadata,
        mergedFrom: 'conflict-resolution',
        clientVersion: clientMsg.timestamp,
        serverVersion: serverMsg.timestamp
      }
    };
  }

  // Utility methods
  private isMessageDuplicate(message: any): boolean {
    // Check localStorage or memory cache for duplicates
    const stored = localStorage.getItem(`msg-${message.id}`);
    return !!stored;
  }

  private async storeMessageLocally(message: any): Promise<void> {
    try {
      // Store in localStorage for persistence
      localStorage.setItem(`msg-${message.id}`, JSON.stringify(message));
      
      // Also store in IndexedDB for better performance if available
      if ('indexedDB' in window) {
        await this.storeInIndexedDB('messages', message);
      }

    } catch (error) {
      console.error('Failed to store message locally:', error);
    }
  }

  private async storeNotificationLocally(notification: any): Promise<void> {
    try {
      localStorage.setItem(`notif-${notification.id}`, JSON.stringify(notification));
      
      if ('indexedDB' in window) {
        await this.storeInIndexedDB('notifications', notification);
      }

    } catch (error) {
      console.error('Failed to store notification locally:', error);
    }
  }

  private async storeInIndexedDB(store: string, data: any): Promise<void> {
    // Simple IndexedDB wrapper - would normally use a more robust solution
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RayshineCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        
        const addRequest = objectStore.put(data);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };
    });
  }

  private async shouldDisplayNotification(notification: any): Promise<boolean> {
    // Check user preferences, quiet hours, etc.
    // This would integrate with the notification preferences service
    return true; // Simplified for now
  }

  private displayNotification(notification: any): void {
    // Display notification via the push notification service
    this.emitNotificationReceived(notification);
  }

  private emitMessageReceived(message: any): void {
    window.dispatchEvent(new CustomEvent('message-received', {
      detail: message
    }));
  }

  private emitNotificationReceived(notification: any): void {
    window.dispatchEvent(new CustomEvent('notification-received', {
      detail: notification
    }));
  }

  // Status management
  private setSyncInProgress(inProgress: boolean): void {
    this.syncStatus.syncInProgress = inProgress;
    this.syncStatus.pendingMessages = offlineMessageQueue.getQueuedMessages({ type: 'message' }).length;
    this.notifyStatusListeners();
  }

  private updateLastSync(): void {
    const now = new Date();
    this.syncStatus.lastSync = now;
    localStorage.setItem(this.LAST_SYNC_KEY, now.getTime().toString());
    this.notifyStatusListeners();
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => {
      try {
        listener({ ...this.syncStatus });
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  // Public API
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  public async forceSyncNow(): Promise<boolean> {
    console.log('🔄 Forcing immediate sync...');
    return await this.performFullSync();
  }

  public onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(callback);
    
    // Send current status immediately
    callback({ ...this.syncStatus });
    
    return () => this.statusListeners.delete(callback);
  }

  public onConflict(handler: (conflict: ConflictResolution) => Promise<any>): () => void {
    this.conflictHandlers.add(handler);
    return () => this.conflictHandlers.delete(handler);
  }

  public async clearLocalData(): Promise<void> {
    // Clear localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('msg-') || key.startsWith('notif-')) {
        localStorage.removeItem(key);
      }
    });

    // Clear IndexedDB
    if ('indexedDB' in window) {
      await this.clearIndexedDB();
    }

    console.log('🗑️ Cleared all local sync data');
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      const deleteReq = indexedDB.deleteDatabase('RayshineCache');
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => resolve(); // Don't fail if can't clear
    });
  }

  private getAuthToken(): string {
    return localStorage.getItem('rayshine-auth-token') || '';
  }

  // Cleanup
  public destroy(): void {
    this.stopPeriodicSync();
    this.statusListeners.clear();
    this.conflictHandlers.clear();
  }
}

// Export singleton instance
export const messageSyncService = new MessageSyncService();
export default messageSyncService;