import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  createBooking: Joi.object({
    service_id: Joi.number().required(),
    scheduled_start_time: Joi.string().isoDate().required(),
    scheduled_end_time: Joi.string().isoDate().required(),
    address_id: Joi.number().required(),
    customer_notes: Joi.string().optional(),
    add_on_ids: Joi.array().items(Joi.number()).optional()
  }),

  updateBookingStatus: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'in_progress', 'completed', 'cancelled').required()
  }),

  createQuote: Joi.object({
    booking_id: Joi.number().required(),
    quoted_amount: Joi.number().positive().required(),
    expires_at: Joi.string().isoDate().required()
  }),

  createReview: Joi.object({
    booking_id: Joi.number().required(),
    reviewee_id: Joi.string().uuid().required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().optional()
  }),

  updateProfile: Joi.object({
    full_name: Joi.string().optional(),
    phone_number: Joi.string().optional(),
    avatar_url: Joi.string().uri().optional()
  }),

  createAddress: Joi.object({
    address_label: Joi.string().required(),
    street_address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country_code: Joi.string().length(2).default('US'),
    is_primary: Joi.boolean().default(false)
  }),

  searchProviders: Joi.object({
    service_id: Joi.number().optional(),
    location: Joi.string().optional(),
    radius: Joi.number().positive().optional(),
    min_rating: Joi.number().min(1).max(5).optional(),
    availability_start: Joi.string().isoDate().optional(),
    availability_end: Joi.string().isoDate().optional(),
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10)
  })
};