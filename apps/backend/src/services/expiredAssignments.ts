import { supabase } from '../config/supabase';
import { JobAssignmentService } from './jobAssignment';

export interface ExpirationResult {
  processed_assignments: number;
  failed_bookings: number;
  next_providers_notified: number;
}

export class ExpiredAssignmentService {
  private jobAssignmentService: JobAssignmentService;

  constructor() {
    this.jobAssignmentService = new JobAssignmentService();
  }

  async processExpiredAssignments(): Promise<ExpirationResult> {
    const now = new Date();
    let processedAssignments = 0;
    let failedBookings = 0;
    let nextProvidersNotified = 0;

    // Find all expired assignments that haven't been processed yet
    const { data: expiredAssignments, error: fetchError } = await supabase
      .from('job_assignment_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching expired assignments:', fetchError);
      return { processed_assignments: 0, failed_bookings: 0, next_providers_notified: 0 };
    }

    if (!expiredAssignments?.length) {
      return { processed_assignments: 0, failed_bookings: 0, next_providers_notified: 0 };
    }

    console.log(`Processing ${expiredAssignments.length} expired assignments`);

    for (const assignment of expiredAssignments) {
      try {
        // Mark assignment as expired and no_response
        await supabase
          .from('job_assignment_queue')
          .update({
            status: 'expired',
            updated_at: now.toISOString()
          })
          .eq('id', assignment.id);

        // Update provider metrics for no response
        await this.updateProviderMetrics(assignment.provider_id, 'job_no_response');

        // Try to assign to next provider
        const nextAssigned = await this.assignToNextProvider(assignment.booking_id);
        
        if (nextAssigned) {
          nextProvidersNotified++;
        } else {
          // No more providers available
          await this.handleBookingFailure(assignment.booking_id);
          failedBookings++;
        }

        processedAssignments++;

      } catch (error) {
        console.error(`Error processing expired assignment ${assignment.id}:`, error);
      }
    }

    return {
      processed_assignments: processedAssignments,
      failed_bookings: failedBookings,
      next_providers_notified: nextProvidersNotified
    };
  }

  private async assignToNextProvider(bookingId: number): Promise<boolean> {
    // Find the next scheduled assignment
    const { data: nextAssignment } = await supabase
      .from('job_assignment_queue')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('status', 'scheduled')
      .order('assignment_order', { ascending: true })
      .limit(1)
      .single();

    if (!nextAssignment) {
      return false;
    }

    // Convert scheduled assignment to active
    const expiresAt = new Date(Date.now() + 7 * 60 * 1000);
    const now = new Date();

    const { error: updateError } = await supabase
      .from('job_assignment_queue')
      .update({
        status: 'pending',
        assigned_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        notification_sent_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', nextAssignment.id);

    if (updateError) {
      console.error('Error updating next assignment:', updateError);
      return false;
    }

    // Send notification to next provider
    await this.sendProviderNotification(nextAssignment.provider_id, bookingId, nextAssignment.id);

    return true;
  }

  private async handleBookingFailure(bookingId: number) {
    // Update booking status to indicate auto-assignment failure
    await supabase
      .from('bookings')
      .update({
        status: 'pending',
        assignment_method: 'manual', // Switch back to manual assignment
        auto_assignment_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    // Notify admins of failed auto-assignment
    await this.notifyAdminsOfFailedBooking(bookingId);

    // Optionally notify customer of delay
    await this.notifyCustomerOfDelay(bookingId);
  }

  private async updateProviderMetrics(providerId: string, action: string) {
    const { data: metrics } = await supabase
      .from('provider_performance_metrics')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (!metrics) {
      // Create initial metrics record
      await supabase
        .from('provider_performance_metrics')
        .insert({
          provider_id: providerId,
          jobs_no_response: action === 'job_no_response' ? 1 : 0
        });
    } else {
      // Update existing metrics
      const updates: any = { updated_at: new Date().toISOString() };

      if (action === 'job_no_response') {
        updates.jobs_no_response = metrics.jobs_no_response + 1;
      }

      await supabase
        .from('provider_performance_metrics')
        .update(updates)
        .eq('provider_id', providerId);
    }
  }

  private async sendProviderNotification(providerId: string, bookingId: number, assignmentId: number) {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id,
        scheduled_start_time,
        estimated_cost,
        services(name),
        user_addresses(street_address, city, state)
      `)
      .eq('id', bookingId)
      .single();

    if (booking) {
      const message = `New job available: ${(booking.services as any).name} at ${(booking.user_addresses as any).street_address}, ${(booking.user_addresses as any).city}. Estimated: $${booking.estimated_cost}. You have 7 minutes to respond.`;

      await supabase
        .from('notifications')
        .insert({
          user_id: providerId,
          title: 'New Job Assignment',
          message: message,
          type: 'booking_alert'
        });
    }
  }

  private async notifyAdminsOfFailedBooking(bookingId: number) {
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin');

    for (const admin of admins || []) {
      await supabase
        .from('notifications')
        .insert({
          user_id: admin.id,
          title: 'Booking Assignment Failed',
          message: `Booking #${bookingId} could not be automatically assigned to any provider. Manual assignment required.`,
          type: 'system'
        });
    }
  }

  private async notifyCustomerOfDelay(bookingId: number) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('id', bookingId)
      .single();

    if (booking) {
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.customer_id,
          title: 'Booking Update',
          message: 'We are working to find the best provider for your booking. You will be notified once a provider is confirmed.',
          type: 'booking_alert'
        });
    }
  }
}