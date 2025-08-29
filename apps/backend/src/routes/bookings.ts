import { Router } from 'express';
import { requireAuth, requireCustomerOrProvider } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus
} from '../controllers/bookings';

const router = Router();

// Create a new booking (customers only)
router.post(
  '/',
  requireAuth,
  requireCustomerOrProvider,
  validateRequest({ body: schemas.createBooking }),
  createBooking
);

// Get bookings for the authenticated user
router.get(
  '/',
  requireAuth,
  validateRequest({ query: schemas.pagination }),
  getBookings
);

// Get a specific booking by ID
router.get(
  '/:id',
  requireAuth,
  getBookingById
);

// Update booking status
router.patch(
  '/:id/status',
  requireAuth,
  validateRequest({ body: schemas.updateBookingStatus }),
  updateBookingStatus
);

export default router;