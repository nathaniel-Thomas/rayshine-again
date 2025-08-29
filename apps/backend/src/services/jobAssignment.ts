import { supabase } from '../config/supabase';
import { PPSCalculationService } from './ppsCalculation';
import { WebSocketService } from './websocket';

export interface JobAssignmentRequest {
  booking_id: number;
  assignment_method: 'manual' | 'auto_pps';
  manual_provider_id?: string;
  max_providers?: number;
}

export interface AssignmentResult {
  success: boolean;
  assignment_id?: number;
  provider_id?: string;
  expires_at?: string;
  message: string;
}

export class JobAssignmentService {
  private ppsService: PPSCalculationService;
  private websocketService?: WebSocketService;

  constructor(websocketService?: WebSocketService) {
    this.ppsService = new PPSCalculationService();
    this.websocketService = websocketService;
  }

  async assignJob(request: JobAssignmentRequest): Promise<AssignmentResult> {
    if (request.assignment_method === 'manual') {
      return await this.assignJobManually(request);
    } else {
      return await this.assignJobAutomatically(request);
    }
  }

  private async assignJobManually(request: JobAssignmentRequest): Promise<AssignmentResult> {
    if (!request.manual_provider_id) {
      return { success: false, message: 'Provider ID required for manual assignment' };
    }

    // Verify provider exists and is available
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id, is_verified, onboarding_status')
      .eq('id', request.manual_provider_id)
      .eq('is_verified', true)
      .eq('onboarding_status', 'active')
      .single();

    if (providerError || !provider) {
      return { success: false, message: 'Provider not found or not available' };
    }

    // Update booking with assigned provider
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        provider_id: request.manual_provider_id,
        status: 'confirmed',
        assignment_method: 'manual',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.booking_id);

    if (bookingError) {
      return { success: false, message: 'Failed to update booking' };
    }

    // Create assignment record for tracking
    const expiresAt = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes from now
    
    const { data: assignment, error: assignmentError } = await supabase
      .from('job_assignment_queue')
      .insert({
        booking_id: request.booking_id,
        provider_id: request.manual_provider_id,
        expires_at: expiresAt.toISOString(),
        assignment_order: 1,
        status: 'accepted', // Manual assignments are pre-accepted
        responded_at: new Date().toISOString(),
        response_time_seconds: 0
      })
      .select('id')
      .single();

    if (assignmentError) {
      console.error('Failed to create assignment record:', assignmentError);
    }

