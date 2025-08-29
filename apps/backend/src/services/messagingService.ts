import { supabase } from '../config/supabase';
import { WebSocketService } from './websocket';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: number;
  sender_id: string;
  recipient_id: string;
  booking_id?: number;
  thread_id: string;
  subject?: string;
  message_content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  status: 'sent' | 'delivered' | 'read' | 'deleted';
  is_system_message: boolean;
  reply_to_message_id?: number;
  attachment_url?: string;
  attachment_filename?: string;
  attachment_size_bytes?: number;
  attachment_mime_type?: string;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  deleted_by_sender_at?: string;
  deleted_by_recipient_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageThread {
  thread_id: string;
  participants: string[];
  last_message: Message | null;
  unread_count: number;
  last_activity: string;
  booking_id?: number;
}

export interface TypingIndicator {
  user_id: string;
  thread_id: string;
  is_typing: boolean;
  timestamp: string;
}

export interface MessageSearchParams {
  user_id: string;
  query?: string;
  thread_id?: string;
  message_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ConversationPreview {
  thread_id: string;
  other_participant: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  };
  last_message: {
    content: string;
    sent_at: string;
    sender_id: string;
    message_type: string;
  };
  unread_count: number;
  booking_info?: {
    id: number;
    service_name: string;
    status: string;
  };
}

export class MessagingService {
  private websocketService?: WebSocketService;
  private typingIndicators: Map<string, Map<string, TypingIndicator>> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(websocketService?: WebSocketService) {
    this.websocketService = websocketService;
    this.startTypingCleanup();
  }

  private startTypingCleanup() {
    // Clean up old typing indicators every 10 seconds
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 10000); // 10 seconds ago
      
