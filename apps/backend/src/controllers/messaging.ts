import { Request, Response } from 'express';
import { MessagingService } from '../services/messagingService';
import { websocketService } from '../index';

const messagingService = new MessagingService(websocketService);

// Send a new message
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?.id;
    if (!senderId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      recipient_id,
      message_content,
      booking_id,
      thread_id,
      message_type,
      reply_to_message_id
    } = req.body;

    if (!recipient_id || !message_content) {
      return res.status(400).json({
        success: false,
        error: 'Recipient ID and message content are required'
      });
    }

    const result = await messagingService.sendMessage(
      senderId,
      recipient_id,
      message_content,
      {
        bookingId: booking_id,
        threadId: thread_id,
        messageType: message_type || 'text',
        replyToMessageId: reply_to_message_id
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Upload file for message attachment
export const uploadMessageFile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    // Validate file type and size
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'File type not supported'
      });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum 10MB allowed.'
      });
    }

    const result = await messagingService.handleFileUpload(file, userId);

    if (result.success) {
      res.json({
        success: true,
        fileInfo: result.fileInfo
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in uploadMessageFile controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Send message with file attachment
export const sendMessageWithFile = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?.id;
    if (!senderId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const file = req.file;
    const {
      recipient_id,
      message_content,
      booking_id,
      thread_id
    } = req.body;

    if (!recipient_id || !file) {
      return res.status(400).json({
        success: false,
        error: 'Recipient ID and file are required'
      });
    }

    // Upload file first
    const uploadResult = await messagingService.handleFileUpload(file, senderId);
    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        error: uploadResult.error
      });
    }

    // Determine message type based on file type
    const messageType = file.mimetype.startsWith('image/') ? 'image' : 'file';

    // Send message with attachment
    const result = await messagingService.sendMessage(
      senderId,
      recipient_id,
      message_content || `Shared a ${messageType}`,
      {
        bookingId: booking_id,
        threadId: thread_id,
        messageType,
        attachment: uploadResult.fileInfo
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendMessageWithFile controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get message history for a thread
export const getMessageHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { threadId } = req.params;
    const { limit, offset, before_message_id } = req.query;

    if (!threadId) {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
    }

    const result = await messagingService.getMessageHistory(
      threadId,
      userId,
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        beforeMessageId: before_message_id ? parseInt(before_message_id as string) : undefined
      }
    );

    if (result.success) {
      res.json({
        success: true,
        messages: result.messages,
        hasMore: result.hasMore
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in getMessageHistory controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get user's conversations
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { limit, offset } = req.query;

    const result = await messagingService.getConversations(
      userId,
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      }
    );

    if (result.success) {
      res.json({
        success: true,
        conversations: result.conversations
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in getConversations controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Search messages
export const searchMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      query,
      thread_id,
      message_type,
      date_from,
      date_to,
      limit,
      offset
    } = req.query;

    const result = await messagingService.searchMessages({
      user_id: userId,
      query: query as string,
      thread_id: thread_id as string,
      message_type: message_type as string,
      date_from: date_from as string,
      date_to: date_to as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    if (result.success) {
      res.json({
        success: true,
        messages: result.messages,
        totalCount: result.totalCount
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in searchMessages controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Mark message as read
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    const result = await messagingService.markMessageAsRead(
      parseInt(messageId),
      userId
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in markMessageAsRead controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Mark entire thread as read
export const markThreadAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
    }

    const result = await messagingService.markThreadAsRead(
      threadId,
      userId
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in markThreadAsRead controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Set typing indicator
export const setTypingIndicator = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { threadId } = req.params;
    const { isTyping } = req.body;

    if (!threadId) {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
    }

    messagingService.setTypingIndicator(
      userId,
      threadId,
      Boolean(isTyping)
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error in setTypingIndicator controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get typing indicators for a thread
export const getTypingIndicators = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
    }

    const indicators = messagingService.getTypingIndicators(threadId);

    res.json({
      success: true,
      indicators
    });
  } catch (error) {
    console.error('Error in getTypingIndicators controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Sync offline messages
export const syncOfflineMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { lastSyncTimestamp } = req.query;

    const result = await messagingService.syncOfflineMessages(
      userId,
      lastSyncTimestamp as string
    );

    if (result.success) {
      res.json({
        success: true,
        messages: result.messages,
        syncTimestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in syncOfflineMessages controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};