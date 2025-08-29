import express from 'express';
import {
  subscribe,
  unsubscribe,
  verifySubscription,
  sendTestNotification,
  getPreferences,
  savePreferences,
  broadcastNotification
} from '../controllers/notifications';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Push notification subscription management
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/verify-subscription', verifySubscription);

// Test notification
router.post('/test', sendTestNotification);

// Notification preferences
router.get('/preferences', getPreferences);
router.put('/preferences', savePreferences);

// Broadcast notifications (admin only)
router.post('/broadcast', broadcastNotification);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notification service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;