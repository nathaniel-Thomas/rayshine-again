import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse, CreateBookingRequest, UpdateBookingStatusRequest } from '../types/api';
import { Booking } from '../types/database';

export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { service_id, scheduled_start_time, scheduled_end_time, address_id, customer_notes, add_on_ids }: CreateBookingRequest = req.body;
    const customerId = req.user!.id;

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        service_id,
        scheduled_start_time,
        scheduled_end_time,
        address_id,
        customer_notes,
        status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      res.status(400).json({
        success: false,
        error: 'Failed to create booking',
        message: bookingError.message
      });
      return;
    }

    // Add add-ons if provided
    if (add_on_ids && add_on_ids.length > 0) {
      const addOnInserts = add_on_ids.map(addOnId => ({
        booking_id: booking.id,
        add_on_id: addOnId,
        quantity: 1
      }));

      const { error: addOnError } = await supabase
        .from('booking_add_ons')
        .insert(addOnInserts);

      if (addOnError) {
        console.error('Failed to add booking add-ons:', addOnError);
      }
    }

    const response: ApiResponse<Booking> = {
      success: true,
      data: booking,
      message: 'Booking created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 10, status } = req.query;
    
    let query = supabase
      .from('booking_details')
      .select('*', { count: 'exact' });

    // Filter by user role
    if (req.user!.role === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (req.user!.role === 'provider') {
      query = query.eq('provider_id', userId);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);
    query = query.order('created_at', { ascending: false });

    const { data: bookings, error, count } = await query;

    if (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to fetch bookings',
        message: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: bookings || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getBookingById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { data: booking, error } = await supabase
      .from('booking_details')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
      return;
    }

    // Check access permissions
    const hasAccess = req.user!.role === 'admin' || 
                     booking.customer_id === userId || 
                     booking.provider_id === userId;

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const updateBookingStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status }: UpdateBookingStatusRequest = req.body;
    const userId = req.user!.id;

    // First, get the booking to check permissions
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('customer_id, provider_id')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
      return;
    }

    // Check permissions
    const canUpdate = req.user!.role === 'admin' || 
                     booking.customer_id === userId || 
                     booking.provider_id === userId;

    if (!canUpdate) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Update the booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      res.status(400).json({
        success: false,
        error: 'Failed to update booking status',
        message: updateError.message
      });
      return;
    }

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};