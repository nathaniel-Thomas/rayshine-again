-- Real-Time Notifications & Job Assignment System Enhancement
-- This file extends the existing schema with enhanced notification and job assignment features

-- Add offline notification queue table
CREATE TABLE IF NOT EXISTS offline_notification_queue (
    id BIGSERIAL PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    notification_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('job_assignment', 'booking_update', 'chat_message', 'system_alert')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Indexes for efficient querying
    UNIQUE(provider_id, notification_id)
);

CREATE INDEX idx_offline_queue_provider_priority ON offline_notification_queue(provider_id, priority DESC, created_at);
CREATE INDEX idx_offline_queue_expires ON offline_notification_queue(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_offline_queue_undelivered ON offline_notification_queue(provider_id, delivered_at) WHERE delivered_at IS NULL;

-- Add push notification tokens table
CREATE TABLE IF NOT EXISTS provider_push_tokens (
    id BIGSERIAL PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    
    UNIQUE(provider_id, token)
);

CREATE INDEX idx_push_tokens_provider_active ON provider_push_tokens(provider_id, is_active);

-- Enhance job_assignment_queue with better tracking
ALTER TABLE job_assignment_queue 
ADD COLUMN IF NOT EXISTS notification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_method VARCHAR(20) DEFAULT 'websocket' CHECK (response_method IN ('websocket', 'push_notification', 'sms', 'phone_call')),
ADD COLUMN IF NOT EXISTS sound_alert_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS vibration_enabled BOOLEAN DEFAULT true;

-- Create notification delivery tracking table
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    notification_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('websocket', 'push_notification', 'sms', 'email')),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed', 'expired')),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_notification_delivery_user ON notification_delivery_log(user_id, sent_at DESC);
CREATE INDEX idx_notification_delivery_status ON notification_delivery_log(delivery_status, sent_at DESC);
CREATE INDEX idx_notification_delivery_type ON notification_delivery_log(notification_type, sent_at DESC);

