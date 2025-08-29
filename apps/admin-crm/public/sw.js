// Rayshine Admin CRM Service Worker
// Handles push notifications, background sync, and caching

const CACHE_NAME = 'rayshine-admin-v1';
const API_BASE_URL = self.location.origin + '/api';

// Notification categories with their configurations
const NOTIFICATION_CATEGORIES = {
  job_assignment: {
    icon: '/icons/job-alert.png',
    badge: '/icons/badge.png',
    sound: '/sounds/urgent.mp3',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: '👁️ View Details', icon: '/icons/view.png' },
      { action: 'accept', title: '✅ Accept Job', icon: '/icons/accept.png' },
      { action: 'decline', title: '❌ Decline', icon: '/icons/decline.png' }
    ],
    tag: 'job-assignment',
    renotify: true
  },
  booking_confirmed: {
    icon: '/icons/booking-success.png',
    badge: '/icons/badge.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: '👁️ View Booking', icon: '/icons/view.png' },
      { action: 'message', title: '💬 Message Customer', icon: '/icons/message.png' }
    ],
    tag: 'booking-update'
  },
  new_message: {
    icon: '/icons/message.png',
    badge: '/icons/badge.png',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'reply', title: '↩️ Reply', icon: '/icons/reply.png' },
      { action: 'view', title: '👁️ View Conversation', icon: '/icons/view.png' }
    ],
    tag: 'message'
  },
  system_alert: {
    icon: '/icons/alert.png',
    badge: '/icons/badge.png',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    actions: [
      { action: 'view', title: '👁️ View Details', icon: '/icons/view.png' },
      { action: 'dismiss', title: '✖️ Dismiss', icon: '/icons/dismiss.png' }
    ],
    tag: 'system-alert'
  },
  payment_update: {
    icon: '/icons/payment.png',
    badge: '/icons/badge.png',
    vibrate: [150, 75, 150],
    actions: [
      { action: 'view', title: '👁️ View Transaction', icon: '/icons/view.png' }
    ],
    tag: 'payment'
  },
  provider_status: {
    icon: '/icons/provider.png',
    badge: '/icons/badge.png',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'view', title: '👁️ View Provider', icon: '/icons/view.png' }
    ],
    tag: 'provider-status'
  }
};

// Badge counter
let badgeCount = 0;

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
        '/icons/badge.png',
        '/sounds/notification.mp3'
      ]).catch(err => {
        console.warn('Failed to cache some resources:', err);
      });
    })
  );
  
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Push event handler - receives push notifications
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received');
  
  if (!event.data) {
    console.warn('Push event has no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (e) {
    console.error('Error parsing push data:', e);
    notificationData = {
      title: 'New Notification',
      body: event.data.text() || 'You have a new notification',
      type: 'system_alert'
    };
  }

  event.waitUntil(
    showNotification(notificationData)
  );
});

// Show notification with appropriate configuration
async function showNotification(data) {
  const {
    title = 'Rayshine Admin',
    body = 'You have a new notification',
    type = 'system_alert',
    icon,
    badge,
    image,
    data: customData = {},
    url = '/',
    actions = [],
    tag,
    requireInteraction = false,
    silent = false,
    timestamp = Date.now(),
    ...otherOptions
  } = data;

  // Get category configuration
  const categoryConfig = NOTIFICATION_CATEGORIES[type] || NOTIFICATION_CATEGORIES.system_alert;
  
  // Merge configuration with custom data
  const notificationOptions = {
    body,
    icon: icon || categoryConfig.icon || '/icons/icon-192x192.png',
    badge: badge || categoryConfig.badge || '/icons/badge.png',
    image: image,
    data: {
      ...customData,
      url,
      type,
      timestamp,
      notificationId: `${type}-${Date.now()}`
    },
    tag: tag || categoryConfig.tag || type,
    requireInteraction: requireInteraction || categoryConfig.requireInteraction || false,
    silent: silent,
    vibrate: categoryConfig.vibrate || [200, 100, 200],
    actions: actions.length > 0 ? actions : (categoryConfig.actions || []),
    renotify: categoryConfig.renotify || false,
    ...otherOptions
  };

  // Update badge count
  badgeCount++;
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(badgeCount);
    } catch (error) {
      console.warn('Could not set app badge:', error);
    }
  }

  // Show the notification
  try {
    await self.registration.showNotification(title, notificationOptions);
    console.log(`🔔 Notification shown: ${title} (${type})`);
    
    // Track notification display
    await trackNotificationEvent('displayed', {
      type,
      title,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Decrease badge count
  badgeCount = Math.max(0, badgeCount - 1);
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(badgeCount > 0 ? badgeCount : null).catch(console.warn);
  }

  // Track notification interaction
  trackNotificationEvent('clicked', {
    type: data.type,
    action: action || 'default',
    timestamp: Date.now()
  });

  event.waitUntil(
    handleNotificationClick(action, data)
  );
});