    return {
      success: true,
      assignment_id: assignment?.id,
      provider_id: request.manual_provider_id,
      expires_at: expiresAt.toISOString(),
      message: 'Job manually assigned successfully'
    };
  }

  private async assignJobAutomatically(request: JobAssignmentRequest): Promise<AssignmentResult> {
    // Get booking details to determine location and service type
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        service_id,
        user_addresses!inner(latitude, longitude)
      `)
      .eq('id', request.booking_id)
      .single();

    if (bookingError || !booking) {
      return { success: false, message: 'Booking not found' };
    }

    // Mark booking as starting auto-assignment process
    await supabase
      .from('bookings')
      .update({
        assignment_method: 'auto_pps',
        auto_assignment_started_at: new Date().toISOString(),
        status: 'pending'
      })
      .eq('id', request.booking_id);

    // Calculate PPS scores for all eligible providers
    const rankedProviders = await this.ppsService.calculateAllProvidersPPS({
      job_latitude: (booking.user_addresses as any).latitude,
      job_longitude: (booking.user_addresses as any).longitude,
      service_area_filter: true,
      limit: request.max_providers || 10
    });

    if (!rankedProviders.length) {
      return { success: false, message: 'No eligible providers found' };
    }

    // Start assignment process with top provider
    const topProvider = rankedProviders[0];
    const result = await this.createJobAssignment(request.booking_id, topProvider, 1);

    // Schedule fallback assignments for other providers
    await this.scheduleBackupAssignments(request.booking_id, rankedProviders.slice(1));

    return result;
  }

  private async createJobAssignment(
    bookingId: number, 
    providerData: any, 
    assignmentOrder: number
  ): Promise<AssignmentResult> {
    
    const expiresAt = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes from now
    const notificationSentAt = new Date();

    const { data: assignment, error } = await supabase
      .from('job_assignment_queue')
      .insert({
        booking_id: bookingId,
        provider_id: providerData.provider_id,
        expires_at: expiresAt.toISOString(),
        pps_score_at_assignment: providerData.pps_score,
        assignment_order: assignmentOrder,
        status: 'pending',
        notification_sent_at: notificationSentAt.toISOString()
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, message: 'Failed to create job assignment' };
    }

    // Send notification to provider
    await this.sendProviderNotification(providerData.provider_id, bookingId, assignment.id);

    // Send real-time WebSocket notification
    if (this.websocketService) {
      await this.websocketService.notifyProviderJobAssignment(providerData.provider_id, {
        assignmentId: assignment.id,
        bookingId,
        ppsScore: providerData.pps_score,
        expiresAt: expiresAt.toISOString(),
        assignmentOrder
      });
    }

    return {
      success: true,
      assignment_id: assignment.id,
      provider_id: providerData.provider_id,
      expires_at: expiresAt.toISOString(),
      message: `Job assigned to provider with PPS score ${providerData.pps_score}`
    };
  }

  private async scheduleBackupAssignments(bookingId: number, backupProviders: any[]) {
    for (let i = 0; i < Math.min(backupProviders.length, 5); i++) {
      const provider = backupProviders[i];
      const delayMinutes = (i + 1) * 7; // 7, 14, 21, etc. minutes delay
      const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);
      
      await supabase
        .from('job_assignment_queue')
        .insert({
          booking_id: bookingId,
          provider_id: provider.provider_id,
          expires_at: new Date(scheduledFor.getTime() + 7 * 60 * 1000).toISOString(),
          pps_score_at_assignment: provider.pps_score,
          assignment_order: i + 2,
          status: 'scheduled',
          notification_sent_at: null // Will be set when actually sent
        });
    }
  }

  private async sendProviderNotification(providerId: string, bookingId: number, assignmentId: number) {
    // Create notification record
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

    if (!booking) return;

    const notificationMessage = `New job available: ${(booking.services as any).name} at ${(booking.user_addresses as any).street_address}, ${(booking.user_addresses as any).city}. Estimated: $${booking.estimated_cost}. You have 7 minutes to respond.`;

    await supabase
      .from('notifications')
      .insert({
        user_id: providerId,
        title: 'New Job Assignment',
        message: notificationMessage,
        type: 'booking_alert'
      });

    // Here you would also trigger push notifications, SMS, etc.
  }

  async handleProviderResponse(
    assignmentId: number,
    providerId: string,
    response: 'accept' | 'decline',
    declineReason?: string
  ): Promise<AssignmentResult> {
    
    // Verify the assignment exists and belongs to the provider
    const { data: assignment, error: assignmentError } = await supabase
      .from('job_assignment_queue')
      .select('*')
      .eq('id', assignmentId)
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .single();

    if (assignmentError || !assignment) {
      return { success: false, message: 'Assignment not found or already responded to' };
    }

    // Check if assignment has expired
    const now = new Date();
    const expiresAt = new Date(assignment.expires_at);
    
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('job_assignment_queue')
        .update({
          status: 'expired',
          updated_at: now.toISOString()
        })
        .eq('id', assignmentId);

      return { success: false, message: 'Assignment has expired' };
    }

    // Calculate response time
    const assignedAt = new Date(assignment.assigned_at);
    const responseTimeSeconds = Math.floor((now.getTime() - assignedAt.getTime()) / 1000);

    if (response === 'accept') {
      return await this.handleAcceptance(assignment, responseTimeSeconds);
    } else {
      return await this.handleDecline(assignment, responseTimeSeconds, declineReason);
    }
  }

  private async handleAcceptance(assignment: any, responseTimeSeconds: number): Promise<AssignmentResult> {
    const now = new Date();

    try {
      // Update the assignment status
      await supabase
        .from('job_assignment_queue')
        .update({
          status: 'accepted',
          responded_at: now.toISOString(),
          response_time_seconds: responseTimeSeconds,
          updated_at: now.toISOString()
        })
        .eq('id', assignment.id);

      // Update the booking
      await supabase
        .from('bookings')
        .update({
          provider_id: assignment.provider_id,
          status: 'confirmed',
          auto_assignment_completed_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', assignment.booking_id);

      // Cancel any other pending assignments for this booking
      await supabase
        .from('job_assignment_queue')
        .update({
          status: 'cancelled',
          updated_at: now.toISOString()
        })
        .eq('booking_id', assignment.booking_id)
        .neq('id', assignment.id)
        .in('status', ['pending', 'scheduled']);

      // Update provider performance metrics
      await this.updateProviderMetrics(assignment.provider_id, 'job_accepted', responseTimeSeconds);

      // Notify customer of confirmation
      await this.notifyCustomerOfConfirmation(assignment.booking_id, assignment.provider_id);

      // Get booking details for customer notification
      const { data: bookingDetails } = await supabase
        .from('bookings')
        .select('customer_id')
        .eq('id', assignment.booking_id)
        .single();

      // Send real-time WebSocket notification to customer
      if (this.websocketService && bookingDetails) {
        await this.websocketService.notifyCustomerBookingConfirmed(
          bookingDetails.customer_id, 
          {
            bookingId: assignment.booking_id,
            providerId: assignment.provider_id,
            status: 'confirmed',
            message: 'Your booking has been confirmed!'
          }
        );
      }

      return {
        success: true,
        booking_confirmed: true,
        message: 'Job accepted successfully'
      } as AssignmentResult;

    } catch (error) {
      console.error('Error handling acceptance:', error);
      return { success: false, message: 'Failed to process acceptance' };
    }
  }

  private async handleDecline(assignment: any, responseTimeSeconds: number, declineReason?: string): Promise<AssignmentResult> {
    const now = new Date();

    // Update the assignment status
    await supabase
      .from('job_assignment_queue')
      .update({
        status: 'declined',
        responded_at: now.toISOString(),
        response_time_seconds: responseTimeSeconds,
        updated_at: now.toISOString()
      })
      .eq('id', assignment.id);

    // Update provider performance metrics
    await this.updateProviderMetrics(assignment.provider_id, 'job_declined', responseTimeSeconds);

    // Find and notify next available provider
    const nextProviderNotified = await this.assignToNextProvider(assignment.booking_id);

    return {
      success: true,
      booking_confirmed: false,
      message: 'Job declined, assignment passed to next provider'
    } as AssignmentResult & { booking_confirmed: boolean };
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
      // No more providers available, mark booking as needing manual intervention
      await supabase
        .from('bookings')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      return false;
    }

    // Convert scheduled assignment to active
    const expiresAt = new Date(Date.now() + 7 * 60 * 1000);
    const now = new Date();

    await supabase
      .from('job_assignment_queue')
      .update({
        status: 'pending',
        assigned_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        notification_sent_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', nextAssignment.id);

    // Send notification to next provider
    await this.sendProviderNotification(nextAssignment.provider_id, bookingId, nextAssignment.id);

    return true;
  }

  private async updateProviderMetrics(providerId: string, action: string, responseTimeSeconds: number) {
    const { data: metrics } = await supabase
      .from('provider_performance_metrics')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (!metrics) {
      // Create initial metrics record
      const updates: any = { provider_id: providerId };
      
      switch (action) {
        case 'job_offered': updates.jobs_offered = 1; break;
        case 'job_accepted': updates.jobs_accepted = 1; break;
        case 'job_declined': updates.jobs_declined = 1; break;
        case 'job_no_response': updates.jobs_no_response = 1; break;
      }

      await supabase
        .from('provider_performance_metrics')
        .insert(updates);
    } else {
      // Update existing metrics
      const updates: any = { updated_at: new Date().toISOString() };

      switch (action) {
        case 'job_offered':
          updates.jobs_offered = metrics.jobs_offered + 1;
          break;
        case 'job_accepted':
          updates.jobs_accepted = metrics.jobs_accepted + 1;
          break;
        case 'job_declined':
          updates.jobs_declined = metrics.jobs_declined + 1;
          break;
        case 'job_no_response':
          updates.jobs_no_response = metrics.jobs_no_response + 1;
          break;
      }

      await supabase
        .from('provider_performance_metrics')
        .update(updates)
        .eq('provider_id', providerId);
    }

    // Recalculate PPS score for this provider
    await this.recalculateProviderPPS(providerId);
  }

  private async recalculateProviderPPS(providerId: string) {
    try {
      const ppsResult = await this.ppsService.calculateSingleProviderPPS({ provider_id: providerId });

      if (ppsResult.pps_score !== undefined) {
        await supabase
          .from('provider_performance_metrics')
          .update({
            current_pps_score: ppsResult.pps_score,
            distance_score: ppsResult.distance_score,
            performance_score: ppsResult.performance_score,
            reliability_score: ppsResult.reliability_score,
            consistency_score: ppsResult.consistency_score,
            availability_score: ppsResult.availability_score,
            last_calculated_at: new Date().toISOString()
          })
          .eq('provider_id', providerId);
      }
    } catch (error) {
      console.error(`Error recalculating PPS for provider ${providerId}:`, error);
    }
  }

  private async notifyCustomerOfConfirmation(bookingId: number, providerId: string) {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        customer_id,
        scheduled_start_time,
        user_profiles!provider_id(full_name, avatar_url)
      `)
      .eq('id', bookingId)
      .single();

    if (booking) {
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.customer_id,
          title: 'Booking Confirmed!',
          message: `Your booking has been confirmed with ${(booking.user_profiles as any).full_name}. They will arrive at your scheduled time.`,
          type: 'booking_alert'
        });
    }
  }
}