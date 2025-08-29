-- =====================================================
-- REAL-TIME NOTIFICATIONS AND MESSAGING SYSTEM
-- Enhanced notification system with messaging infrastructure
-- =====================================================

-- Execute this AFTER running schema.sql
-- This enhances the basic notifications system with messaging and preferences

-- =====================================================
-- ENUMS FOR NOTIFICATIONS AND MESSAGING
-- =====================================================

-- Notification types
CREATE TYPE notification_type AS ENUM (
    'booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_completed',
    'provider_assigned', 'provider_arrived', 'provider_delayed',
    'payment_received', 'payment_failed', 'payout_processed',
    'review_received', 'rating_received', 'profile_updated',
    'document_approved', 'document_rejected', 'verification_complete',
    'message_received', 'system_announcement', 'maintenance_notice',
    'promotion_offer', 'reminder', 'general'
);

-- Notification delivery status
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- Message status
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'deleted');

-- Notification preferences
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');

-- =====================================================
-- ENHANCED NOTIFICATIONS SYSTEM
-- =====================================================

-- First, enhance the existing notifications table with new fields
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_type notification_type DEFAULT 'general',
ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delivery_status delivery_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_delivery_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[];

-- Update the type column to use the enum (if it doesn't conflict)
-- Note: This might require manual data migration in production
-- ALTER TABLE notifications ALTER COLUMN type TYPE notification_type USING type::notification_type;

-- Add indexes for enhanced notifications
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority DESC);

-- =====================================================
-- USER-TO-USER MESSAGING SYSTEM
-- =====================================================

-- Main messages table for user-to-user communication
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    thread_id UUID DEFAULT gen_random_uuid(), -- For grouping related messages
    
    -- Message content
    subject VARCHAR(200),
    message_content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, system
    
    -- Message status and tracking
    status message_status DEFAULT 'sent',
    is_system_message BOOLEAN DEFAULT false,
    reply_to_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    
    -- File attachments (if any)
    attachment_url TEXT,
    attachment_filename VARCHAR(200),
    attachment_size_bytes INTEGER,
    attachment_mime_type VARCHAR(100),
    
    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    deleted_by_sender_at TIMESTAMPTZ,
    deleted_by_recipient_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Message participants (for group messaging support)
CREATE TABLE message_participants (
    id SERIAL PRIMARY KEY,
    thread_id UUID NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    last_read_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT false,
    
    UNIQUE(thread_id, user_id)
);

-- Indexes for messaging system
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX idx_message_participants_user_id ON message_participants(user_id);

-- =====================================================
-- NOTIFICATION PREFERENCES
-- =====================================================

-- User notification preferences
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    
    -- Channel preferences
    in_app_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    
    -- Timing preferences
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Frequency preferences
    digest_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, hourly, daily, weekly
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, notification_type)
);

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Default notification preferences for new users
CREATE TABLE default_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_role user_role NOT NULL,
    notification_type notification_type NOT NULL,
    in_app_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    
    UNIQUE(user_role, notification_type)
);

-- Indexes for preferences
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_type ON notification_preferences(notification_type);
CREATE INDEX idx_default_notification_preferences_role ON default_notification_preferences(user_role);

-- =====================================================
-- NOTIFICATION AND MESSAGING FUNCTIONS
-- =====================================================

-- Function to create notification with proper settings
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR(200),
    p_message TEXT,
    p_notification_type notification_type DEFAULT 'general',
    p_booking_id INTEGER DEFAULT NULL,
    p_priority INTEGER DEFAULT 1,
    p_action_url TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    notification_id INTEGER;
    user_preferences RECORD;
    default_channels notification_channel[];
