import express from 'express';
import multer from 'multer';
import {
  sendMessage,
  uploadMessageFile,
  sendMessageWithFile,
  getMessageHistory,
  getConversations,
  searchMessages,
  markMessageAsRead,
  markThreadAsRead,
  setTypingIndicator,
  getTypingIndicators,
  syncOfflineMessages
} from '../controllers/messaging';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and text files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(requireAuth);

// Conversation management routes
router.get('/conversations', getConversations);
router.get('/threads/:threadId/messages', getMessageHistory);
router.post('/threads/:threadId/read', markThreadAsRead);

// Message operations
router.post('/send', sendMessage);
router.post('/send-with-file', upload.single('file'), sendMessageWithFile);
router.post('/messages/:messageId/read', markMessageAsRead);

// File upload
router.post('/upload', upload.single('file'), uploadMessageFile);

// Search functionality
router.get('/search', searchMessages);

// Typing indicators
router.post('/threads/:threadId/typing', setTypingIndicator);
router.get('/threads/:threadId/typing', getTypingIndicators);

// Offline synchronization
router.get('/sync', syncOfflineMessages);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Messaging service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;