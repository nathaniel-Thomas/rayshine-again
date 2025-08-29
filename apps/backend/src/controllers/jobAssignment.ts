import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { JobAssignmentService, JobAssignmentRequest } from '../services/jobAssignment';
import { ApiResponse } from '../types/api';

const jobAssignmentService = new JobAssignmentService();

export const assignJob = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Only admins can trigger job assignments
    if (req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only administrators can assign jobs'
      });
      return;
    }

    const assignmentRequest: JobAssignmentRequest = req.body;
    
    const result = await jobAssignmentService.assignJob(assignmentRequest);

    const response: ApiResponse = {
      success: result.success,
      data: result,
      message: result.message
    };

    res.json(response);
  } catch (error) {
    console.error('Job assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Job assignment failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const respondToJobAssignment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const { response, decline_reason } = req.body;
    const providerId = req.user!.id;

    // Only providers can respond to job assignments
    if (req.user!.role !== 'provider') {
      res.status(403).json({
        success: false,
        error: 'Only providers can respond to job assignments'
      });
      return;
    }

    if (!['accept', 'decline'].includes(response)) {
      res.status(400).json({
        success: false,
        error: 'Response must be either "accept" or "decline"'
      });
      return;
    }

    const result = await jobAssignmentService.handleProviderResponse(
      Number(assignmentId),
      providerId,
      response,
      decline_reason
    );

    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('Provider response error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process provider response'
    });
  }
};

export const getJobAssignments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = `
      *,
      bookings (
        id,
        scheduled_start_time,
        estimated_cost,
        services (name),
        user_addresses (street_address, city, state)
      )
    `;

    let dbQuery = supabase
      .from('job_assignment_queue')
      .select(query, { count: 'exact' });

    // Filter based on user role
    if (req.user!.role === 'provider') {
      dbQuery = dbQuery.eq('provider_id', userId);
    } else if (req.user!.role === 'customer') {
      // Customers can see assignments for their bookings
      const { data: customerBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', userId);

      if (customerBookings && customerBookings.length > 0) {
        const bookingIds = customerBookings.map(b => b.id);
        dbQuery = dbQuery.in('booking_id', bookingIds);
      } else {
        // No bookings for this customer
        res.json({
          success: true,
          data: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0
          }
        });
        return;
      }
    }
    // Admin can see all assignments (no additional filter)

    // Filter by status if provided
    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    dbQuery = dbQuery.range(offset, offset + Number(limit) - 1);
    dbQuery = dbQuery.order('created_at', { ascending: false });

    const { data: assignments, error, count } = await dbQuery;

    if (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to fetch job assignments',
        message: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: assignments || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get job assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getJobAssignmentById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { data: assignment, error } = await supabase
      .from('job_assignment_queue')
      .select(`
        *,
        bookings (
          id,
          customer_id,
          scheduled_start_time,
          estimated_cost,
          customer_notes,
          services (name, description),
          user_addresses (street_address, city, state, postal_code)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !assignment) {
      res.status(404).json({
        success: false,
        error: 'Job assignment not found'
      });
      return;
    }

    // Check access permissions
    const hasAccess = req.user!.role === 'admin' || 
                     assignment.provider_id === userId || 
                     assignment.bookings.customer_id === userId;

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Get job assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Import supabase here since it's used in the controller
import { supabase } from '../config/supabase';