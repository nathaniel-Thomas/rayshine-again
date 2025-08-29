import { Router } from 'express';
import bookingsRoutes from './bookings';
import providersRoutes from './providers';
import servicesRoutes from './services';
import ppsRoutes from './pps';
import jobAssignmentRoutes from './jobAssignment';
import expiredAssignmentsRoutes from './expiredAssignments';
import messagingRoutes from './messaging';
import notificationsRoutes from './notifications';
import dashboardRoutes from './dashboard';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Rayshine API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
router.use('/bookings', bookingsRoutes);
router.use('/providers', providersRoutes);
router.use('/services', servicesRoutes);
router.use('/pps', ppsRoutes);
router.use('/job-assignments', jobAssignmentRoutes);
router.use('/expired-assignments', expiredAssignmentsRoutes);
router.use('/messages', messagingRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;