-- Create real-time assignment metrics table
CREATE TABLE IF NOT EXISTS assignment_metrics (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    assignment_id BIGINT REFERENCES job_assignment_queue(id) ON DELETE CASCADE,
    
    -- Timing metrics
    assignment_created_at TIMESTAMPTZ NOT NULL,
    first_notification_sent_at TIMESTAMPTZ,
    provider_response_at TIMESTAMPTZ,
    assignment_completed_at TIMESTAMPTZ,
    
    -- Response metrics
    total_response_time_seconds INTEGER,
    notification_to_response_seconds INTEGER,
    total_providers_contacted INTEGER DEFAULT 0,
    successful_assignments INTEGER DEFAULT 0,
    
    -- Assignment outcome
    final_status VARCHAR(20) NOT NULL CHECK (final_status IN ('assigned', 'expired', 'cancelled', 'manual_intervention_required')),
    assignment_method VARCHAR(20) NOT NULL CHECK (assignment_method IN ('auto_pps', 'manual', 'fallback')),
    
    -- Quality metrics
    customer_satisfaction_score DECIMAL(2,1),
    provider_reliability_impact DECIMAL(3,2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_metrics_booking ON assignment_metrics(booking_id);
CREATE INDEX idx_assignment_metrics_provider ON assignment_metrics(provider_id, assignment_created_at DESC);
CREATE INDEX idx_assignment_metrics_status ON assignment_metrics(final_status, assignment_created_at DESC);

-- Create provider availability status table for real-time tracking
CREATE TABLE IF NOT EXISTS provider_availability_status (
    provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Online/offline status
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_location_update_at TIMESTAMPTZ,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    location_accuracy_meters INTEGER,
    
    -- Availability settings
    is_accepting_jobs BOOLEAN NOT NULL DEFAULT true,
    max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
    current_active_jobs INTEGER NOT NULL DEFAULT 0,
    
    -- Status details
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available' 
        CHECK (availability_status IN ('available', 'busy', 'break', 'offline', 'emergency')),
    status_message TEXT,
    estimated_available_at TIMESTAMPTZ,
    
    -- Connection info
    active_connections INTEGER NOT NULL DEFAULT 0,
    websocket_connection_ids TEXT[],
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_availability_online ON provider_availability_status(is_online, availability_status);
CREATE INDEX idx_provider_availability_location ON provider_availability_status USING GIST(
    ST_Point(current_longitude, current_latitude)
) WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;
CREATE INDEX idx_provider_availability_accepting ON provider_availability_status(is_accepting_jobs, current_active_jobs);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Notification method preferences
    websocket_enabled BOOLEAN NOT NULL DEFAULT true,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    phone_call_enabled BOOLEAN NOT NULL DEFAULT false,
    
    -- Job assignment specific preferences
    job_assignment_sound BOOLEAN NOT NULL DEFAULT true,
    job_assignment_vibration BOOLEAN NOT NULL DEFAULT true,
    urgent_assignments_override_dnd BOOLEAN NOT NULL DEFAULT true,
    
    -- Notification timing
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Response requirements
    require_read_confirmation BOOLEAN NOT NULL DEFAULT false,
    auto_decline_after_minutes INTEGER DEFAULT 7,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Functions for real-time notification system

-- Function to update provider availability status
CREATE OR REPLACE FUNCTION update_provider_availability(
    p_provider_id UUID,
    p_is_online BOOLEAN,
    p_latitude DECIMAL(10, 8) DEFAULT NULL,
    p_longitude DECIMAL(11, 8) DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO provider_availability_status (
        provider_id,
        is_online,
        last_seen_at,
        current_latitude,
        current_longitude,
        last_location_update_at,
        availability_status
    ) VALUES (
        p_provider_id,
        p_is_online,
        now(),
        p_latitude,
        p_longitude,
        CASE WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN now() ELSE NULL END,
        COALESCE(p_status, 'available')
    )
    ON CONFLICT (provider_id) DO UPDATE SET
        is_online = p_is_online,
        last_seen_at = now(),
        current_latitude = COALESCE(p_latitude, provider_availability_status.current_latitude),
        current_longitude = COALESCE(p_longitude, provider_availability_status.current_longitude),
        last_location_update_at = CASE 
            WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN now() 
            ELSE provider_availability_status.last_location_update_at 
        END,
        availability_status = COALESCE(p_status, provider_availability_status.availability_status),
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to log notification delivery
CREATE OR REPLACE FUNCTION log_notification_delivery(
    p_user_id UUID,
    p_notification_id VARCHAR(255),
    p_notification_type VARCHAR(50),
    p_delivery_method VARCHAR(20),
    p_delivery_status VARCHAR(20) DEFAULT 'sent',
    p_metadata JSONB DEFAULT '{}'
) RETURNS BIGINT AS $$
DECLARE
    log_id BIGINT;
BEGIN
    INSERT INTO notification_delivery_log (
        user_id,
        notification_id,
        notification_type,
        delivery_method,
        delivery_status,
        metadata
    ) VALUES (
        p_user_id,
        p_notification_id,
        p_notification_type,
        p_delivery_method,
        p_delivery_status,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get provider notification preferences
CREATE OR REPLACE FUNCTION get_provider_notification_methods(p_provider_id UUID)
RETURNS TABLE(
    websocket_enabled BOOLEAN,
    push_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    sound_enabled BOOLEAN,
    vibration_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(np.websocket_enabled, true) as websocket_enabled,
        COALESCE(np.push_notifications_enabled, true) as push_enabled,
        COALESCE(np.sms_enabled, false) as sms_enabled,
        COALESCE(np.job_assignment_sound, true) as sound_enabled,
        COALESCE(np.job_assignment_vibration, true) as vibration_enabled
    FROM providers p
    LEFT JOIN notification_preferences np ON p.id = np.user_id
    WHERE p.id = p_provider_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update provider availability on connection changes
CREATE OR REPLACE FUNCTION update_provider_last_seen() RETURNS TRIGGER AS $$
BEGIN
    -- This would be called when websocket connections change
    PERFORM update_provider_availability(
        NEW.provider_id::UUID,
        true,  -- is_online
        NULL,  -- latitude
        NULL,  -- longitude
        NULL   -- status (keep current)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- View for admin dashboard - real-time assignment statistics
CREATE OR REPLACE VIEW assignment_dashboard_stats AS
SELECT 
    COUNT(CASE WHEN jaq.status = 'pending' THEN 1 END) as pending_assignments,
    COUNT(CASE WHEN jaq.status = 'accepted' THEN 1 END) as accepted_assignments,
    COUNT(CASE WHEN jaq.status = 'declined' THEN 1 END) as declined_assignments,
    COUNT(CASE WHEN jaq.status = 'expired' THEN 1 END) as expired_assignments,
    
    -- Average response times
    AVG(CASE WHEN jaq.response_time_seconds IS NOT NULL THEN jaq.response_time_seconds END) as avg_response_time_seconds,
    
    -- Provider availability
    COUNT(CASE WHEN pas.is_online = true THEN 1 END) as online_providers,
    COUNT(CASE WHEN pas.availability_status = 'available' AND pas.is_online = true THEN 1 END) as available_providers,
    
    -- Notification queue stats
    COUNT(CASE WHEN onq.delivered_at IS NULL THEN 1 END) as queued_notifications,
    
    -- Recent activity (last hour)
    COUNT(CASE WHEN jaq.created_at > now() - INTERVAL '1 hour' THEN 1 END) as assignments_last_hour,
    COUNT(CASE WHEN jaq.responded_at > now() - INTERVAL '1 hour' THEN 1 END) as responses_last_hour
    
FROM job_assignment_queue jaq
FULL OUTER JOIN provider_availability_status pas ON true
FULL OUTER JOIN offline_notification_queue onq ON true
WHERE jaq.created_at > now() - INTERVAL '24 hours' OR jaq.created_at IS NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON offline_notification_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_delivery_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_availability_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE offline_notification_queue_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE provider_push_tokens_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notification_delivery_log_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE assignment_metrics_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notification_preferences_id_seq TO authenticated;

-- Row Level Security Policies

-- Offline notification queue - providers can only see their own notifications
ALTER TABLE offline_notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY offline_queue_provider_policy ON offline_notification_queue
    FOR ALL USING (
        auth.uid() = provider_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Push tokens - providers can only manage their own tokens
ALTER TABLE provider_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_tokens_provider_policy ON provider_push_tokens
    FOR ALL USING (
        auth.uid() = provider_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Notification delivery log - users can see their own logs, admins can see all
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_log_user_policy ON notification_delivery_log
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Assignment metrics - admins and involved parties can view
ALTER TABLE assignment_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignment_metrics_policy ON assignment_metrics
    FOR ALL USING (
        auth.uid() = provider_id OR
        EXISTS (SELECT 1 FROM bookings WHERE id = assignment_metrics.booking_id AND customer_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Provider availability - providers can update their own, everyone can read
ALTER TABLE provider_availability_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_availability_read_policy ON provider_availability_status
    FOR SELECT USING (true);
CREATE POLICY provider_availability_write_policy ON provider_availability_status
    FOR ALL USING (
        auth.uid() = provider_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Notification preferences - users can manage their own preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_preferences_policy ON notification_preferences
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Create initial notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT DISTINCT id FROM user_profiles 
WHERE role IN ('customer', 'provider', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE offline_notification_queue IS 'Stores notifications for offline providers to be delivered when they come online';
COMMENT ON TABLE provider_push_tokens IS 'Stores push notification tokens for mobile devices';
COMMENT ON TABLE notification_delivery_log IS 'Tracks notification delivery attempts and status';
COMMENT ON TABLE assignment_metrics IS 'Comprehensive metrics for job assignment performance analysis';
COMMENT ON TABLE provider_availability_status IS 'Real-time provider availability and location tracking';
COMMENT ON TABLE notification_preferences IS 'User preferences for different notification methods and timing';

COMMENT ON FUNCTION update_provider_availability IS 'Updates provider online status and location for real-time tracking';
COMMENT ON FUNCTION log_notification_delivery IS 'Logs notification delivery attempts for audit and retry logic';
COMMENT ON FUNCTION get_provider_notification_methods IS 'Retrieves provider notification method preferences';

COMMENT ON VIEW assignment_dashboard_stats IS 'Real-time statistics for admin dashboard showing assignment and provider status';