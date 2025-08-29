import { Router } from 'express';
import { requireAuth, requireProvider } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import {
  searchProviders,
  getProviderById,
  updateProviderProfile,
  getProviderBookings
} from '../controllers/providers';

const router = Router();

// Search providers (public)
router.get(
  '/search',
  validateRequest({ query: schemas.searchProviders }),
  searchProviders
);

// Get provider by ID (public)
router.get(
  '/:id',
  getProviderById
);

// Update provider profile (providers only)
router.put(
  '/profile',
  requireAuth,
  requireProvider,
  updateProviderProfile
);

// Get provider's bookings (providers only)
router.get(
  '/me/bookings',
  requireAuth,
  requireProvider,
  validateRequest({ query: schemas.pagination }),
  getProviderBookings
);

export default router;