-- =====================================================
-- ADVANCED PROVIDER PERFORMANCE SCORING (PPS) SYSTEM
-- Time decay algorithms, rolling averages, and real-time updates
-- =====================================================

-- Execute this AFTER running pps-extensions.sql
-- This implements advanced PPS features for Task 2

-- =====================================================
-- TIME DECAY CONFIGURATION AND ALGORITHMS
-- =====================================================

-- Configuration table for PPS decay parameters
CREATE TABLE pps_configuration (
    id SERIAL PRIMARY KEY,
    parameter_name VARCHAR(100) UNIQUE NOT NULL,
    parameter_value DECIMAL(10,4) NOT NULL,
    parameter_description TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default decay configuration
INSERT INTO pps_configuration (parameter_name, parameter_value, parameter_description) VALUES
('completion_rate_decay', 0.1, 'Exponential decay rate for completion rate (per day)'),
('acceptance_rate_decay', 0.05, 'Exponential decay rate for acceptance rate (per day)'),
('on_time_rate_decay', 0.08, 'Exponential decay rate for on-time performance (per day)'),
('customer_rating_decay', 0.03, 'Exponential decay rate for customer ratings (per day)'),
('response_time_decay', 0.15, 'Exponential decay rate for response time (per day)'),
('time_window_days', 90.0, 'Time window for performance calculations (days)'),
('min_jobs_for_stability', 10.0, 'Minimum jobs needed for stable PPS calculation'),
('response_time_limit_minutes', 7.0, 'Maximum response time for job acceptance (minutes)'),
('geographic_efficiency_weight', 0.1, 'Weight for geographic coverage efficiency in PPS'),
('availability_consistency_weight', 0.05, 'Weight for availability consistency in PPS')
ON CONFLICT (parameter_name) DO NOTHING;

-- Function to get PPS configuration parameter
CREATE OR REPLACE FUNCTION get_pps_config(param_name TEXT)
RETURNS DECIMAL(10,4) AS $$
DECLARE
    param_value DECIMAL(10,4);
BEGIN
    SELECT parameter_value INTO param_value
    FROM pps_configuration
    WHERE parameter_name = param_name AND is_active = true;
    
    RETURN COALESCE(param_value, 0.0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TIME DECAY CALCULATION FUNCTIONS
-- =====================================================

-- Exponential decay function for time-based weighting
CREATE OR REPLACE FUNCTION calculate_time_decay_weight(
    event_date TIMESTAMPTZ,
    decay_rate DECIMAL DEFAULT 0.1,
    current_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DECIMAL(8,6) AS $$
DECLARE
    days_ago DECIMAL;
    weight DECIMAL(8,6);
BEGIN
    days_ago := EXTRACT(EPOCH FROM (current_date - event_date)) / 86400.0;
    
    -- Exponential decay: weight = e^(-decay_rate * days_ago)
    weight := EXP(-decay_rate * days_ago);
    
    -- Ensure minimum weight of 0.01 to keep very old data relevant
    RETURN GREATEST(weight, 0.01);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate time-weighted completion rate
CREATE OR REPLACE FUNCTION calculate_weighted_completion_rate(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    decay_rate DECIMAL := get_pps_config('completion_rate_decay');
    time_window INTEGER := get_pps_config('time_window_days')::INTEGER;
    weighted_completed DECIMAL := 0.0;
    weighted_total DECIMAL := 0.0;
    job_record RECORD;
    weight DECIMAL;
    rate DECIMAL(5,2);
BEGIN
    FOR job_record IN
        SELECT 
            was_completed,
            service_date
        FROM provider_performance_history
        WHERE provider_id = provider_uuid
        AND service_date >= NOW() - (time_window || ' days')::INTERVAL
        ORDER BY service_date DESC
    LOOP
        weight := calculate_time_decay_weight(job_record.service_date, decay_rate);
        weighted_total := weighted_total + weight;
        
        IF job_record.was_completed THEN
            weighted_completed := weighted_completed + weight;
        END IF;
    END LOOP;
    
    IF weighted_total = 0 THEN
        RETURN 90.00; -- Default for new providers
    END IF;
    
    rate := (weighted_completed / weighted_total) * 100;
    RETURN LEAST(GREATEST(rate, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Calculate time-weighted acceptance rate
CREATE OR REPLACE FUNCTION calculate_weighted_acceptance_rate(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    decay_rate DECIMAL := get_pps_config('acceptance_rate_decay');
    time_window INTEGER := get_pps_config('time_window_days')::INTEGER;
    weighted_accepted DECIMAL := 0.0;
    weighted_total DECIMAL := 0.0;
    job_record RECORD;
    weight DECIMAL;
    rate DECIMAL(5,2);
BEGIN
    FOR job_record IN
        SELECT 
            was_accepted,
            was_offered,
            service_date
        FROM provider_performance_history
        WHERE provider_id = provider_uuid
        AND service_date >= NOW() - (time_window || ' days')::INTERVAL
        AND was_offered = true
        ORDER BY service_date DESC
    LOOP
        weight := calculate_time_decay_weight(job_record.service_date, decay_rate);
        weighted_total := weighted_total + weight;
        
        IF job_record.was_accepted THEN
            weighted_accepted := weighted_accepted + weight;
        END IF;
    END LOOP;
    
    IF weighted_total = 0 THEN
        RETURN 80.00; -- Default for new providers
    END IF;
    
    rate := (weighted_accepted / weighted_total) * 100;
    RETURN LEAST(GREATEST(rate, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Calculate time-weighted on-time rate
CREATE OR REPLACE FUNCTION calculate_weighted_on_time_rate(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    decay_rate DECIMAL := get_pps_config('on_time_rate_decay');
    time_window INTEGER := get_pps_config('time_window_days')::INTEGER;
    weighted_on_time DECIMAL := 0.0;
    weighted_total DECIMAL := 0.0;
    job_record RECORD;
    weight DECIMAL;
    rate DECIMAL(5,2);
BEGIN
    FOR job_record IN
        SELECT 
            was_on_time,
            service_date
        FROM provider_performance_history
        WHERE provider_id = provider_uuid
        AND service_date >= NOW() - (time_window || ' days')::INTERVAL
        AND was_completed = true
        ORDER BY service_date DESC
    LOOP
        weight := calculate_time_decay_weight(job_record.service_date, decay_rate);
        weighted_total := weighted_total + weight;
        
        IF job_record.was_on_time THEN
            weighted_on_time := weighted_on_time + weight;
        END IF;
    END LOOP;
    
    IF weighted_total = 0 THEN
        RETURN 85.00; -- Default for new providers
    END IF;
    
    rate := (weighted_on_time / weighted_total) * 100;
    RETURN LEAST(GREATEST(rate, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RESPONSE TIME MONITORING SYSTEM
-- =====================================================

-- Table to track job assignment offers and responses
CREATE TABLE job_assignment_offers (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    offered_at TIMESTAMPTZ DEFAULT NOW(),
    response_deadline TIMESTAMPTZ, -- 7 minutes from offer
    response_received_at TIMESTAMPTZ,
    response_type VARCHAR(20) CHECK (response_type IN ('accepted', 'declined', 'expired')),
    response_time_seconds INTEGER,
    auto_declined_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(booking_id, provider_id)
);

-- Function to create job assignment offer with 7-minute window
CREATE OR REPLACE FUNCTION create_job_assignment_offer(
    p_booking_id INTEGER,
    p_provider_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    offer_id INTEGER;
    response_window INTEGER := get_pps_config('response_time_limit_minutes')::INTEGER;
BEGIN
    INSERT INTO job_assignment_offers (
        booking_id,
        provider_id,
        response_deadline
    ) VALUES (
        p_booking_id,
        p_provider_id,
        NOW() + (response_window || ' minutes')::INTERVAL
    ) RETURNING id INTO offer_id;
    
    -- Schedule automatic expiry (would be handled by background job in practice)
    -- This is a placeholder for the actual scheduling mechanism
    
    RETURN offer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record provider response to job offer
CREATE OR REPLACE FUNCTION record_job_response(
    p_offer_id INTEGER,
    p_response_type VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    offer_record RECORD;
    response_seconds INTEGER;
BEGIN
    SELECT * FROM job_assignment_offers WHERE id = p_offer_id INTO offer_record;
    
    IF offer_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if already responded
    IF offer_record.response_received_at IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if expired
    IF NOW() > offer_record.response_deadline AND p_response_type != 'expired' THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate response time
    response_seconds := EXTRACT(EPOCH FROM (NOW() - offer_record.offered_at));
    
    -- Update the offer record
    UPDATE job_assignment_offers
    SET response_received_at = NOW(),
        response_type = p_response_type,
        response_time_seconds = response_seconds
    WHERE id = p_offer_id;
    
    -- Update provider performance history
    IF p_response_type = 'accepted' THEN
        INSERT INTO provider_performance_history (
            provider_id, booking_id, service_date, was_offered, was_accepted
        ) VALUES (
            offer_record.provider_id, offer_record.booking_id, NOW(), true, true
        ) ON CONFLICT (provider_id, booking_id) 
        DO UPDATE SET was_accepted = true;
    ELSIF p_response_type = 'declined' THEN
        INSERT INTO provider_performance_history (
            provider_id, booking_id, service_date, was_offered, was_accepted
        ) VALUES (
            offer_record.provider_id, offer_record.booking_id, NOW(), true, false
        ) ON CONFLICT (provider_id, booking_id) 
        DO UPDATE SET was_accepted = false;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate response time score
CREATE OR REPLACE FUNCTION calculate_response_time_score(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    decay_rate DECIMAL := get_pps_config('response_time_decay');
    time_limit INTEGER := get_pps_config('response_time_limit_minutes')::INTEGER * 60; -- Convert to seconds
    time_window INTEGER := get_pps_config('time_window_days')::INTEGER;
    weighted_score DECIMAL := 0.0;
    weighted_total DECIMAL := 0.0;
    offer_record RECORD;
    weight DECIMAL;
    time_score DECIMAL;
    final_score DECIMAL(5,2);
BEGIN
    FOR offer_record IN
        SELECT 
            response_time_seconds,
            response_type,
            offered_at
        FROM job_assignment_offers
        WHERE provider_id = provider_uuid
        AND offered_at >= NOW() - (time_window || ' days')::INTERVAL
        AND response_received_at IS NOT NULL
        ORDER BY offered_at DESC
    LOOP
        weight := calculate_time_decay_weight(offer_record.offered_at, decay_rate);
        weighted_total := weighted_total + weight;
        
        -- Calculate score based on response time
        IF offer_record.response_type = 'expired' THEN
            time_score := 0.0; -- No points for expired offers
        ELSIF offer_record.response_time_seconds <= time_limit THEN
            -- Full points for responses within limit, scaled by how quickly they responded
            time_score := 100.0 - (offer_record.response_time_seconds::DECIMAL / time_limit::DECIMAL * 20.0);
            time_score := GREATEST(time_score, 80.0); -- Minimum 80 points for within-limit responses
        ELSE
            -- Reduced points for late responses
            time_score := 50.0 - LEAST((offer_record.response_time_seconds - time_limit)::DECIMAL / 60.0, 50.0);
            time_score := GREATEST(time_score, 0.0);
        END IF;
        
        weighted_score := weighted_score + (time_score * weight);
    END LOOP;
    
    IF weighted_total = 0 THEN
        RETURN 85.00; -- Default for new providers
    END IF;
    
    final_score := weighted_score / weighted_total;
    RETURN LEAST(GREATEST(final_score, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROLLING AVERAGE SYSTEM FOR PERFORMANCE METRICS
-- =====================================================

-- Function to calculate rolling average customer ratings
CREATE OR REPLACE FUNCTION calculate_rolling_average_rating(provider_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    decay_rate DECIMAL := get_pps_config('customer_rating_decay');
    time_window INTEGER := get_pps_config('time_window_days')::INTEGER;
    weighted_rating_sum DECIMAL := 0.0;
    weighted_total DECIMAL := 0.0;
    rating_record RECORD;
    weight DECIMAL;
    avg_rating DECIMAL(3,2);
BEGIN
    FOR rating_record IN
        SELECT 
            customer_rating,
            service_date
        FROM provider_performance_history
        WHERE provider_id = provider_uuid
        AND service_date >= NOW() - (time_window || ' days')::INTERVAL
        AND customer_rating IS NOT NULL
        ORDER BY service_date DESC
    LOOP
        weight := calculate_time_decay_weight(rating_record.service_date, decay_rate);
        weighted_total := weighted_total + weight;
        weighted_rating_sum := weighted_rating_sum + (rating_record.customer_rating * weight);
    END LOOP;
    
    IF weighted_total = 0 THEN
        RETURN 4.0; -- Default rating for new providers
    END IF;
    
    avg_rating := weighted_rating_sum / weighted_total;
    RETURN LEAST(GREATEST(avg_rating, 1.0), 5.0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GEOGRAPHIC COVERAGE EFFICIENCY SCORING
-- =====================================================

-- Function to calculate geographic coverage efficiency
CREATE OR REPLACE FUNCTION calculate_geographic_efficiency(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    time_window INTEGER := get_pps_config('time_window_days')::INTEGER;
    total_distance DECIMAL := 0.0;
    total_jobs INTEGER := 0;
    avg_distance DECIMAL;
    service_radius DECIMAL;
    efficiency_score DECIMAL(5,2);
    coverage_record RECORD;
BEGIN
    -- Get provider's service radius
    SELECT max_radius_miles INTO service_radius
    FROM provider_service_coverage
    WHERE provider_id = provider_uuid AND is_active = true
    ORDER BY max_radius_miles DESC
    LIMIT 1;
    
    IF service_radius IS NULL THEN
        service_radius := 15.0; -- Default radius
    END IF;
    
    -- Calculate average distance to completed jobs
    SELECT 
        AVG(distance_miles),
        COUNT(*)
    INTO avg_distance, total_jobs
    FROM provider_performance_history
    WHERE provider_id = provider_uuid
    AND service_date >= NOW() - (time_window || ' days')::INTERVAL
    AND was_completed = true
    AND distance_miles IS NOT NULL;
    
    IF total_jobs = 0 OR avg_distance IS NULL THEN
        RETURN 80.0; -- Default score for new providers
    END IF;
    
    -- Calculate efficiency: lower average distance relative to service radius is better
    -- Score of 100 for jobs within 25% of radius, scaling down to 50 for jobs at full radius
    efficiency_score := 100.0 - ((avg_distance / service_radius) * 50.0);
    efficiency_score := GREATEST(efficiency_score, 30.0); -- Minimum score
    
    RETURN LEAST(GREATEST(efficiency_score, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AVAILABILITY CONSISTENCY SCORING
-- =====================================================

-- Table to track provider availability patterns
CREATE TABLE provider_availability_tracking (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    check_date DATE DEFAULT CURRENT_DATE,
    check_hour INTEGER CHECK (check_hour >= 0 AND check_hour <= 23),
    was_available BOOLEAN,
    scheduled_to_be_available BOOLEAN,
    response_to_ping BOOLEAN DEFAULT NULL, -- For availability pings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider_id, check_date, check_hour)
);

-- Function to calculate availability consistency
CREATE OR REPLACE FUNCTION calculate_availability_consistency(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    time_window INTEGER := get_pps_config('time_window_days')::INTEGER;
    consistent_periods INTEGER := 0;
    total_periods INTEGER := 0;
    consistency_rate DECIMAL(5,2);
BEGIN
    SELECT 
        SUM(CASE WHEN was_available = scheduled_to_be_available THEN 1 ELSE 0 END),
        COUNT(*)
    INTO consistent_periods, total_periods
    FROM provider_availability_tracking
    WHERE provider_id = provider_uuid
    AND check_date >= CURRENT_DATE - (time_window || ' days')::INTERVAL;
    
    IF total_periods = 0 THEN
        RETURN 85.0; -- Default score for new providers
    END IF;
    
    consistency_rate := (consistent_periods::DECIMAL / total_periods::DECIMAL) * 100.0;
    RETURN LEAST(GREATEST(consistency_rate, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ENHANCED PPS CALCULATION WITH ALL FACTORS
-- =====================================================

-- Main enhanced PPS calculation function
CREATE OR REPLACE FUNCTION calculate_enhanced_pps_score(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    completion_rate DECIMAL(5,2);
    acceptance_rate DECIMAL(5,2);
    on_time_rate DECIMAL(5,2);
    response_time_score DECIMAL(5,2);
    rating_score DECIMAL(5,2);
    geographic_efficiency DECIMAL(5,2);
    availability_consistency DECIMAL(5,2);
    rolling_avg_rating DECIMAL(3,2);
    min_jobs DECIMAL := get_pps_config('min_jobs_for_stability');
    geo_weight DECIMAL := get_pps_config('geographic_efficiency_weight');
    avail_weight DECIMAL := get_pps_config('availability_consistency_weight');
    job_count INTEGER;
    final_score DECIMAL(5,2);
BEGIN
    -- Check if provider has enough job history for stable calculation
    SELECT COUNT(*) INTO job_count
    FROM provider_performance_history
    WHERE provider_id = provider_uuid
    AND service_date >= NOW() - INTERVAL '90 days';
    
    -- Get all component scores using time decay
    completion_rate := calculate_weighted_completion_rate(provider_uuid);
    acceptance_rate := calculate_weighted_acceptance_rate(provider_uuid);
    on_time_rate := calculate_weighted_on_time_rate(provider_uuid);
    response_time_score := calculate_response_time_score(provider_uuid);
    rolling_avg_rating := calculate_rolling_average_rating(provider_uuid);
    geographic_efficiency := calculate_geographic_efficiency(provider_uuid);
    availability_consistency := calculate_availability_consistency(provider_uuid);
    
    -- Convert rating to percentage scale
    rating_score := (rolling_avg_rating / 5.0) * 100.0;
    
    -- Calculate weighted final score
    IF job_count >= min_jobs THEN
        -- Full algorithm for established providers
        final_score := (
            completion_rate * 0.25 +           -- 25% completion rate
            acceptance_rate * 0.20 +           -- 20% acceptance rate  
            on_time_rate * 0.20 +             -- 20% on-time performance
            response_time_score * 0.15 +      -- 15% response time
            rating_score * 0.15 +             -- 15% customer satisfaction
            geographic_efficiency * geo_weight + -- 2.5% geographic efficiency
            availability_consistency * avail_weight -- 2.5% availability consistency
        );
    ELSE
        -- Simplified scoring for new providers with penalty for insufficient data
        final_score := (
            completion_rate * 0.30 +
            acceptance_rate * 0.25 +
            on_time_rate * 0.25 +
            rating_score * 0.20
        ) * 0.9; -- 10% penalty for new providers
    END IF;
    
    -- Update provider metrics
    UPDATE provider_performance_metrics 
    SET 
        current_pps_score = final_score,
        average_customer_rating = rolling_avg_rating,
        last_pps_calculation = NOW(),
        updated_at = NOW()
    WHERE provider_id = provider_uuid;
    
    RETURN ROUND(final_score, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REAL-TIME PPS UPDATE TRIGGERS
-- =====================================================

-- Enhanced trigger function for real-time PPS updates
CREATE OR REPLACE FUNCTION trigger_pps_recalculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate PPS for affected provider(s)
    IF TG_TABLE_NAME = 'bookings' THEN
        IF NEW.provider_id IS NOT NULL THEN
            PERFORM calculate_enhanced_pps_score(NEW.provider_id);
        END IF;
        
        -- Also update customer satisfaction if review-related
        IF OLD.provider_id IS DISTINCT FROM NEW.provider_id AND OLD.provider_id IS NOT NULL THEN
            PERFORM calculate_enhanced_pps_score(OLD.provider_id);
        END IF;
        
    ELSIF TG_TABLE_NAME = 'job_assignment_offers' THEN
        PERFORM calculate_enhanced_pps_score(NEW.provider_id);
        
    ELSIF TG_TABLE_NAME = 'reviews' THEN
        IF NEW.reviewee_id IS NOT NULL THEN
            PERFORM calculate_enhanced_pps_score(NEW.reviewee_id);
        END IF;
        
    ELSIF TG_TABLE_NAME = 'provider_performance_history' THEN
        PERFORM calculate_enhanced_pps_score(NEW.provider_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply real-time update triggers
DROP TRIGGER IF EXISTS enhanced_pps_update_on_booking_change ON bookings;
CREATE TRIGGER enhanced_pps_update_on_booking_change
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_pps_recalculation();

DROP TRIGGER IF EXISTS pps_update_on_job_response ON job_assignment_offers;
CREATE TRIGGER pps_update_on_job_response
    AFTER INSERT OR UPDATE ON job_assignment_offers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_pps_recalculation();

DROP TRIGGER IF EXISTS pps_update_on_review ON reviews;
CREATE TRIGGER pps_update_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_pps_recalculation();

-- =====================================================
-- BATCH RECALCULATION AND MAINTENANCE
-- =====================================================

-- Function to recalculate all provider PPS scores (for maintenance)
CREATE OR REPLACE FUNCTION recalculate_all_pps_scores()
RETURNS INTEGER AS $$
DECLARE
    provider_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR provider_record IN
        SELECT id FROM providers WHERE is_verified = true AND onboarding_status = 'active'
    LOOP
        PERFORM calculate_enhanced_pps_score(provider_record.id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old job offers (would be run by background job)
CREATE OR REPLACE FUNCTION expire_old_job_offers()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE job_assignment_offers
    SET response_type = 'expired',
        response_received_at = NOW()
    WHERE response_deadline < NOW()
    AND response_received_at IS NULL;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Update performance history for expired offers
    INSERT INTO provider_performance_history (
        provider_id, booking_id, service_date, was_offered, was_accepted
    )
    SELECT 
        provider_id, booking_id, NOW(), true, false
    FROM job_assignment_offers
    WHERE response_type = 'expired'
    AND response_received_at = NOW() -- Just updated
    ON CONFLICT (provider_id, booking_id) 
    DO UPDATE SET was_accepted = false;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE ANALYTICS AND REPORTING
-- =====================================================

-- View for provider PPS analytics
CREATE VIEW provider_pps_analytics AS
SELECT 
    p.id as provider_id,
    up.full_name as provider_name,
    ppm.current_pps_score,
    calculate_weighted_completion_rate(p.id) as weighted_completion_rate,
    calculate_weighted_acceptance_rate(p.id) as weighted_acceptance_rate,
    calculate_weighted_on_time_rate(p.id) as weighted_on_time_rate,
    calculate_response_time_score(p.id) as response_time_score,
    calculate_rolling_average_rating(p.id) as rolling_avg_rating,
    calculate_geographic_efficiency(p.id) as geographic_efficiency,
    calculate_availability_consistency(p.id) as availability_consistency,
    ppm.last_pps_calculation,
    (SELECT COUNT(*) FROM provider_performance_history pph 
     WHERE pph.provider_id = p.id 
     AND pph.service_date >= NOW() - INTERVAL '30 days') as jobs_last_30_days
FROM providers p
JOIN user_profiles up ON up.id = p.id
JOIN provider_performance_metrics ppm ON ppm.provider_id = p.id
WHERE p.is_verified = true
ORDER BY ppm.current_pps_score DESC;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_job_assignment_offers_provider_id ON job_assignment_offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_assignment_offers_booking_id ON job_assignment_offers(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_assignment_offers_offered_at ON job_assignment_offers(offered_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_assignment_offers_response_deadline ON job_assignment_offers(response_deadline) 
WHERE response_received_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_provider_availability_tracking_provider_date ON provider_availability_tracking(provider_id, check_date);
CREATE INDEX IF NOT EXISTS idx_pps_configuration_parameter_name ON pps_configuration(parameter_name);

CREATE INDEX IF NOT EXISTS idx_provider_performance_history_service_date ON provider_performance_history(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_provider_performance_history_provider_date ON provider_performance_history(provider_id, service_date DESC);

-- Display completion message
SELECT 'Advanced PPS System implementation completed successfully!' AS status;
SELECT 'Time decay algorithms, response time monitoring, rolling averages, and real-time updates ready.' AS features_added;