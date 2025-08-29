import { Router } from 'express';
import { requireAuth, requireAdmin, requireProvider } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import {
  assignJob,
  respondToJobAssignment,
  getJobAssignments,
  getJobAssignmentById
} from '../controllers/jobAssignment';
import Joi from 'joi';

const router = Router();

// Custom validation schemas for job assignment endpoints
const jobAssignmentSchema = Joi.object({
  booking_id: Joi.number().required(),
  assignment_method: Joi.string().valid('manual', 'auto_pps').required(),
  manual_provider_id: Joi.string().uuid().when('assignment_method', {
    is: 'manual',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  max_providers: Joi.number().min(1).max(20).default(10)
});

const providerResponseSchema = Joi.object({
  response: Joi.string().valid('accept', 'decline').required(),
  decline_reason: Joi.string().when('response', {
    is: 'decline',
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  })
});

const jobAssignmentQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'accepted', 'declined', 'expired', 'no_response', 'scheduled', 'cancelled').optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10)
});

// Assign a job to provider(s) (admin only)
router.post(
  '/assign',
  requireAuth,
  requireAdmin,
  validateRequest({ body: jobAssignmentSchema }),
  assignJob
);

// Provider responds to job assignment
router.post(
  '/:assignmentId/respond',
  requireAuth,
  requireProvider,
  validateRequest({ body: providerResponseSchema }),
  respondToJobAssignment
);

// Get job assignments (role-based access)
router.get(
  '/',
  requireAuth,
  validateRequest({ query: jobAssignmentQuerySchema }),
  getJobAssignments
);

// Get specific job assignment by ID
router.get(
  '/:id',
  requireAuth,
  getJobAssignmentById
);

// Get provider's pending assignments (shortcut for providers)
router.get(
  '/my-assignments/pending',
  requireAuth,
  requireProvider,
  async (req, res) => {
    // Set query parameters for pending assignments
    req.query.status = 'pending';
    await getJobAssignments(req, res);
  }
);

export default router;