import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Message {
  id: number;
  sender_id: string;
  recipient_id: string;
  thread_id: string;
  message_content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  status: 'sent' | 'delivered' | 'read';
  sent_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  };
  attachment_url?: string;
  attachment_filename?: string;
}

interface Conversation {
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

interface TypingIndicator {
  user_id: string;
  thread_id: string;
  is_typing: boolean;
  timestamp: string;
}

interface MessagingSystemProps {
  userId: string;
  authToken?: string;
}

export const MessagingSystem: React.FC<MessagingSystemProps> = ({
  userId,
  authToken
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { socket, connected, sendMessage } = useWebSocket(
    process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:3001',
    authToken
  );

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle new messages
    const handleNewMessage = (messageData: any) => {
      if (messageData.thread_id === activeThread) {
        setMessages(prev => [...prev, messageData]);
        
        // Mark as read if thread is active
        markMessageAsRead(messageData.id);
      }
      
      // Update conversation list
      loadConversations();
    };

    // Handle typing indicators
    const handleTypingIndicator = (data: any) => {
      if (data.threadId === activeThread) {
        setTypingIndicators(prev => {
          const filtered = prev.filter(t => t.user_id !== data.userId);
          if (data.isTyping) {
            return [...filtered, {
              user_id: data.userId,
              thread_id: data.threadId,
              is_typing: data.isTyping,
              timestamp: data.timestamp
            }];
          }
          return filtered;
        });
      }
    };

    // Handle delivery confirmations
    const handleMessageDelivered = (data: any) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: 'delivered' as const }
          : msg
      ));
    };

    // Handle read confirmations
    const handleMessageRead = (data: any) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: 'read' as const }
          : msg
      ));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing_indicator', handleTypingIndicator);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing_indicator', handleTypingIndicator);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message_read', handleMessageRead);
    };
  }, [socket, activeThread]);

  // Join/leave thread rooms
  useEffect(() => {
    if (socket && activeThread) {
      socket.emit('join_thread', activeThread);
      
      return () => {
        socket.emit('leave_thread', activeThread);
      };
    }
  }, [socket, activeThread]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/messages/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = (threadId: string) => {
    setActiveThread(threadId);
    loadMessages(threadId);
    
    // Mark thread as read
    markThreadAsRead(threadId);
  };

  const sendNewMessage = async () => {
    if (!newMessage.trim() || !activeThread) return;

    const conversation = conversations.find(c => c.thread_id === activeThread);
    if (!conversation) return;

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: conversation.other_participant.id,
          message_content: newMessage,
          thread_id: activeThread
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // Clear typing indicator
        sendTypingIndicator(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      await fetch(`/api/messages/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markThreadAsRead = async (threadId: string) => {
    try {
      await fetch(`/api/messages/threads/${threadId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (socket && activeThread) {
      socket.emit('typing_indicator', {
        threadId: activeThread,
        isTyping
      });
    }
  }, [socket, activeThread]);

  const handleTyping = () => {
    sendTypingIndicator(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      default: return '';
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_participant.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find(c => c.thread_id === activeThread);
  const currentTypingUsers = typingIndicators
    .filter(t => t.is_typing && t.user_id !== userId)
    .map(t => {
      const conv = conversations.find(c => c.thread_id === t.thread_id);
      return conv?.other_participant.full_name || 'Someone';
    });

  return (
    <div className="h-full flex bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.thread_id}
              onClick={() => selectConversation(conversation.thread_id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                activeThread === conversation.thread_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                    {conversation.other_participant.avatar_url ? (
                      <img
                        src={conversation.other_participant.avatar_url}
                        alt={conversation.other_participant.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      conversation.other_participant.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {conversation.other_participant.full_name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(conversation.last_message.sent_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.last_message.content}
                    </p>
                    {conversation.booking_info && (
                      <p className="text-xs text-blue-600 mt-1">
                        Booking: {conversation.booking_info.service_name}
                      </p>
                    )}
                  </div>
                </div>
                {conversation.unread_count > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeThread && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                  {activeConversation.other_participant.avatar_url ? (
                    <img
                      src={activeConversation.other_participant.avatar_url}
                      alt={activeConversation.other_participant.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    activeConversation.other_participant.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">
                    {activeConversation.other_participant.full_name}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {activeConversation.other_participant.role}
                    {!connected && ' • Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading messages...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_id === userId
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {message.message_type === 'image' && message.attachment_url ? (
                          <img
                            src={message.attachment_url}
                            alt="Shared image"
                            className="max-w-full h-auto rounded"
                          />
                        ) : message.message_type === 'file' && message.attachment_url ? (
                          <a
                            href={message.attachment_url}
                            download={message.attachment_filename}
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            📄 {message.attachment_filename}
                          </a>
                        ) : (
                          <p>{message.message_content}</p>
                        )}
                        
                        <div className={`text-xs mt-1 ${
                          message.sender_id === userId ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTimestamp(message.sent_at)}
                          {message.sender_id === userId && (
                            <span className="ml-1">{getStatusIcon(message.status)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing indicator */}
                  {currentTypingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm">
                        {currentTypingUsers.join(', ')} {currentTypingUsers.length === 1 ? 'is' : 'are'} typing...
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendNewMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendNewMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingSystem;