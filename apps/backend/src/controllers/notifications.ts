import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

const contactEmail = process.env.CONTACT_EMAIL || 'admin@rayshine.com';

webpush.setVapidDetails(`mailto:${contactEmail}`, vapidKeys.publicKey, vapidKeys.privateKey);

// Subscribe to push notifications
export const subscribe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data'
      });
    }

    // Store subscription in database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving push subscription:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save subscription'
      });
    }

    res.json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });

  } catch (error) {
    console.error('Error in push subscribe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Unsubscribe from push notifications
export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing push subscription:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to remove subscription'
      });
    }

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });

  } catch (error) {
    console.error('Error in push unsubscribe:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Verify subscription
export const verifySubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { endpoint } = req.body;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error verifying subscription:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify subscription'
      });
    }

    res.json({
      success: true,
      isValid: !!data
    });

  } catch (error) {
    console.error('Error in verify subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Send test notification
export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { title, body, type = 'system_alert' } = req.body;

    // Get user's push subscription
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      return res.status(400).json({
        success: false,
        error: 'No push subscription found'
      });
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const payload = JSON.stringify({
      title: title || '🔔 Test Notification',
      body: body || 'This is a test notification from Rayshine!',
      type,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge.png',
      url: '/',
      timestamp: Date.now()
    });

    await webpush.sendNotification(pushSubscription, payload);

    res.json({
      success: true,
      message: 'Test notification sent successfully'
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
};

// Get notification preferences
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch preferences'
      });
    }

    // Return default preferences if none found
    const defaultPreferences = {
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

    res.json(preferences || defaultPreferences);

  } catch (error) {
    console.error('Error in getPreferences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Save notification preferences
export const savePreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const preferences = req.body;

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving preferences:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save preferences'
      });
    }

    res.json({
      success: true,
      message: 'Preferences saved successfully'
    });

  } catch (error) {
    console.error('Error in savePreferences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Send push notification to specific users
export const sendPushNotification = async (
  userIds: string[],
  notificationData: {
    title: string;
    body: string;
    type?: string;
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
) => {
  try {
    // Get push subscriptions for all users
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for users:', userIds);
      return { success: true, message: 'No active subscriptions' };
    }

    const payload = JSON.stringify(notificationData);
    const results = [];

    // Send notification to each subscription
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        results.push({ userId: subscription.user_id, success: true });

      } catch (pushError: any) {
        console.error(`Error sending push to user ${subscription.user_id}:`, pushError);
        
        // Remove invalid subscriptions
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', subscription.user_id);
          
          console.log(`Removed invalid subscription for user ${subscription.user_id}`);
        }

        results.push({ 
          userId: subscription.user_id, 
          success: false, 
          error: pushError.message 
        });
      }
    }

    return {
      success: true,
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };

  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    return { success: false, error: 'Internal server error' };
  }
};

// Broadcast notification to all users with specific role
export const broadcastNotification = async (req: Request, res: Response) => {
  try {
    const { role, ...notificationData } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role is required'
      });
    }

    // Get all users with the specified role who have push subscriptions
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', role);

    if (error) {
      console.error('Error fetching users by role:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        message: `No users found with role: ${role}`
      });
    }

    const userIds = users.map(user => user.id);
    const result = await sendPushNotification(userIds, notificationData);

    res.json(result);

  } catch (error) {
    console.error('Error in broadcastNotification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};