import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { SearchProvidersQuery, ApiResponse } from '../types/api';

export const searchProviders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      service_id,
      location,
      radius = 50,
      min_rating,
      page = 1,
      limit = 10
    }: SearchProvidersQuery = req.query as any;

    let query = supabase
      .from('provider_details')
      .select('*', { count: 'exact' });

    // Filter by service if provided
    if (service_id) {
      const { data: providerIds } = await supabase
        .from('provider_services')
        .select('provider_id')
        .eq('service_id', service_id);

      if (providerIds && providerIds.length > 0) {
        const ids = providerIds.map(p => p.provider_id);
        query = query.in('id', ids);
      } else {
        // No providers offer this service
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

    // Filter by minimum rating
    if (min_rating) {
      query = query.gte('average_rating', min_rating);
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);
    query = query.order('average_rating', { ascending: false });

    const { data: providers, error, count } = await query;

    if (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to search providers',
        message: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: providers || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Search providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getProviderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: provider, error } = await supabase
      .from('provider_details')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !provider) {
      res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
      return;
    }

    // Get provider services
    const { data: services } = await supabase
      .from('provider_services')
      .select(`
        service_id,
        services (
          id,
          name,
          description,
          base_price,
          estimated_duration_minutes,
          service_categories (
            id,
            name
          )
        )
      `)
      .eq('provider_id', id);

    res.json({
      success: true,
      data: {
        ...provider,
        services: services || []
      }
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const updateProviderProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { bio, hourly_rate } = req.body;

    // Check if user is a provider
    if (req.user!.role !== 'provider' && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only providers can update provider profiles'
      });
      return;
    }

    const { data: provider, error } = await supabase
      .from('providers')
      .update({
        bio,
        hourly_rate: hourly_rate ? Number(hourly_rate) : undefined
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update provider profile',
        message: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: provider,
      message: 'Provider profile updated successfully'
    });
  } catch (error) {
    console.error('Update provider profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getProviderBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const providerId = req.user!.id;
    const { page = 1, limit = 10, status } = req.query;

    // Check if user is a provider
    if (req.user!.role !== 'provider' && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    let query = supabase
      .from('booking_details')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId);

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
        error: 'Failed to fetch provider bookings',
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
    console.error('Get provider bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};