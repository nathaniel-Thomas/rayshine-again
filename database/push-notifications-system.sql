-- Push Notifications System Schema
-- Extends the existing notification system with push notification support

-- Table for storing push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    
    -- Ensure one subscription per user (can be updated)
    UNIQUE(user_id)
);

-- Indexes for push subscriptions
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Enhanced notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Main toggle
    enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Category preferences
    job_assignment BOOLEAN NOT NULL DEFAULT true,
    booking_updates BOOLEAN NOT NULL DEFAULT true,
    messages BOOLEAN NOT NULL DEFAULT true,
    system_alerts BOOLEAN NOT NULL DEFAULT true,
    payment_updates BOOLEAN NOT NULL DEFAULT true,
    provider_status BOOLEAN NOT NULL DEFAULT false,
    
    -- Behavior preferences
    sound BOOLEAN NOT NULL DEFAULT true,
    vibration BOOLEAN NOT NULL DEFAULT true,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Indexes for notification preferences
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Table for tracking notification delivery and interactions
CREATE TABLE IF NOT EXISTS push_notification_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subscription_id BIGINT REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    
    -- Notification details
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system_alert',
    tag VARCHAR(100),
    
    -- Delivery status
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'expired')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Interaction tracking
    clicked BOOLEAN NOT NULL DEFAULT false,
    clicked_at TIMESTAMPTZ,
    action_taken VARCHAR(50), -- 'view', 'accept', 'decline', etc.
    
    -- Metadata
    payload JSONB,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notification logs
CREATE INDEX idx_push_logs_user_id ON push_notification_logs(user_id);
CREATE INDEX idx_push_logs_status ON push_notification_logs(status);
CREATE INDEX idx_push_logs_type ON push_notification_logs(type);
CREATE INDEX idx_push_logs_sent_at ON push_notification_logs(sent_at DESC);
CREATE INDEX idx_push_logs_clicked ON push_notification_logs(clicked, clicked_at) WHERE clicked = true;

-- Table for scheduled/delayed notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system_alert',
    payload JSONB DEFAULT '{}',
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    error_message TEXT
);

-- Indexes for scheduled notifications
CREATE INDEX idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX idx_scheduled_notifications_pending ON scheduled_notifications(scheduled_for, status) 
    WHERE status = 'pending';

-- Functions for push notification system

-- Function to get user's notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE(
    enabled BOOLEAN,
    job_assignment BOOLEAN,
    booking_updates BOOLEAN,
    messages BOOLEAN,
    system_alerts BOOLEAN,
    payment_updates BOOLEAN,
    provider_status BOOLEAN,
    sound BOOLEAN,
    vibration BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(np.enabled, true) as enabled,
        COALESCE(np.job_assignment, true) as job_assignment,
        COALESCE(np.booking_updates, true) as booking_updates,
        COALESCE(np.messages, true) as messages,
        COALESCE(np.system_alerts, true) as system_alerts,
        COALESCE(np.payment_updates, true) as payment_updates,
        COALESCE(np.provider_status, false) as provider_status,
        COALESCE(np.sound, true) as sound,
        COALESCE(np.vibration, true) as vibration,
        COALESCE(np.quiet_hours_enabled, false) as quiet_hours_enabled,
        COALESCE(np.quiet_hours_start, '22:00:00'::TIME) as quiet_hours_start,
        COALESCE(np.quiet_hours_end, '08:00:00'::TIME) as quiet_hours_end,
        COALESCE(np.timezone, 'UTC') as timezone
    FROM user_profiles up
    LEFT JOIN notification_preferences np ON up.id = np.user_id
    WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user should receive notification (considering quiet hours)
CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id UUID,
    p_notification_type VARCHAR(50),
    p_is_urgent BOOLEAN DEFAULT false
) RETURNS BOOLEAN AS $$
DECLARE
    user_prefs RECORD;
    current_time_in_timezone TIME;
    is_quiet_hour BOOLEAN := false;
BEGIN
    -- Get user preferences
    SELECT * INTO user_prefs FROM get_user_notification_preferences(p_user_id);
    
    -- Check if notifications are enabled
    IF NOT user_prefs.enabled THEN
        RETURN false;
    END IF;
    
    -- Check category preferences
    CASE p_notification_type
        WHEN 'job_assignment' THEN
            IF NOT user_prefs.job_assignment THEN RETURN false; END IF;
        WHEN 'booking_updates' THEN
            IF NOT user_prefs.booking_updates THEN RETURN false; END IF;
        WHEN 'messages' THEN
            IF NOT user_prefs.messages THEN RETURN false; END IF;
        WHEN 'system_alerts' THEN
            IF NOT user_prefs.system_alerts THEN RETURN false; END IF;
        WHEN 'payment_updates' THEN
            IF NOT user_prefs.payment_updates THEN RETURN false; END IF;
        WHEN 'provider_status' THEN
            IF NOT user_prefs.provider_status THEN RETURN false; END IF;
    END CASE;
    
    -- Check quiet hours (unless urgent)
    IF user_prefs.quiet_hours_enabled AND NOT p_is_urgent THEN
        -- Convert current time to user's timezone
        current_time_in_timezone := (now() AT TIME ZONE user_prefs.timezone)::TIME;
        
        -- Check if current time is within quiet hours
        IF user_prefs.quiet_hours_start <= user_prefs.quiet_hours_end THEN
            -- Same day quiet hours
            is_quiet_hour := current_time_in_timezone >= user_prefs.quiet_hours_start 
                            AND current_time_in_timezone <= user_prefs.quiet_hours_end;
        ELSE
            -- Quiet hours span midnight
            is_quiet_hour := current_time_in_timezone >= user_prefs.quiet_hours_start 
                            OR current_time_in_timezone <= user_prefs.quiet_hours_end;
        END IF;
        
        IF is_quiet_hour THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to log notification delivery