      for (const [threadId, indicators] of this.typingIndicators) {
        for (const [userId, indicator] of indicators) {
          if (new Date(indicator.timestamp) < cutoffTime) {
            indicators.delete(userId);
            this.broadcastTypingIndicators(threadId);
          }
        }
        
        if (indicators.size === 0) {
          this.typingIndicators.delete(threadId);
        }
      }
    }, 10000);
  }

  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    options: {
      bookingId?: number;
      threadId?: string;
      messageType?: 'text' | 'image' | 'file' | 'system';
      replyToMessageId?: number;
      attachment?: {
        url: string;
        filename: string;
        size: number;
        mimeType: string;
      };
    } = {}
  ): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      // Generate thread ID if not provided
      const threadId = options.threadId || await this.getOrCreateThread(senderId, recipientId, options.bookingId);

      // Create message record
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          booking_id: options.bookingId,
          thread_id: threadId,
          message_content: content,
          message_type: options.messageType || 'text',
          status: 'sent',
          is_system_message: options.messageType === 'system',
          reply_to_message_id: options.replyToMessageId,
          attachment_url: options.attachment?.url,
          attachment_filename: options.attachment?.filename,
          attachment_size_bytes: options.attachment?.size,
          attachment_mime_type: options.attachment?.mimeType
        })
        .select(`
          *,
          sender:user_profiles!sender_id(id, full_name, avatar_url, role),
          recipient:user_profiles!recipient_id(id, full_name, avatar_url, role)
        `)
        .single();

      if (error) {
        console.error('Error creating message:', error);
        return { success: false, error: error.message };
      }

      // Update thread participants
      await this.updateThreadParticipants(threadId, [senderId, recipientId]);

      // Send real-time notification to recipient
      if (this.websocketService) {
        await this.sendRealTimeMessage(message);
      }

      // Mark message as delivered if recipient is online
      if (this.websocketService && this.websocketService.isUserConnected(recipientId)) {
        await this.markMessageAsDelivered(message.id, recipientId);
      }

      console.log(`💬 Message sent from ${senderId} to ${recipientId} in thread ${threadId}`);
      
      return { success: true, message };

    } catch (error) {
      console.error('Error in sendMessage:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  private async getOrCreateThread(
    user1Id: string, 
    user2Id: string, 
    bookingId?: number
  ): Promise<string> {
    // First try to find existing thread between these users
    const { data: existingThread } = await supabase
      .from('message_participants')
      .select('thread_id')
      .in('user_id', [user1Id, user2Id])
      .group('thread_id')
      .having('count(*)', 'eq', 2)
      .limit(1)
      .single();

    if (existingThread) {
      return existingThread.thread_id;
    }

    // Create new thread
    const threadId = uuidv4();
    
    // Add both participants to the thread
    await supabase
      .from('message_participants')
      .insert([
        { thread_id: threadId, user_id: user1Id },
        { thread_id: threadId, user_id: user2Id }
      ]);

    return threadId;
  }

  private async updateThreadParticipants(threadId: string, participantIds: string[]) {
    for (const userId of participantIds) {
      await supabase
        .from('message_participants')
        .upsert({
          thread_id: threadId,
          user_id: userId
        }, {
          onConflict: 'thread_id,user_id'
        });
    }
  }

  private async sendRealTimeMessage(message: any) {
    if (!this.websocketService) return;

    const messageData = {
      id: message.id,
      thread_id: message.thread_id,
      sender: message.sender,
      recipient: message.recipient,
      content: message.message_content,
      message_type: message.message_type,
      sent_at: message.sent_at,
      booking_id: message.booking_id,
      attachment: message.attachment_url ? {
        url: message.attachment_url,
        filename: message.attachment_filename,
        size: message.attachment_size_bytes,
        mime_type: message.attachment_mime_type
      } : null
    };

    // Send to recipient
    this.websocketService.sendMessage(
      `user:${message.recipient_id}`,
      'new_message',
      messageData
    );

    // Send to sender (for multi-device sync)
    this.websocketService.sendMessage(
      `user:${message.sender_id}`,
      'message_sent_confirmation',
      messageData
    );

    // Clear typing indicator for sender
    this.clearTypingIndicator(message.sender_id, message.thread_id);
  }

  async markMessageAsDelivered(
    messageId: number,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('recipient_id', userId);

      if (error) {
        console.error('Error marking message as delivered:', error);
        return { success: false, error: error.message };
      }

      // Notify sender of delivery
      if (this.websocketService) {
        const { data: message } = await supabase
          .from('messages')
          .select('sender_id, thread_id')
          .eq('id', messageId)
          .single();

        if (message) {
          this.websocketService.sendMessage(
            `user:${message.sender_id}`,
            'message_delivered',
            { messageId, threadId: message.thread_id, deliveredAt: new Date().toISOString() }
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markMessageAsDelivered:', error);
      return { success: false, error: 'Failed to mark message as delivered' };
    }
  }

  async markMessageAsRead(
    messageId: number,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('recipient_id', userId);

      if (error) {
        console.error('Error marking message as read:', error);
        return { success: false, error: error.message };
      }

      // Update thread participant's last read time
      const { data: message } = await supabase
        .from('messages')
        .select('thread_id, sender_id')
        .eq('id', messageId)
        .single();

      if (message) {
        await supabase
          .from('message_participants')
          .update({
            last_read_at: new Date().toISOString()
          })
          .eq('thread_id', message.thread_id)
          .eq('user_id', userId);

        // Notify sender of read receipt
        if (this.websocketService) {
          this.websocketService.sendMessage(
            `user:${message.sender_id}`,
            'message_read',
            { messageId, threadId: message.thread_id, readAt: new Date().toISOString() }
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markMessageAsRead:', error);
      return { success: false, error: 'Failed to mark message as read' };
    }
  }

  async markThreadAsRead(
    threadId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Mark all unread messages as read
      const { error: messagesError } = await supabase
        .from('messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('thread_id', threadId)
        .eq('recipient_id', userId)
        .in('status', ['sent', 'delivered']);

      if (messagesError) {
        console.error('Error marking messages as read:', messagesError);
        return { success: false, error: messagesError.message };
      }

      // Update participant's last read time
      const { error: participantError } = await supabase
        .from('message_participants')
        .update({
          last_read_at: new Date().toISOString()
        })
        .eq('thread_id', threadId)
        .eq('user_id', userId);

      if (participantError) {
        console.error('Error updating participant read time:', participantError);
        return { success: false, error: participantError.message };
      }

      // Notify other participants
      if (this.websocketService) {
        const participants = await this.getThreadParticipants(threadId);
        const otherParticipants = participants.filter(p => p !== userId);
        
        for (const participantId of otherParticipants) {
          this.websocketService.sendMessage(
            `user:${participantId}`,
            'thread_read',
            { threadId, userId, readAt: new Date().toISOString() }
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markThreadAsRead:', error);
      return { success: false, error: 'Failed to mark thread as read' };
    }
  }

  async getMessageHistory(
    threadId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      beforeMessageId?: number;
    } = {}
  ): Promise<{ success: boolean; messages?: Message[]; hasMore?: boolean; error?: string }> {
    try {
      // Verify user is participant in thread
      const { data: participant } = await supabase
        .from('message_participants')
        .select('user_id')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .single();

      if (!participant) {
        return { success: false, error: 'Access denied' };
      }

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!sender_id(id, full_name, avatar_url, role),
          recipient:user_profiles!recipient_id(id, full_name, avatar_url, role),
          reply_to:messages!reply_to_message_id(id, message_content, sender_id)
        `)
        .eq('thread_id', threadId)
        .order('sent_at', { ascending: false });

      if (options.beforeMessageId) {
        const { data: beforeMessage } = await supabase
          .from('messages')
          .select('sent_at')
          .eq('id', options.beforeMessageId)
          .single();

        if (beforeMessage) {
          query = query.lt('sent_at', beforeMessage.sent_at);
        }
      }

      const limit = options.limit || 50;
      query = query.limit(limit + 1); // Get one extra to check if there are more

      const { data: messages, error } = await query;

      if (error) {
        console.error('Error fetching message history:', error);
        return { success: false, error: error.message };
      }

      const hasMore = messages.length > limit;
      const finalMessages = hasMore ? messages.slice(0, -1) : messages;

      // Reverse to get chronological order
      finalMessages.reverse();

      return {
        success: true,
        messages: finalMessages as Message[],
        hasMore
      };
    } catch (error) {
      console.error('Error in getMessageHistory:', error);
      return { success: false, error: 'Failed to fetch message history' };
    }
  }

  async getConversations(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ success: boolean; conversations?: ConversationPreview[]; error?: string }> {
    try {
      const { data: conversations, error } = await supabase
        .from('message_participants')
        .select(`
          thread_id,
          messages!thread_id (
            id,
            sender_id,
            message_content,
            message_type,
            sent_at,
            booking_id
          ),
          other_participant:message_participants!thread_id (
            user:user_profiles!user_id (
              id,
              full_name,
              avatar_url,
              role
            )
          ),
          booking:bookings (
            id,
            services (name),
            status
          )
        `)
        .eq('user_id', userId)
        .order('messages.sent_at', { ascending: false })
        .limit(options.limit || 20);

      if (error) {
        console.error('Error fetching conversations:', error);
        return { success: false, error: error.message };
      }

      // Process and format conversations
      const formattedConversations: ConversationPreview[] = [];
      
      for (const conv of conversations || []) {
        const otherParticipant = conv.other_participant?.find(
          (p: any) => p.user.id !== userId
        )?.user;

        if (!otherParticipant) continue;

        const lastMessage = conv.messages?.[0];
        if (!lastMessage) continue;

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('thread_id', conv.thread_id)
          .eq('recipient_id', userId)
          .in('status', ['sent', 'delivered']);

        formattedConversations.push({
          thread_id: conv.thread_id,
          other_participant: {
            id: otherParticipant.id,
            full_name: otherParticipant.full_name,
            avatar_url: otherParticipant.avatar_url,
            role: otherParticipant.role
          },
          last_message: {
            content: lastMessage.message_content,
            sent_at: lastMessage.sent_at,
            sender_id: lastMessage.sender_id,
            message_type: lastMessage.message_type
          },
          unread_count: unreadCount || 0,
          booking_info: conv.booking ? {
            id: conv.booking.id,
            service_name: conv.booking.services?.name,
            status: conv.booking.status
          } : undefined
        });
      }

      return {
        success: true,
        conversations: formattedConversations
      };
    } catch (error) {
      console.error('Error in getConversations:', error);
      return { success: false, error: 'Failed to fetch conversations' };
    }
  }

  async searchMessages(
    params: MessageSearchParams
  ): Promise<{ success: boolean; messages?: Message[]; totalCount?: number; error?: string }> {
    try {
      // Build search query
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!sender_id(id, full_name, avatar_url, role),
          recipient:user_profiles!recipient_id(id, full_name, avatar_url, role)
        `, { count: 'exact' })
        .or(`sender_id.eq.${params.user_id},recipient_id.eq.${params.user_id}`);

      if (params.query) {
        query = query.ilike('message_content', `%${params.query}%`);
      }

      if (params.thread_id) {
        query = query.eq('thread_id', params.thread_id);
      }

      if (params.message_type) {
        query = query.eq('message_type', params.message_type);
      }

      if (params.date_from) {
        query = query.gte('sent_at', params.date_from);
      }

      if (params.date_to) {
        query = query.lte('sent_at', params.date_to);
      }

      query = query.order('sent_at', { ascending: false });

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
      }

      const { data: messages, error, count } = await query;

      if (error) {
        console.error('Error searching messages:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        messages: messages as Message[],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('Error in searchMessages:', error);
      return { success: false, error: 'Failed to search messages' };
    }
  }

  // Typing indicators
  setTypingIndicator(
    userId: string,
    threadId: string,
    isTyping: boolean
  ): void {
    if (!this.typingIndicators.has(threadId)) {
      this.typingIndicators.set(threadId, new Map());
    }

    const threadIndicators = this.typingIndicators.get(threadId)!;
    const indicatorKey = userId;

    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(`${threadId}:${userId}`);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingTimeouts.delete(`${threadId}:${userId}`);
    }

    if (isTyping) {
      threadIndicators.set(indicatorKey, {
        user_id: userId,
        thread_id: threadId,
        is_typing: true,
        timestamp: new Date().toISOString()
      });

      // Auto-clear typing indicator after 5 seconds
      const timeout = setTimeout(() => {
        this.clearTypingIndicator(userId, threadId);
      }, 5000);

      this.typingTimeouts.set(`${threadId}:${userId}`, timeout);
    } else {
      threadIndicators.delete(indicatorKey);
    }

    this.broadcastTypingIndicators(threadId);
  }

  private clearTypingIndicator(userId: string, threadId: string): void {
    const threadIndicators = this.typingIndicators.get(threadId);
    if (threadIndicators) {
      threadIndicators.delete(userId);
      this.broadcastTypingIndicators(threadId);
    }

    // Clear timeout
    const timeoutKey = `${threadId}:${userId}`;
    const timeout = this.typingTimeouts.get(timeoutKey);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(timeoutKey);
    }
  }

  private async broadcastTypingIndicators(threadId: string): Promise<void> {
    if (!this.websocketService) return;

    const threadIndicators = this.typingIndicators.get(threadId);
    const indicators = threadIndicators ? Array.from(threadIndicators.values()) : [];

    const participants = await this.getThreadParticipants(threadId);
    
    for (const participantId of participants) {
      this.websocketService.sendMessage(
        `user:${participantId}`,
        'typing_indicators',
        { threadId, indicators }
      );
    }
  }

  private async getThreadParticipants(threadId: string): Promise<string[]> {
    const { data: participants } = await supabase
      .from('message_participants')
      .select('user_id')
      .eq('thread_id', threadId);

    return participants?.map(p => p.user_id) || [];
  }

  getTypingIndicators(threadId: string): TypingIndicator[] {
    const threadIndicators = this.typingIndicators.get(threadId);
    return threadIndicators ? Array.from(threadIndicators.values()) : [];
  }

  // File upload support
  async handleFileUpload(
    file: any,
    userId: string
  ): Promise<{ success: boolean; fileInfo?: any; error?: string }> {
    try {
      // This would integrate with a file storage service (AWS S3, Cloudinary, etc.)
      // For now, we'll simulate the upload process
      
      const fileId = uuidv4();
      const filename = file.originalname || file.name;
      const mimeType = file.mimetype || file.type;
      const size = file.size;
      
      // Simulate file upload to storage service
      const fileUrl = `https://storage.rayshine.com/messages/${userId}/${fileId}/${filename}`;
      
      console.log(`📁 File uploaded: ${filename} (${size} bytes) for user ${userId}`);
      
      return {
        success: true,
        fileInfo: {
          url: fileUrl,
          filename,
          size,
          mimeType
        }
      };
    } catch (error) {
      console.error('Error handling file upload:', error);
      return { success: false, error: 'Failed to upload file' };
    }
  }

  // Offline message synchronization
  async syncOfflineMessages(
    userId: string,
    lastSyncTimestamp?: string
  ): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!sender_id(id, full_name, avatar_url, role),
          recipient:user_profiles!recipient_id(id, full_name, avatar_url, role)
        `)
        .eq('recipient_id', userId)
        .order('sent_at', { ascending: false });

      if (lastSyncTimestamp) {
        query = query.gt('sent_at', lastSyncTimestamp);
      }

      const { data: messages, error } = await query;

      if (error) {
        console.error('Error syncing offline messages:', error);
        return { success: false, error: error.message };
      }

      // Mark synced messages as delivered
      if (messages && messages.length > 0) {
        const messageIds = messages.map(m => m.id);
        await supabase
          .from('messages')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .in('id', messageIds)
          .eq('status', 'sent');
      }

      return {
        success: true,
        messages: messages as Message[]
      };
    } catch (error) {
      console.error('Error in syncOfflineMessages:', error);
      return { success: false, error: 'Failed to sync offline messages' };
    }
  }

  // Cleanup and utility methods
  public cleanup(): void {
    console.log('🧹 Cleaning up Messaging Service...');
    
    // Clear all typing timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();
    this.typingIndicators.clear();
    
    console.log('✅ Messaging Service cleanup complete');
  }
}