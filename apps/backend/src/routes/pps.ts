import { Router } from 'express';
import { requireAuth, requireAdmin, requireProvider, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import {
  calculatePPS,
  getProviderPPSScore,
  getProviderRanking
} from '../controllers/pps';
import Joi from 'joi';

const router = Router();

// Custom validation schemas for PPS endpoints
const ppsCalculationSchema = Joi.object({
  provider_id: Joi.string().uuid().optional(),
  job_latitude: Joi.number().min(-90).max(90).optional(),
  job_longitude: Joi.number().min(-180).max(180).optional(),
  service_area_filter: Joi.boolean().default(true),
  limit: Joi.number().min(1).max(100).default(50)
});

const providerRankingQuerySchema = Joi.object({
  job_latitude: Joi.number().min(-90).max(90).optional(),
  job_longitude: Joi.number().min(-180).max(180).optional(),
  service_area_filter: Joi.string().valid('true', 'false').default('true'),
  limit: Joi.number().min(1).max(100).default(50)
});

// Calculate PPS scores (admin only for bulk calculations)
router.post(
  '/calculate',
  requireAuth,
  requireAdmin,
  validateRequest({ body: ppsCalculationSchema }),
  calculatePPS
);

// Get specific provider's PPS score
router.get(
  '/provider/:providerId',
  requireAuth,
  getProviderPPSScore
);

// Get provider rankings for job assignment
router.get(
  '/rankings',
  requireAuth,
  requireAdmin,
  validateRequest({ query: providerRankingQuerySchema }),
  getProviderRanking
);

// Get current user's PPS score (providers only)
router.get(
  '/my-score',
  requireAuth,
  requireProvider,
  async (req: AuthenticatedRequest, res) => {
    // Redirect to the provider-specific endpoint with current user's ID
    req.params.providerId = req.user!.id;
    await getProviderPPSScore(req, res);
  }
);

export default router;