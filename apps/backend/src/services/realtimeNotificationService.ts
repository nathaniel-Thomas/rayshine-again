import { supabase } from '../config/supabase';
import { WebSocketService } from './websocket';
import { JobAssignmentService } from './jobAssignment';

interface PendingAssignment {
  assignmentId: number;
  bookingId: number;
  providerId: string;
  expiresAt: Date;
  timeout?: NodeJS.Timeout;
}

interface NotificationQueue {
  providerId: string;
  notifications: QueuedNotification[];
  isOnline: boolean;
  lastSeen?: Date;
}

interface QueuedNotification {
  id: string;
  type: 'job_assignment' | 'booking_update' | 'chat_message' | 'system_alert';
  title: string;
  message: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

export class RealTimeNotificationService {
  private websocketService: WebSocketService;
  private jobAssignmentService: JobAssignmentService;
  private pendingAssignments: Map<number, PendingAssignment> = new Map();
  private offlineNotificationQueues: Map<string, NotificationQueue> = new Map();
  private readonly RESPONSE_TIMEOUT = 7 * 60 * 1000; // 7 minutes in milliseconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly NOTIFICATION_RETRY_DELAY = 60000; // 1 minute

  constructor(websocketService: WebSocketService) {
    this.websocketService = websocketService;
    this.jobAssignmentService = new JobAssignmentService(websocketService);
    this.initializeNotificationQueues();
    this.startNotificationProcessing();
  }

  private async initializeNotificationQueues() {
    // Initialize offline notification queues for all providers
    const { data: providers } = await supabase
      .from('providers')
      .select('id')
      .eq('is_verified', true)
      .eq('onboarding_status', 'active');

    if (providers) {
      providers.forEach(provider => {
        this.offlineNotificationQueues.set(provider.id, {
          providerId: provider.id,
          notifications: [],
          isOnline: false
        });
      });
    }
  }

  private startNotificationProcessing() {
    // Process offline notification queues every 30 seconds
    setInterval(() => {
      this.processOfflineNotificationQueues();
    }, 30000);

    // Clean up expired assignments every minute
    setInterval(() => {
      this.cleanupExpiredAssignments();
    }, 60000);
  }

