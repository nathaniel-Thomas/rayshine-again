import { Router } from 'express';
import { supabase } from '../config/supabase';
import { validateRequest, schemas } from '../middleware/validation';

const router = Router();

// Get all service categories
router.get('/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');

    if (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to fetch service categories',
        message: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: categories || []
    });
  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all services
router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = supabase
      .from('services')
      .select(`
        *,
        service_categories (
          id,
          name,
          description
        ),
        service_add_ons (
          id,
          name,
          description,
          price,
          is_active
        )
      `);

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    query = query.order('name');

    const { data: services, error } = await query;

    if (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to fetch services',
        message: error.message
      });
      return;
    }

    res.json({
      success: true,
      data: services || []
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        service_categories (
          id,
          name,
          description
        ),
        service_add_ons!inner (
          id,
          name,
          description,
          price,
          is_active
        )
      `)
      .eq('id', id)
      .eq('service_add_ons.is_active', true)
      .single();

    if (error || !service) {
      res.status(404).json({
        success: false,
        error: 'Service not found'
      });
      return;
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;