BEGIN
    -- Get user preferences for this notification type
    SELECT * FROM notification_preferences 
    WHERE user_id = p_user_id AND notification_type = p_notification_type
    INTO user_preferences;
    
    -- If no preferences set, use defaults based on user role
    IF user_preferences IS NULL THEN
        default_channels := ARRAY['in_app']::notification_channel[];
    ELSE
        default_channels := ARRAY[]::notification_channel[];
        IF user_preferences.in_app_enabled THEN
            default_channels := array_append(default_channels, 'in_app');
        END IF;
        IF user_preferences.email_enabled THEN
            default_channels := array_append(default_channels, 'email');
        END IF;
        IF user_preferences.sms_enabled THEN
            default_channels := array_append(default_channels, 'sms');
        END IF;
        IF user_preferences.push_enabled THEN
            default_channels := array_append(default_channels, 'push');
        END IF;
    END IF;
    
    -- Create the notification
    INSERT INTO notifications (
        user_id, title, message, notification_type, booking_id, 
        priority, action_url, expires_at, metadata, channels
    ) VALUES (
        p_user_id, p_title, p_message, p_notification_type, p_booking_id,
        p_priority, p_action_url, p_expires_at, p_metadata, default_channels
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send message between users
CREATE OR REPLACE FUNCTION send_message(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_message_content TEXT,
    p_booking_id INTEGER DEFAULT NULL,
    p_subject VARCHAR(200) DEFAULT NULL,
    p_thread_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    message_id INTEGER;
    new_thread_id UUID;
BEGIN
    -- Generate thread_id if not provided
    IF p_thread_id IS NULL THEN
        new_thread_id := gen_random_uuid();
    ELSE
        new_thread_id := p_thread_id;
    END IF;
    
    -- Insert the message
    INSERT INTO messages (
        sender_id, recipient_id, booking_id, thread_id,
        subject, message_content
    ) VALUES (
        p_sender_id, p_recipient_id, p_booking_id, new_thread_id,
        p_subject, p_message_content
    ) RETURNING id INTO message_id;
    
    -- Create notification for recipient
    PERFORM create_notification(
        p_recipient_id,
        COALESCE(p_subject, 'New Message'),
        'You have received a new message.',
        'message_received',
        p_booking_id,
        2, -- medium priority
        '/messages/' || new_thread_id
    );
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(p_message_id INTEGER, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE messages 
    SET status = 'read',
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = p_message_id 
    AND recipient_id = p_user_id
    AND status != 'read';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM messages
    WHERE recipient_id = p_user_id
    AND status != 'read'
    AND deleted_by_recipient_at IS NULL;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATIC NOTIFICATION TRIGGERS
-- =====================================================

-- Function to send booking status notifications
CREATE OR REPLACE FUNCTION notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
    customer_title TEXT;
    provider_title TEXT;
    customer_message TEXT;
    provider_message TEXT;
    notification_type_val notification_type;
BEGIN
    -- Determine notification content based on status change
    CASE NEW.status
        WHEN 'confirmed' THEN
            notification_type_val := 'booking_confirmed';
            customer_title := 'Booking Confirmed';
            customer_message := 'Your service booking has been confirmed by the provider.';
            provider_title := 'Booking Confirmed';
            provider_message := 'You have confirmed a new booking.';
            
        WHEN 'cancelled' THEN
            notification_type_val := 'booking_cancelled';
            customer_title := 'Booking Cancelled';
            customer_message := 'Your service booking has been cancelled.';
            provider_title := 'Booking Cancelled';
            provider_message := 'A booking has been cancelled.';
            
        WHEN 'completed' THEN
            notification_type_val := 'booking_completed';
            customer_title := 'Service Completed';
            customer_message := 'Your service has been completed. Please leave a review!';
            provider_title := 'Service Completed';
            provider_message := 'You have completed a service booking.';
            
        WHEN 'in_progress' THEN
            notification_type_val := 'provider_assigned';
            customer_title := 'Service in Progress';
            customer_message := 'Your service provider has started the job.';
            provider_title := 'Job Started';
            provider_message := 'You have started the job.';
            
        ELSE
            RETURN NEW; -- No notification for other status changes
    END CASE;
    
    -- Send notification to customer
    IF NEW.customer_id IS NOT NULL THEN
        PERFORM create_notification(
            NEW.customer_id,
            customer_title,
            customer_message,
            notification_type_val,
            NEW.id,
            2, -- medium priority
            '/bookings/' || NEW.id
        );
    END IF;
    
    -- Send notification to provider
    IF NEW.provider_id IS NOT NULL THEN
        PERFORM create_notification(
            NEW.provider_id,
            provider_title,
            provider_message,
            notification_type_val,
            NEW.id,
            2, -- medium priority
            '/provider/bookings/' || NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking status changes
CREATE TRIGGER notify_booking_status_change_trigger
    AFTER UPDATE OF status ON bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_booking_status_change();

-- Function to notify when new review is received
CREATE OR REPLACE FUNCTION notify_review_received()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify the reviewee about the new review
    PERFORM create_notification(
        NEW.reviewee_id,
        'New Review Received',
        'You have received a new review with ' || NEW.rating || ' stars.',
        'review_received',
        NEW.booking_id,
        2, -- medium priority
        '/profile/reviews'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new reviews
CREATE TRIGGER notify_review_received_trigger
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_review_received();

-- Function to setup default notification preferences for new users
CREATE OR REPLACE FUNCTION setup_default_notification_preferences()
RETURNS TRIGGER AS $$
DECLARE
    default_pref RECORD;
BEGIN
    -- Insert default preferences based on user role
    FOR default_pref IN 
        SELECT * FROM default_notification_preferences 
        WHERE user_role = NEW.role
    LOOP
        INSERT INTO notification_preferences (
            user_id, notification_type, in_app_enabled, email_enabled, 
            sms_enabled, push_enabled
        ) VALUES (
            NEW.id, default_pref.notification_type, default_pref.in_app_enabled,
            default_pref.email_enabled, default_pref.sms_enabled, default_pref.push_enabled
        ) ON CONFLICT (user_id, notification_type) DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to setup preferences for new users
CREATE TRIGGER setup_default_notification_preferences_trigger
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION setup_default_notification_preferences();

-- =====================================================
-- RLS POLICIES FOR MESSAGING AND NOTIFICATIONS
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Messages Policies
CREATE POLICY "Users can view messages they sent or received" ON messages 
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = recipient_id OR
        -- Allow if user is participant in the thread
        EXISTS (
            SELECT 1 FROM message_participants 
            WHERE thread_id = messages.thread_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages" ON messages 
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own sent messages" ON messages 
    FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read" ON messages 
    FOR UPDATE USING (
        auth.uid() = recipient_id AND 
        OLD.status != NEW.status AND 
        NEW.status IN ('delivered', 'read')
    );

-- Message Participants Policies
CREATE POLICY "Users can view threads they participate in" ON message_participants 
    FOR SELECT USING (auth.uid() = user_id);

-- Notification Preferences Policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences 
    FOR ALL USING (auth.uid() = user_id);

-- Enhanced Notifications Policies (update existing)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications 
    FOR SELECT USING (
        auth.uid() = user_id AND 
        (expires_at IS NULL OR expires_at > NOW())
    );

CREATE POLICY "Users can update their own notifications" ON notifications 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications 
    FOR INSERT WITH CHECK (true); -- Allow system to create notifications

-- =====================================================
-- DEFAULT NOTIFICATION PREFERENCES DATA
-- =====================================================

-- Insert default preferences for different user roles
INSERT INTO default_notification_preferences (user_role, notification_type, in_app_enabled, email_enabled, sms_enabled, push_enabled) VALUES
-- Customer defaults
('customer', 'booking_confirmed', true, true, false, true),
('customer', 'booking_cancelled', true, true, true, true),
('customer', 'booking_completed', true, true, false, true),
('customer', 'provider_assigned', true, true, false, true),
('customer', 'provider_arrived', true, false, true, true),
('customer', 'payment_received', true, true, false, false),
('customer', 'payment_failed', true, true, true, true),
('customer', 'review_received', true, true, false, true),
('customer', 'message_received', true, true, false, true),

-- Provider defaults
('provider', 'booking_created', true, true, false, true),
('provider', 'booking_confirmed', true, true, false, true),
('provider', 'booking_cancelled', true, true, false, true),
('provider', 'booking_completed', true, true, false, true),
('provider', 'payout_processed', true, true, false, false),
('provider', 'review_received', true, true, false, true),
('provider', 'rating_received', true, true, false, true),
('provider', 'document_approved', true, true, false, true),
('provider', 'document_rejected', true, true, true, true),
('provider', 'verification_complete', true, true, true, true),
('provider', 'message_received', true, true, false, true),

-- Admin defaults
('admin', 'system_announcement', true, true, false, true),
('admin', 'maintenance_notice', true, true, false, false),
('admin', 'message_received', true, true, false, true)

ON CONFLICT (user_role, notification_type) DO NOTHING;

-- Display completion message
SELECT 'Real-time notifications and messaging system completed successfully!' AS status;
SELECT 'Enhanced notifications with delivery tracking, user-to-user messaging, and preference management.' AS features_added;