// Handle different notification click actions
async function handleNotificationClick(action, data) {
  const { type, url = '/', notificationId, bookingId, threadId, assignmentId } = data;

  let targetUrl = url;

  // Handle different actions based on notification type and action
  switch (action) {
    case 'view':
      if (type === 'job_assignment' && assignmentId) {
        targetUrl = `/assignments/${assignmentId}`;
      } else if (type === 'new_message' && threadId) {
        targetUrl = `/messages?thread=${threadId}`;
      } else if (type === 'booking_confirmed' && bookingId) {
        targetUrl = `/bookings/${bookingId}`;
      }
      break;

    case 'accept':
      if (type === 'job_assignment' && assignmentId) {
        // Send accept response
        await sendJobResponse(assignmentId, 'accept');
        targetUrl = `/assignments/${assignmentId}`;
      }
      break;

    case 'decline':
      if (type === 'job_assignment' && assignmentId) {
        // Send decline response
        await sendJobResponse(assignmentId, 'decline');
        targetUrl = '/assignments';
      }
      break;

    case 'reply':
      if (type === 'new_message' && threadId) {
        targetUrl = `/messages?thread=${threadId}&action=reply`;
      }
      break;

    case 'message':
      if (bookingId) {
        targetUrl = `/bookings/${bookingId}/messages`;
      }
      break;

    case 'dismiss':
      // Just close, don't navigate
      return;

    default:
      // Default click action - navigate to the specified URL
      break;
  }

  // Focus or open the app window
  await focusOrOpenWindow(targetUrl);
}

// Send job assignment response
async function sendJobResponse(assignmentId, response) {
  try {
    const response_data = await fetch(`${API_BASE_URL}/job-assignments/${assignmentId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response,
        timestamp: new Date().toISOString()
      })
    });

    if (response_data.ok) {
      console.log(`✅ Job ${response} response sent for assignment ${assignmentId}`);
      
      // Show confirmation notification
      await showNotification({
        title: `Job ${response === 'accept' ? 'Accepted' : 'Declined'}`,
        body: `You have ${response === 'accept' ? 'accepted' : 'declined'} the job assignment.`,
        type: 'system_alert',
        tag: 'job-response-confirmation'
      });
    } else {
      throw new Error(`HTTP ${response_data.status}`);
    }
  } catch (error) {
    console.error(`Error sending job ${response} response:`, error);
    
    // Show error notification
    await showNotification({
      title: 'Response Failed',
      body: `Failed to ${response} the job. Please try again in the app.`,
      type: 'system_alert',
      requireInteraction: true
    });
  }
}

// Focus existing window or open new one
async function focusOrOpenWindow(url) {
  try {
    // Get all clients (open windows/tabs)
    const clients = await self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    });

    // Try to find an existing window to focus
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        // Focus the existing window and navigate
        if ('focus' in client) {
          await client.focus();
        }
        
        if ('navigate' in client) {
          return client.navigate(url);
        } else {
          return client.postMessage({
            type: 'navigate',
            url: url
          });
        }
      }
    }

    // No existing window found, open a new one
    return self.clients.openWindow(url);
    
  } catch (error) {
    console.error('Error focusing/opening window:', error);
    // Fallback: just open a new window
    return self.clients.openWindow(url || '/');
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-job-response') {
    event.waitUntil(syncPendingJobResponses());
  } else if (event.tag === 'background-message-send') {
    event.waitUntil(syncPendingMessages());
  }
});

// Sync pending job responses when back online
async function syncPendingJobResponses() {
  try {
    // Get pending responses from IndexedDB or localStorage
    const pendingResponses = await getPendingJobResponses();
    
    for (const response of pendingResponses) {
      try {
        await sendJobResponse(response.assignmentId, response.response);
        await removePendingJobResponse(response.id);
      } catch (error) {
        console.error('Failed to sync job response:', error);
      }
    }
  } catch (error) {
    console.error('Error syncing job responses:', error);
  }
}

// Sync pending messages when back online
async function syncPendingMessages() {
  try {
    // Implementation would sync any pending messages
    console.log('Syncing pending messages...');
  } catch (error) {
    console.error('Error syncing messages:', error);
  }
}

// Track notification events for analytics
async function trackNotificationEvent(eventType, eventData) {
  try {
    await fetch(`${API_BASE_URL}/analytics/notification-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: eventType,
        data: eventData,
        timestamp: Date.now(),
        user_agent: navigator.userAgent
      })
    });
  } catch (error) {
    console.warn('Failed to track notification event:', error);
  }
}

// IndexedDB helpers for offline storage
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rayshine-sw', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores
      if (!db.objectStoreNames.contains('pendingJobResponses')) {
        const store = db.createObjectStore('pendingJobResponses', { keyPath: 'id', autoIncrement: true });
        store.createIndex('assignmentId', 'assignmentId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('pendingMessages')) {
        const store = db.createObjectStore('pendingMessages', { keyPath: 'id', autoIncrement: true });
        store.createIndex('threadId', 'threadId', { unique: false });
      }
    };
  });
}

async function getPendingJobResponses() {
  const db = await openDB();
  const transaction = db.transaction(['pendingJobResponses'], 'readonly');
  const store = transaction.objectStore('pendingJobResponses');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removePendingJobResponse(id) {
  const db = await openDB();
  const transaction = db.transaction(['pendingJobResponses'], 'readwrite');
  const store = transaction.objectStore('pendingJobResponses');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Message event handler for communication with main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'navigate':
      // Handle navigation requests from the main app
      focusOrOpenWindow(data.url);
      break;
      
    case 'updateBadge':
      // Update badge count
      badgeCount = data.count || 0;
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(badgeCount > 0 ? badgeCount : null).catch(console.warn);
      }
      break;
      
    case 'showNotification':
      // Show custom notification from main app
      showNotification(data);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Network request interception for caching
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for static resources
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Fetch from network and cache
      return fetch(event.request).then((response) => {
        // Don't cache if not ok
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      // Return offline fallback if available
      if (event.request.destination === 'document') {
        return caches.match('/offline.html');
      }
    })
  );
});

console.log('🎉 Rayshine Service Worker loaded successfully');