  async sendJobAssignmentNotification(
    providerId: string,
    assignmentData: {
      assignmentId: number;
      bookingId: number;
      bookingDetails: any;
      ppsScore: number;
      assignmentOrder: number;
    }
  ): Promise<boolean> {
    const expiresAt = new Date(Date.now() + this.RESPONSE_TIMEOUT);
    const notification = this.createJobAssignmentNotification(assignmentData, expiresAt);

    // Store pending assignment for timeout tracking
    this.pendingAssignments.set(assignmentData.assignmentId, {
      assignmentId: assignmentData.assignmentId,
      bookingId: assignmentData.bookingId,
      providerId,
      expiresAt,
      timeout: setTimeout(() => {
        this.handleAssignmentTimeout(assignmentData.assignmentId);
      }, this.RESPONSE_TIMEOUT)
    });

    // Try to send via WebSocket first
    const isOnline = this.isProviderOnline(providerId);
    
    if (isOnline) {
      try {
        await this.websocketService.notifyProviderJobAssignment(providerId, {
          ...assignmentData,
          expires_at: expiresAt.toISOString(),
          response_deadline: expiresAt.toISOString(),
          notification
        });

        // Mark provider as online and clear any queued notifications
        this.markProviderOnline(providerId);
        
        console.log(`🎯 Job assignment sent to online provider ${providerId} - Assignment ID: ${assignmentData.assignmentId}`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to send WebSocket notification to provider ${providerId}:`, error);
      }
    }

    // Provider is offline or WebSocket failed - queue the notification
    await this.queueNotificationForOfflineProvider(providerId, notification);
    
    // Also send push notification if available
    await this.sendPushNotification(providerId, notification);
    
    console.log(`📱 Job assignment queued for offline provider ${providerId} - Assignment ID: ${assignmentData.assignmentId}`);
    return false;
  }

  private createJobAssignmentNotification(
    assignmentData: any,
    expiresAt: Date
  ): QueuedNotification {
    const { bookingDetails } = assignmentData;
    const serviceLocation = `${bookingDetails.user_addresses?.street_address || 'Unknown address'}, ${bookingDetails.user_addresses?.city || ''}`;
    
    return {
      id: `job_assignment_${assignmentData.assignmentId}`,
      type: 'job_assignment',
      title: '🚨 New Job Assignment',
      message: `New ${bookingDetails.services?.name || 'service'} job at ${serviceLocation}. Est: $${bookingDetails.estimated_cost}. Respond in 7 minutes!`,
      data: {
        assignmentId: assignmentData.assignmentId,
        bookingId: assignmentData.bookingId,
        ppsScore: assignmentData.ppsScore,
        assignmentOrder: assignmentData.assignmentOrder,
        expiresAt: expiresAt.toISOString(),
        bookingDetails,
        soundAlert: true,
        vibrate: true,
        priority: 'urgent',
        actions: [
          { id: 'accept', title: '✅ Accept Job', action: 'accept_job' },
          { id: 'decline', title: '❌ Decline Job', action: 'decline_job' }
        ]
      },
      priority: 'urgent',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: this.MAX_RETRY_ATTEMPTS
    };
  }

  async handleProviderResponse(
    assignmentId: number,
    providerId: string,
    response: 'accept' | 'decline',
    declineReason?: string
  ): Promise<{ success: boolean; message: string }> {
    // Clear the pending assignment timeout
    const pendingAssignment = this.pendingAssignments.get(assignmentId);
    if (pendingAssignment?.timeout) {
      clearTimeout(pendingAssignment.timeout);
      this.pendingAssignments.delete(assignmentId);
    }

    // Process the response through the job assignment service
    const result = await this.jobAssignmentService.handleProviderResponse(
      assignmentId,
      providerId,
      response,
      declineReason
    );

    // Send real-time updates to admin dashboard
    this.broadcastAssignmentStatusUpdate({
      assignmentId,
      providerId,
      bookingId: pendingAssignment?.bookingId,
      response,
      declineReason,
      timestamp: new Date().toISOString(),
      result
    });

    // Update provider's online status
    this.markProviderOnline(providerId);

    return {
      success: result.success,
      message: result.message
    };
  }

  private async handleAssignmentTimeout(assignmentId: number) {
    const pendingAssignment = this.pendingAssignments.get(assignmentId);
    if (!pendingAssignment) return;

    console.log(`⏰ Assignment ${assignmentId} timed out for provider ${pendingAssignment.providerId}`);

    // Mark assignment as expired in database
    await supabase
      .from('job_assignment_queue')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    // Update provider metrics for no response
    await this.updateProviderMetrics(pendingAssignment.providerId, 'job_no_response');

    // Trigger automatic fallback to next provider
    const nextProviderAssigned = await this.triggerAutomaticFallback(pendingAssignment.bookingId);

    // Broadcast timeout event to admin dashboard
    this.broadcastAssignmentStatusUpdate({
      assignmentId,
      providerId: pendingAssignment.providerId,
      bookingId: pendingAssignment.bookingId,
      response: 'timeout',
      timestamp: new Date().toISOString(),
      nextProviderAssigned
    });

    // Clean up
    this.pendingAssignments.delete(assignmentId);
  }

  private async triggerAutomaticFallback(bookingId: number): Promise<boolean> {
    try {
      // Find next scheduled provider
      const { data: nextAssignment } = await supabase
        .from('job_assignment_queue')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'scheduled')
        .order('assignment_order', { ascending: true })
        .limit(1)
        .single();

      if (!nextAssignment) {
        console.log(`⚠️ No more providers available for booking ${bookingId} - requiring manual intervention`);
        
        // Notify admin dashboard of manual intervention needed
        this.websocketService.notifyAdmins('booking_requires_manual_assignment', {
          bookingId,
          reason: 'All automatic assignments exhausted',
          timestamp: new Date().toISOString()
        });

        return false;
      }

      // Activate next assignment
      const expiresAt = new Date(Date.now() + this.RESPONSE_TIMEOUT);
      await supabase
        .from('job_assignment_queue')
        .update({
          status: 'pending',
          assigned_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          notification_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', nextAssignment.id);

      // Get booking details for next assignment
      const { data: bookingDetails } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_start_time,
          estimated_cost,
          services(name),
          user_addresses(street_address, city, state, latitude, longitude)
        `)
        .eq('id', bookingId)
        .single();

      if (!bookingDetails) {
        throw new Error('Booking details not found');
      }

      // Send notification to next provider
      await this.sendJobAssignmentNotification(nextAssignment.provider_id, {
        assignmentId: nextAssignment.id,
        bookingId,
        bookingDetails,
        ppsScore: nextAssignment.pps_score_at_assignment,
        assignmentOrder: nextAssignment.assignment_order
      });

      console.log(`🔄 Fallback assignment triggered for booking ${bookingId} - Next provider: ${nextAssignment.provider_id}`);
      return true;

    } catch (error) {
      console.error(`❌ Error in automatic fallback for booking ${bookingId}:`, error);
      return false;
    }
  }

  private async queueNotificationForOfflineProvider(
    providerId: string,
    notification: QueuedNotification
  ) {
    let queue = this.offlineNotificationQueues.get(providerId);
    if (!queue) {
      queue = {
        providerId,
        notifications: [],
        isOnline: false
      };
      this.offlineNotificationQueues.set(providerId, queue);
    }

    queue.notifications.push(notification);
    queue.isOnline = false;

    // Store in database for persistence
    await supabase
      .from('offline_notification_queue')
      .insert({
        provider_id: providerId,
        notification_id: notification.id,
        notification_type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        attempts: notification.attempts,
        max_attempts: notification.maxAttempts
      });
  }

  private async processOfflineNotificationQueues() {
    for (const [providerId, queue] of this.offlineNotificationQueues) {
      if (queue.notifications.length === 0) continue;

      const isOnline = this.isProviderOnline(providerId);
      if (isOnline && !queue.isOnline) {
        // Provider came online - send queued notifications
        await this.deliverQueuedNotifications(providerId, queue);
      }
    }
  }

  private async deliverQueuedNotifications(providerId: string, queue: NotificationQueue) {
    const notifications = [...queue.notifications];
    queue.notifications = [];
    queue.isOnline = true;

    for (const notification of notifications) {
      try {
        // Check if notification is still valid (not expired)
        if (notification.type === 'job_assignment') {
          const expiresAt = new Date(notification.data.expiresAt);
          if (new Date() > expiresAt) {
            console.log(`⏰ Skipping expired notification ${notification.id} for provider ${providerId}`);
            continue;
          }
        }

        await this.websocketService.sendMessage(`user:${providerId}`, 'queued_notification', notification);
        
        // Remove from persistent queue
        await supabase
          .from('offline_notification_queue')
          .delete()
          .eq('provider_id', providerId)
          .eq('notification_id', notification.id);

        console.log(`📬 Delivered queued notification ${notification.id} to provider ${providerId}`);

      } catch (error) {
        console.error(`❌ Failed to deliver queued notification ${notification.id} to provider ${providerId}:`, error);
        
        notification.attempts++;
        if (notification.attempts < notification.maxAttempts) {
          queue.notifications.push(notification);
        } else {
          // Max attempts reached - remove from queue
          await supabase
            .from('offline_notification_queue')
            .delete()
            .eq('provider_id', providerId)
            .eq('notification_id', notification.id);
        }
      }
    }
  }

  private isProviderOnline(providerId: string): boolean {
    return this.websocketService.getConnectedUsersCount() > 0 && 
           this.websocketService.isUserConnected(providerId);
  }

  private markProviderOnline(providerId: string) {
    const queue = this.offlineNotificationQueues.get(providerId);
    if (queue) {
      queue.isOnline = true;
      queue.lastSeen = new Date();
    }
  }

  private broadcastAssignmentStatusUpdate(data: any) {
    // Send to admin dashboard
    this.websocketService.notifyAdmins('assignment_status_update', data);
    
    // Send to specific provider
    if (data.providerId) {
      this.websocketService.sendMessage(`user:${data.providerId}`, 'assignment_response_confirmed', data);
    }
  }

  private async updateProviderMetrics(providerId: string, action: string) {
    const { data: metrics } = await supabase
      .from('provider_performance_metrics')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    const updates: any = { updated_at: new Date().toISOString() };

    if (!metrics) {
      updates.provider_id = providerId;
      updates[action === 'job_no_response' ? 'jobs_no_response' : action] = 1;
      
      await supabase
        .from('provider_performance_metrics')
        .insert(updates);
    } else {
      switch (action) {
        case 'job_no_response':
          updates.jobs_no_response = (metrics.jobs_no_response || 0) + 1;
          break;
        default:
          updates[action] = (metrics[action] || 0) + 1;
      }

      await supabase
        .from('provider_performance_metrics')
        .update(updates)
        .eq('provider_id', providerId);
    }
  }

  private async sendPushNotification(providerId: string, notification: QueuedNotification) {
    // Get provider's push notification tokens
    const { data: pushTokens } = await supabase
      .from('provider_push_tokens')
      .select('token, platform')
      .eq('provider_id', providerId)
      .eq('is_active', true);

    if (!pushTokens || pushTokens.length === 0) return;

    // Send push notifications to all registered devices
    for (const tokenData of pushTokens) {
      try {
        await this.sendPlatformSpecificPushNotification(
          tokenData.token,
          tokenData.platform,
          notification
        );
      } catch (error) {
        console.error(`Failed to send push notification to ${providerId}:`, error);
      }
    }
  }

  private async sendPlatformSpecificPushNotification(
    token: string,
    platform: string,
    notification: QueuedNotification
  ) {
    // This would integrate with push notification services like FCM, APNs, etc.
    // For now, we'll log the notification
    console.log(`📱 Push notification would be sent to ${platform} device:`, {
      token: token.substring(0, 10) + '...',
      title: notification.title,
      body: notification.message,
      data: notification.data
    });
  }

  private cleanupExpiredAssignments() {
    const now = new Date();
    const expiredAssignments: number[] = [];

    for (const [assignmentId, assignment] of this.pendingAssignments) {
      if (now > assignment.expiresAt) {
        if (assignment.timeout) {
          clearTimeout(assignment.timeout);
        }
        expiredAssignments.push(assignmentId);
      }
    }

    expiredAssignments.forEach(id => this.pendingAssignments.delete(id));

    if (expiredAssignments.length > 0) {
      console.log(`🧹 Cleaned up ${expiredAssignments.length} expired assignment timers`);
    }
  }

  // Public method to get notification queue status for admin dashboard
  public getNotificationQueueStats() {
    const stats = {
      totalProviders: this.offlineNotificationQueues.size,
      onlineProviders: 0,
      offlineProviders: 0,
      totalQueuedNotifications: 0,
      pendingAssignments: this.pendingAssignments.size,
      queuedByProvider: {} as Record<string, number>
    };

    for (const [providerId, queue] of this.offlineNotificationQueues) {
      if (queue.isOnline) {
        stats.onlineProviders++;
      } else {
        stats.offlineProviders++;
      }
      
      stats.totalQueuedNotifications += queue.notifications.length;
      stats.queuedByProvider[providerId] = queue.notifications.length;
    }

    return stats;
  }

  // Cleanup method for graceful shutdown
  public cleanup() {
    console.log('🧹 Cleaning up RealTime Notification Service...');
    
    // Clear all pending timeouts
    for (const [assignmentId, assignment] of this.pendingAssignments) {
      if (assignment.timeout) {
        clearTimeout(assignment.timeout);
      }
    }
    
    this.pendingAssignments.clear();
    this.offlineNotificationQueues.clear();
    
    console.log('✅ RealTime Notification Service cleanup complete');
  }
}