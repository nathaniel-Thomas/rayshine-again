import express from 'express';
import {
  getDashboardMetrics,
  getLiveBookings,
  getUserActivities,
  getSystemAlerts,
  resolveSystemAlert,
  createSystemAlert
} from '../controllers/dashboard';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Dashboard metrics (admins and managers)
router.get('/metrics', requireAdmin, getDashboardMetrics);

// Live bookings feed
router.get('/bookings/live', requireAdmin, getLiveBookings);

// User activity feed
router.get('/activities', requireAdmin, getUserActivities);

// System alerts
router.get('/alerts', requireAdmin, getSystemAlerts);
router.post('/alerts', requireAdmin, createSystemAlert);
router.patch('/alerts/:alertId/resolve', requireAdmin, resolveSystemAlert);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard API is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;