// Push Notification Service for Rayshine Admin CRM
// Handles notification permissions, subscriptions, and Service Worker integration

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  type?: 'job_assignment' | 'booking_confirmed' | 'new_message' | 'system_alert' | 'payment_update' | 'provider_status';
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    job_assignment: boolean;
    booking_updates: boolean;
    messages: boolean;
    system_alerts: boolean;
    payment_updates: boolean;
    provider_status: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  sound: boolean;
  vibration: boolean;
}

class PushNotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';
  private apiBaseUrl: string = process.env.REACT_APP_API_BASE_URL || '/api';
  private subscription: PushSubscription | null = null;
  private preferences: NotificationPreferences | null = null;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Check if Service Workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers are not supported');
        return false;
      }

      // Check if Push Messaging is supported
      if (!('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return false;
      }

      // Register Service Worker
      await this.registerServiceWorker();
      
      // Load user preferences
      await this.loadNotificationPreferences();
      
      // Check existing subscription
      await this.checkExistingSubscription();
      
      console.log('✅ Push Notification Service initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Push Notification Service:', error);
      return false;
    }
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('📋 Service Worker registered:', this.serviceWorkerRegistration.scope);

      // Listen for Service Worker updates
      this.serviceWorkerRegistration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker update found');
        const newWorker = this.serviceWorkerRegistration!.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 New Service Worker available');
              this.showUpdateNotification();
            }
          });
        }
      });

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

    } catch (error) {
      console.error('Failed to register Service Worker:', error);
      throw error;
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'notification-clicked':
        this.handleNotificationClick(data);
        break;
      case 'background-sync-complete':
        console.log('Background sync completed:', data);
        break;
      default:
        console.log('Unknown Service Worker message:', type, data);
    }
  }

  private handleNotificationClick(data: any) {
    console.log('🖱️ Notification clicked in main thread:', data);
    
    // Emit custom event for the app to handle
    window.dispatchEvent(new CustomEvent('notification-clicked', {
      detail: data
    }));
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    console.log(`🔔 Notification permission: ${permission}`);
    
    // Update preferences based on permission
    if (this.preferences) {
      this.preferences.enabled = permission === 'granted';
      await this.saveNotificationPreferences(this.preferences);
    }

    return permission;
  }

  async subscribe(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service Worker not registered');
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      // Subscribe to push notifications
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('📱 Push subscription created:', subscription.endpoint);

      // Send subscription to server
      const success = await this.sendSubscriptionToServer(subscription);
      
      if (success) {
        this.subscription = subscription;
        localStorage.setItem('rayshine-push-subscribed', 'true');
      }

      return success;

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.subscription) {
        await this.checkExistingSubscription();
      }

      if (this.subscription) {
        await this.subscription.unsubscribe();
        console.log('📱 Unsubscribed from push notifications');
      }

      // Remove subscription from server
      await this.removeSubscriptionFromServer();
      
      this.subscription = null;
      localStorage.removeItem('rayshine-push-subscribed');
      
      return true;

    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  private async checkExistingSubscription(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      this.subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('📱 Existing subscription found');
        
        // Verify subscription is still valid with server
        const isValid = await this.verifySubscriptionWithServer(this.subscription);
        if (!isValid) {
          console.log('⚠️ Subscription invalid, resubscribing...');
          await this.unsubscribe();
          await this.subscribe();
        }
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
    try {
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth'))
        }
      };

      const response = await fetch(`${this.apiBaseUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        console.log('✅ Subscription sent to server');
        return true;
      } else {
        const error = await response.json();
        console.error('Failed to send subscription to server:', error);
        return false;
      }

    } catch (error) {
      console.error('Error sending subscription to server:', error);
      return false;
    }
  }

  private async removeSubscriptionFromServer(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        console.log('✅ Subscription removed from server');
        return true;
      } else {
        console.error('Failed to remove subscription from server');
        return false;
      }

    } catch (error) {
      console.error('Error removing subscription from server:', error);
      return false;
    }
  }

  private async verifySubscriptionWithServer(subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications/verify-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      return response.ok;

    } catch (error) {
      console.error('Error verifying subscription:', error);
      return false;
    }
  }

  async sendTestNotification(options: PushNotificationOptions): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(options)
      });

      if (response.ok) {
        console.log('✅ Test notification sent');
        return true;
      } else {
        console.error('Failed to send test notification');
        return false;
      }

    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  async loadNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        this.preferences = await response.json();
      } else {
        // Use default preferences if server request fails
        this.preferences = this.getDefaultPreferences();
      }

    } catch (error) {
      console.error('Error loading notification preferences:', error);
      this.preferences = this.getDefaultPreferences();
    }

    return this.preferences!;
  }

  async saveNotificationPreferences(preferences: NotificationPreferences): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        this.preferences = preferences;
        
        // Store locally as backup
        localStorage.setItem('rayshine-notification-preferences', JSON.stringify(preferences));
        
        console.log('✅ Notification preferences saved');
        return true;
      } else {
        console.error('Failed to save notification preferences');
        return false;
      }

    } catch (error) {
      console.error('Error saving notification preferences:', error);
      return false;
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
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
  }

  // Utility methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private getAuthToken(): string {
    // Get auth token from localStorage or wherever it's stored
    return localStorage.getItem('rayshine-auth-token') || '';
  }

  private showUpdateNotification() {
    // Show a notification about Service Worker update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Updated', {
        body: 'The app has been updated. Refresh to get the latest version.',
        icon: '/icons/icon-192x192.png',
        tag: 'app-update',
        requireInteraction: true,
        actions: [
          { action: 'refresh', title: 'Refresh Now' },
          { action: 'dismiss', title: 'Later' }
        ]
      });
    }
  }

  // Public getters
  get isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  get isSubscribed(): boolean {
    return !!this.subscription && localStorage.getItem('rayshine-push-subscribed') === 'true';
  }

  get hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  get currentPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  // Badge management
  async updateBadgeCount(count: number): Promise<void> {
    try {
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(count > 0 ? count : null);
      }
      
      // Also update through Service Worker for consistency
      if (this.serviceWorkerRegistration) {
        this.serviceWorkerRegistration.active?.postMessage({
          type: 'updateBadge',
          data: { count }
        });
      }
    } catch (error) {
      console.warn('Could not update badge:', error);
    }
  }

  async clearBadge(): Promise<void> {
    await this.updateBadgeCount(0);
  }

  // Manual notification display
  async showLocalNotification(options: PushNotificationOptions): Promise<void> {
    if (!this.hasPermission) {
      console.warn('No notification permission');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/badge.png',
        image: options.image,
        data: options.data,
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        vibrate: options.vibrate || [200, 100, 200],
        timestamp: options.timestamp || Date.now()
      });

      // Handle click events
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        if (options.url) {
          window.location.href = options.url;
        }
      };

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

    } catch (error) {
      console.error('Failed to show local notification:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;