CREATE OR REPLACE FUNCTION log_push_notification(
    p_user_id UUID,
    p_subscription_id BIGINT,
    p_title VARCHAR(255),
    p_body TEXT,
    p_type VARCHAR(50),
    p_tag VARCHAR(100) DEFAULT NULL,
    p_payload JSONB DEFAULT '{}',
    p_status VARCHAR(20) DEFAULT 'sent',
    p_error_message TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    log_id BIGINT;
BEGIN
    INSERT INTO push_notification_logs (
        user_id,
        subscription_id,
        title,
        body,
        type,
        tag,
        payload,
        status,
        error_message
    ) VALUES (
        p_user_id,
        p_subscription_id,
        p_title,
        p_body,
        p_type,
        p_tag,
        p_payload,
        p_status,
        p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update notification interaction
CREATE OR REPLACE FUNCTION update_notification_interaction(
    p_log_id BIGINT,
    p_clicked BOOLEAN DEFAULT true,
    p_action_taken VARCHAR(50) DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE push_notification_logs
    SET 
        clicked = p_clicked,
        clicked_at = CASE WHEN p_clicked THEN now() ELSE clicked_at END,
        action_taken = p_action_taken
    WHERE id = p_log_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notification logs
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM push_notification_logs
    WHERE created_at < now() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE OR REPLACE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics and reporting

-- View for notification delivery statistics
CREATE OR REPLACE VIEW notification_delivery_stats AS
SELECT 
    DATE_TRUNC('day', sent_at) as date,
    type,
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN clicked = true THEN 1 END) as clicked_count,
    ROUND(
        COUNT(CASE WHEN clicked = true THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*)::DECIMAL, 0) * 100, 2
    ) as click_through_rate
FROM push_notification_logs
WHERE sent_at >= now() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', sent_at), type, status
ORDER BY date DESC, type;

-- View for user notification engagement
CREATE OR REPLACE VIEW user_notification_engagement AS
SELECT 
    up.id as user_id,
    up.full_name,
    up.role,
    COUNT(pnl.id) as total_notifications,
    COUNT(CASE WHEN pnl.clicked = true THEN 1 END) as clicked_notifications,
    ROUND(
        COUNT(CASE WHEN pnl.clicked = true THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(pnl.id)::DECIMAL, 0) * 100, 2
    ) as engagement_rate,
    MAX(pnl.sent_at) as last_notification_sent,
    ps.is_active as has_active_subscription
FROM user_profiles up
LEFT JOIN push_notification_logs pnl ON up.id = pnl.user_id
LEFT JOIN push_subscriptions ps ON up.id = ps.user_id
WHERE pnl.sent_at >= now() - INTERVAL '30 days' OR pnl.sent_at IS NULL
GROUP BY up.id, up.full_name, up.role, ps.is_active
ORDER BY engagement_rate DESC NULLS LAST;

-- Row Level Security Policies

-- Push subscriptions - users can only access their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_subscriptions_user_policy ON push_subscriptions
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Notification preferences - users can only access their own preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_preferences_user_policy ON notification_preferences
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Notification logs - users can see their own logs, admins can see all
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_notification_logs_user_policy ON push_notification_logs
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Scheduled notifications - admins can manage, users can see their own
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY scheduled_notifications_policy ON scheduled_notifications
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON push_notification_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_notifications TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE push_subscriptions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notification_preferences_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE push_notification_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE scheduled_notifications_id_seq TO authenticated;

-- Initial data setup
INSERT INTO notification_preferences (user_id, enabled, job_assignment, booking_updates, messages, system_alerts, payment_updates, provider_status)
SELECT 
    id, 
    true, -- enabled by default
    true, -- job_assignment
    true, -- booking_updates  
    true, -- messages
    true, -- system_alerts
    true, -- payment_updates
    CASE WHEN role = 'admin' THEN true ELSE false END -- provider_status (admin only by default)
FROM user_profiles 
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE user_id = user_profiles.id
);

-- Comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores push notification endpoint subscriptions for users';
COMMENT ON TABLE notification_preferences IS 'User preferences for different types of notifications';
COMMENT ON TABLE push_notification_logs IS 'Tracks delivery and interaction with push notifications';
COMMENT ON TABLE scheduled_notifications IS 'Queue for delayed/scheduled notification delivery';

COMMENT ON FUNCTION should_send_notification IS 'Checks if a notification should be sent based on user preferences and quiet hours';
COMMENT ON FUNCTION log_push_notification IS 'Creates a log entry for a sent push notification';
COMMENT ON FUNCTION update_notification_interaction IS 'Updates notification log with user interaction data';

COMMENT ON VIEW notification_delivery_stats IS 'Daily statistics on notification delivery and engagement';
COMMENT ON VIEW user_notification_engagement IS 'Per-user notification engagement metrics';