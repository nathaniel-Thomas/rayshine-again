import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  processExpiredAssignments,
  processExpiredAssignmentsCron
} from '../controllers/expiredAssignments';

const router = Router();

// Process expired assignments (admin only)
router.post(
  '/process',
  requireAuth,
  requireAdmin,
  processExpiredAssignments
);

// Cron endpoint for processing expired assignments (no auth required, uses secret)
router.post(
  '/cron',
  processExpiredAssignmentsCron
);

// Health check for cron job
router.get(
  '/cron/health',
  (req, res) => {
    res.json({
      success: true,
      message: 'Expired assignments cron endpoint is active',
      timestamp: new Date().toISOString()
    });
  }
);

export default router;