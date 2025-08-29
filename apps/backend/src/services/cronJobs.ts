import * as cron from 'node-cron';
import { ExpiredAssignmentService } from './expiredAssignments';
import { PPSCalculationService } from './ppsCalculation';
import { supabase } from '../config/supabase';
import { WebSocketService } from './websocket';

export class CronJobService {
  private expiredAssignmentService: ExpiredAssignmentService;
  private ppsCalculationService: PPSCalculationService;
  private websocketService: WebSocketService;

  constructor(websocketService: WebSocketService) {
    this.expiredAssignmentService = new ExpiredAssignmentService();
    this.ppsCalculationService = new PPSCalculationService();
    this.websocketService = websocketService;
  }

  public startAllJobs() {
    console.log('🕒 Starting cron jobs...');

    // Process expired assignments every minute
    this.startExpiredAssignmentJob();
    
    // Recalculate PPS scores every hour
    this.startPPSRecalculationJob();
    
    // Clean up old notifications every day
    this.startNotificationCleanupJob();
    
    // Generate performance reports every day at midnight
    this.startDailyReportsJob();

    console.log('✅ All cron jobs started successfully');
  }

  private startExpiredAssignmentJob() {
    // Run every minute to check for expired assignments
    cron.schedule('* * * * *', async () => {
      try {
        console.log('⏰ Processing expired assignments...');
        
        const result = await this.expiredAssignmentService.processExpiredAssignments();
        
        if (result.processed_assignments > 0) {
          console.log(`✅ Processed ${result.processed_assignments} expired assignments`);
          console.log(`📢 Notified ${result.next_providers_notified} backup providers`);
          console.log(`❌ Failed bookings: ${result.failed_bookings}`);
          
          // Notify admins if there were failures
          if (result.failed_bookings > 0) {
            this.websocketService.notifyAdmins('assignment_failures', {
              count: result.failed_bookings,
              timestamp: new Date().toISOString()
            });
          }
        }
        
      } catch (error) {
        console.error('❌ Error processing expired assignments:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York' // Adjust to your timezone
    });

    console.log('📅 Expired assignment job scheduled (every minute)');
  }

  private startPPSRecalculationJob() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('🧮 Recalculating PPS scores for all active providers...');
        
        // Get all active providers
        const { data: providers, error } = await supabase
          .from('providers')
          .select('id')
          .eq('is_verified', true)
          .eq('onboarding_status', 'active');

        if (error || !providers?.length) {
          console.log('No active providers found for PPS recalculation');
          return;
        }

        let updatedCount = 0;
        
        for (const provider of providers) {
          try {
            const ppsResult = await this.ppsCalculationService.calculateSingleProviderPPS({
              provider_id: provider.id
            });

            // Update the provider's PPS metrics
            await supabase
              .from('provider_performance_metrics')
              .upsert({
                provider_id: provider.id,
                current_pps_score: ppsResult.pps_score,
                distance_score: ppsResult.distance_score,
                performance_score: ppsResult.performance_score,
                reliability_score: ppsResult.reliability_score,
                consistency_score: ppsResult.consistency_score,
                availability_score: ppsResult.availability_score,
                last_calculated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            updatedCount++;
            
          } catch (error) {
            console.error(`Error updating PPS for provider ${provider.id}:`, error);
          }
        }

        console.log(`✅ Updated PPS scores for ${updatedCount} providers`);
        
      } catch (error) {
        console.error('❌ Error in PPS recalculation job:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    console.log('📅 PPS recalculation job scheduled (every hour)');
  }

  private startNotificationCleanupJob() {
    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🧹 Cleaning up old notifications...');
        
        // Delete read notifications older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { error: readNotificationsError } = await supabase
          .from('notifications')
          .delete()
          .eq('is_read', true)
          .lt('created_at', thirtyDaysAgo.toISOString());

        if (readNotificationsError) {
          console.error('Error deleting read notifications:', readNotificationsError);
        }

        // Delete unread notifications older than 7 days (except critical ones)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { error: unreadNotificationsError } = await supabase
          .from('notifications')
          .delete()
          .eq('is_read', false)
          .lt('created_at', sevenDaysAgo.toISOString())
          .neq('type', 'booking_alert'); // Keep booking alerts longer

        if (unreadNotificationsError) {
          console.error('Error deleting old unread notifications:', unreadNotificationsError);
        }

        // Clean up old job assignment records
        const { error: assignmentError } = await supabase
          .from('job_assignment_queue')
          .delete()
          .in('status', ['expired', 'cancelled', 'accepted'])
          .lt('created_at', thirtyDaysAgo.toISOString());

        if (assignmentError) {
          console.error('Error cleaning up job assignments:', assignmentError);
        }

        console.log('✅ Notification cleanup completed');
        
      } catch (error) {
        console.error('❌ Error in notification cleanup job:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    console.log('📅 Notification cleanup job scheduled (daily at 2 AM)');
  }

  private startDailyReportsJob() {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('📊 Generating daily performance reports...');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Calculate daily metrics
        const metrics = await this.calculateDailyMetrics(yesterdayStr);
        
        // Store daily metrics
        await supabase
          .from('app_settings')
          .upsert({
            key: `daily_metrics_${yesterdayStr}`,
            value: JSON.stringify(metrics),
            description: `Daily metrics for ${yesterdayStr}`,
            is_public: false
          });

        // Notify admins of daily metrics
        this.websocketService.notifyAdmins('daily_metrics', {
          date: yesterdayStr,
          metrics,
          timestamp: new Date().toISOString()
        });

        console.log('✅ Daily reports generated');
        console.log('📈 Metrics:', JSON.stringify(metrics, null, 2));
        
      } catch (error) {
        console.error('❌ Error generating daily reports:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    console.log('📅 Daily reports job scheduled (daily at midnight)');
  }

  private async calculateDailyMetrics(date: string) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Bookings metrics
    const { data: bookings } = await supabase
      .from('bookings')
      .select('status, estimated_cost, final_cost, assignment_method')
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay);

    // Provider response metrics
    const { data: assignments } = await supabase
      .from('job_assignment_queue')
      .select('status, response_time_seconds, pps_score_at_assignment')
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay);

    // Calculate metrics
    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
    const autoAssignedBookings = bookings?.filter(b => b.assignment_method === 'auto_pps').length || 0;
    
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.final_cost || b.estimated_cost || 0), 0) || 0;
    
    const totalAssignments = assignments?.length || 0;
    const acceptedAssignments = assignments?.filter(a => a.status === 'accepted').length || 0;
    const expiredAssignments = assignments?.filter(a => a.status === 'expired').length || 0;
    
    const avgResponseTime = assignments?.length > 0 
      ? assignments.reduce((sum, a) => sum + (a.response_time_seconds || 0), 0) / assignments.length 
      : 0;

    return {
      date,
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        autoAssigned: autoAssignedBookings,
        completionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(2) : 0,
        autoAssignmentRate: totalBookings > 0 ? (autoAssignedBookings / totalBookings * 100).toFixed(2) : 0
      },
      revenue: {
        total: totalRevenue,
        average: totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0
      },
      assignments: {
        total: totalAssignments,
        accepted: acceptedAssignments,
        expired: expiredAssignments,
        acceptanceRate: totalAssignments > 0 ? (acceptedAssignments / totalAssignments * 100).toFixed(2) : 0,
        avgResponseTimeMinutes: (avgResponseTime / 60).toFixed(2)
      },
      timestamp: new Date().toISOString()
    };
  }

  public stopAllJobs() {
    cron.getTasks().forEach(task => {
      (task as any).destroy();
    });
    console.log('🛑 All cron jobs stopped');
  }
}