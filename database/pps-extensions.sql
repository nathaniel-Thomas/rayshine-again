-- =====================================================
-- PROVIDER PERFORMANCE SCORING (PPS) EXTENSIONS
-- Advanced performance metrics and job assignment system
-- =====================================================

-- Note: Execute this AFTER running the main schema.sql file
-- This extends the core database with PPS-specific tables and functions

-- =====================================================
-- PPS-SPECIFIC ENUMS
-- =====================================================

-- Job assignment queue status
CREATE TYPE assignment_queue_status AS ENUM ('pending', 'offered', 'accepted', 'expired', 'declined');

-- Performance metric types
CREATE TYPE metric_type AS ENUM ('acceptance_rate', 'completion_rate', 'on_time_rate', 'distance_factor', 'customer_rating');

-- =====================================================
-- PROVIDER PERFORMANCE METRICS TABLES
-- =====================================================

-- Provider performance metrics (current aggregated data)
CREATE TABLE provider_performance_metrics (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Job Statistics
    jobs_offered INTEGER DEFAULT 0,
    jobs_accepted INTEGER DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    jobs_cancelled INTEGER DEFAULT 0,
    
    -- Time Performance
    on_time_arrivals INTEGER DEFAULT 0,
    late_arrivals INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    
    -- Customer Satisfaction
    total_customer_ratings INTEGER DEFAULT 0,
    sum_customer_ratings INTEGER DEFAULT 0,
    average_customer_rating DECIMAL(3,2) DEFAULT 0.00,
    
    -- Distance and Coverage
    average_travel_distance DECIMAL(6,2) DEFAULT 0.00,
    preferred_max_distance DECIMAL(6,2) DEFAULT 15.00,
    
    -- Calculated PPS Score (0-100)
    current_pps_score DECIMAL(5,2) DEFAULT 75.00,
    last_pps_calculation TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance Period
    calculation_period_start TIMESTAMPTZ DEFAULT NOW(),
    calculation_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider_id)
);

CREATE TRIGGER update_provider_performance_metrics_updated_at 
    BEFORE UPDATE ON provider_performance_metrics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Provider performance history (individual job records)
CREATE TABLE provider_performance_history (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Job Details
    service_date TIMESTAMPTZ NOT NULL,
    distance_miles DECIMAL(6,2),
    estimated_travel_time_minutes INTEGER,
    actual_travel_time_minutes INTEGER,
    
    -- Performance Indicators
    was_offered BOOLEAN DEFAULT false,
    was_accepted BOOLEAN DEFAULT false,
    was_on_time BOOLEAN DEFAULT false,
    was_completed BOOLEAN DEFAULT false,
    was_cancelled BOOLEAN DEFAULT false,
    cancellation_reason TEXT,
    
    -- Customer Feedback
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    
    -- PPS Impact
    pps_points_earned DECIMAL(5,2) DEFAULT 0.00,
    pps_score_at_time DECIMAL(5,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- JOB ASSIGNMENT QUEUE
-- =====================================================

-- Job assignment queue for automated provider selection
CREATE TABLE job_assignment_queue (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assignment_order INTEGER NOT NULL, -- Order based on PPS ranking
    distance_miles DECIMAL(6,2) NOT NULL,
    estimated_travel_time INTEGER, -- minutes
    provider_pps_score DECIMAL(5,2) NOT NULL,
    
    -- Offer Management
    status assignment_queue_status DEFAULT 'pending',
    offered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    response_at TIMESTAMPTZ,
    
    -- Pricing
    quoted_price DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(booking_id, provider_id)
);

CREATE TRIGGER update_job_assignment_queue_updated_at 
    BEFORE UPDATE ON job_assignment_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PPS CALCULATION FUNCTIONS
-- =====================================================

-- Calculate acceptance rate (jobs accepted / jobs offered)
CREATE OR REPLACE FUNCTION calculate_acceptance_rate(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    offered_count INTEGER;
    accepted_count INTEGER;
    rate DECIMAL(5,2);
BEGIN
    SELECT jobs_offered, jobs_accepted 
    INTO offered_count, accepted_count
    FROM provider_performance_metrics 
    WHERE provider_id = provider_uuid;
    
    IF offered_count = 0 THEN
        RETURN 80.00; -- Default for new providers
    END IF;
    
    rate := (accepted_count::DECIMAL / offered_count::DECIMAL) * 100;
    RETURN LEAST(GREATEST(rate, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Calculate completion rate (jobs completed / jobs accepted)
CREATE OR REPLACE FUNCTION calculate_completion_rate(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    accepted_count INTEGER;
    completed_count INTEGER;
    rate DECIMAL(5,2);
BEGIN
    SELECT jobs_accepted, jobs_completed 
    INTO accepted_count, completed_count
    FROM provider_performance_metrics 
    WHERE provider_id = provider_uuid;
    
    IF accepted_count = 0 THEN
        RETURN 90.00; -- Default for new providers
    END IF;
    
    rate := (completed_count::DECIMAL / accepted_count::DECIMAL) * 100;
    RETURN LEAST(GREATEST(rate, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Calculate on-time rate (on-time arrivals / total completed jobs)
CREATE OR REPLACE FUNCTION calculate_on_time_rate(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    completed_count INTEGER;
    on_time_count INTEGER;
    rate DECIMAL(5,2);
BEGIN
    SELECT jobs_completed, on_time_arrivals 
    INTO completed_count, on_time_count
    FROM provider_performance_metrics 
    WHERE provider_id = provider_uuid;
    
    IF completed_count = 0 THEN
        RETURN 85.00; -- Default for new providers
    END IF;
    
    rate := (on_time_count::DECIMAL / completed_count::DECIMAL) * 100;
    RETURN LEAST(GREATEST(rate, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Calculate distance factor (preference for closer jobs)
CREATE OR REPLACE FUNCTION calculate_distance_factor(provider_uuid UUID, job_distance DECIMAL)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    max_preferred DECIMAL(6,2);
    factor DECIMAL(5,2);
BEGIN
    SELECT preferred_max_distance 
    INTO max_preferred
    FROM provider_performance_metrics 
    WHERE provider_id = provider_uuid;
    
    IF max_preferred IS NULL OR max_preferred = 0 THEN
        max_preferred := 15.00; -- Default 15 miles
    END IF;
    
    -- Linear decay: 100% at 0 miles, 70% at max preferred distance, 0% at 2x max
    IF job_distance <= max_preferred THEN
        factor := 100 - ((job_distance / max_preferred) * 30); -- 100% to 70%
    ELSIF job_distance <= (max_preferred * 2) THEN
        factor := 70 - (((job_distance - max_preferred) / max_preferred) * 70); -- 70% to 0%
    ELSE
        factor := 0; -- Beyond 2x preferred distance
    END IF;
    
    RETURN LEAST(GREATEST(factor, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Main PPS calculation function
CREATE OR REPLACE FUNCTION calculate_pps_score(provider_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    acceptance_rate DECIMAL(5,2);
    completion_rate DECIMAL(5,2);
    on_time_rate DECIMAL(5,2);
    avg_rating DECIMAL(3,2);
    rating_score DECIMAL(5,2);
    final_score DECIMAL(5,2);
BEGIN
    -- Get component scores
    acceptance_rate := calculate_acceptance_rate(provider_uuid);
    completion_rate := calculate_completion_rate(provider_uuid);
    on_time_rate := calculate_on_time_rate(provider_uuid);
    
    -- Get customer rating
    SELECT average_customer_rating 
    INTO avg_rating
    FROM provider_performance_metrics 
    WHERE provider_id = provider_uuid;
    
    -- Convert rating (1-5) to percentage (20-100)
    IF avg_rating IS NULL OR avg_rating = 0 THEN
        rating_score := 80.00; -- Default for new providers
    ELSE
        rating_score := (avg_rating / 5.0) * 100;
    END IF;
    
    -- Weighted average calculation
    final_score := (
        acceptance_rate * 0.25 +     -- 25% weight
        completion_rate * 0.30 +     -- 30% weight
        on_time_rate * 0.25 +        -- 25% weight
        rating_score * 0.20          -- 20% weight
    );
    
    -- Update the provider's PPS score
    UPDATE provider_performance_metrics 
    SET current_pps_score = final_score,
        last_pps_calculation = NOW(),
        updated_at = NOW()
    WHERE provider_id = provider_uuid;
    
    RETURN ROUND(final_score, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- JOB ASSIGNMENT FUNCTIONS
-- =====================================================

-- Find available providers for a job using PPS ranking
CREATE OR REPLACE FUNCTION find_providers_for_job(
    job_booking_id INTEGER,
    max_providers INTEGER DEFAULT 5
)
RETURNS TABLE(
    provider_id UUID,
    distance_miles DECIMAL(6,2),
    pps_score DECIMAL(5,2),
    assignment_rank INTEGER
) AS $$
DECLARE
    job_location GEOGRAPHY;
    job_service_id INTEGER;
BEGIN
    -- Get job location and service
    SELECT ua.location, b.service_id 
    INTO job_location, job_service_id
    FROM bookings b
    JOIN user_addresses ua ON ua.id = b.address_id
    WHERE b.id = job_booking_id;
    
    RETURN QUERY
    WITH available_providers AS (
        SELECT 
            p.id as provider_id,
            ST_Distance(psc.center_location, job_location) / 1609.34 as distance_miles, -- Convert to miles
            ppm.current_pps_score,
            calculate_distance_factor(p.id, ST_Distance(psc.center_location, job_location) / 1609.34) as distance_factor
        FROM providers p
        JOIN provider_performance_metrics ppm ON ppm.provider_id = p.id
        JOIN provider_service_coverage psc ON psc.provider_id = p.id
        JOIN provider_services ps ON ps.provider_id = p.id
        WHERE 
            p.is_verified = true
            AND p.onboarding_status = 'active'
            AND ps.service_id = job_service_id
            AND ps.is_available = true
            AND psc.is_active = true
            AND ST_DWithin(psc.center_location, job_location, psc.max_radius_miles * 1609.34) -- Within service area
    ),
    ranked_providers AS (
        SELECT 
            provider_id,
            distance_miles,
            current_pps_score as pps_score,
            -- Combined score: PPS score weighted with distance factor
            (current_pps_score * 0.8) + (distance_factor * 0.2) as combined_score,
            ROW_NUMBER() OVER (ORDER BY 
                (current_pps_score * 0.8) + (distance_factor * 0.2) DESC,
                distance_miles ASC
            ) as rank
        FROM available_providers
        WHERE distance_factor > 0 -- Exclude providers too far away
    )
    SELECT 
        rp.provider_id,
        rp.distance_miles,
        rp.pps_score,
        rp.rank::INTEGER as assignment_rank
    FROM ranked_providers rp
    WHERE rp.rank <= max_providers
    ORDER BY rp.rank;
END;
$$ LANGUAGE plpgsql;

-- Create job assignment queue for a booking
CREATE OR REPLACE FUNCTION create_job_assignment_queue(job_booking_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    provider_record RECORD;
    queue_count INTEGER := 0;
BEGIN
    -- Clear any existing queue for this booking
    DELETE FROM job_assignment_queue WHERE booking_id = job_booking_id;
    
    -- Create queue entries for available providers
    FOR provider_record IN 
        SELECT * FROM find_providers_for_job(job_booking_id, 5)
    LOOP
        INSERT INTO job_assignment_queue (
            booking_id,
            provider_id,
            assignment_order,
            distance_miles,
            provider_pps_score,
            status
        ) VALUES (
            job_booking_id,
            provider_record.provider_id,
            provider_record.assignment_rank,
            provider_record.distance_miles,
            provider_record.pps_score,
            'pending'
        );
        
        queue_count := queue_count + 1;
    END LOOP;
    
    RETURN queue_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE TRACKING TRIGGERS
-- =====================================================

-- Function to update performance metrics when booking status changes
CREATE OR REPLACE FUNCTION update_provider_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle booking completion
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update completion metrics
        UPDATE provider_performance_metrics
        SET jobs_completed = jobs_completed + 1,
            updated_at = NOW()
        WHERE provider_id = NEW.provider_id;
        
        -- Check if provider was on time
        IF NEW.actual_start_time <= NEW.scheduled_start_time + INTERVAL '15 minutes' THEN
            UPDATE provider_performance_metrics
            SET on_time_arrivals = on_time_arrivals + 1
            WHERE provider_id = NEW.provider_id;
        ELSE
            UPDATE provider_performance_metrics
            SET late_arrivals = late_arrivals + 1
            WHERE provider_id = NEW.provider_id;
        END IF;
        
        -- Recalculate PPS score
        PERFORM calculate_pps_score(NEW.provider_id);
    END IF;
    
    -- Handle booking cancellation
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE provider_performance_metrics
        SET jobs_cancelled = jobs_cancelled + 1,
            updated_at = NOW()
        WHERE provider_id = NEW.provider_id;
        
        -- Recalculate PPS score
        PERFORM calculate_pps_score(NEW.provider_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_performance_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_performance();

-- Function to track job assignments and responses
CREATE OR REPLACE FUNCTION track_job_assignment_response()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        -- Update acceptance metrics
        UPDATE provider_performance_metrics
        SET jobs_accepted = jobs_accepted + 1,
            updated_at = NOW()
        WHERE provider_id = NEW.provider_id;
        
        -- Recalculate PPS score
        PERFORM calculate_pps_score(NEW.provider_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_job_assignment_response_trigger
    AFTER UPDATE ON job_assignment_queue
    FOR EACH ROW
    EXECUTE FUNCTION track_job_assignment_response();

-- =====================================================
-- INDEXES FOR PPS PERFORMANCE
-- =====================================================

-- Performance metrics indexes
CREATE INDEX idx_provider_performance_metrics_provider_id ON provider_performance_metrics(provider_id);
CREATE INDEX idx_provider_performance_metrics_pps_score ON provider_performance_metrics(current_pps_score DESC);
CREATE INDEX idx_provider_performance_metrics_last_calculation ON provider_performance_metrics(last_pps_calculation);

-- Performance history indexes
CREATE INDEX idx_provider_performance_history_provider_id ON provider_performance_history(provider_id);
CREATE INDEX idx_provider_performance_history_booking_id ON provider_performance_history(booking_id);
CREATE INDEX idx_provider_performance_history_service_date ON provider_performance_history(service_date DESC);

-- Job assignment queue indexes
CREATE INDEX idx_job_assignment_queue_booking_id ON job_assignment_queue(booking_id);
CREATE INDEX idx_job_assignment_queue_provider_id ON job_assignment_queue(provider_id);
CREATE INDEX idx_job_assignment_queue_status ON job_assignment_queue(status);
CREATE INDEX idx_job_assignment_queue_assignment_order ON job_assignment_queue(booking_id, assignment_order);
CREATE INDEX idx_job_assignment_queue_expires_at ON job_assignment_queue(expires_at) WHERE status = 'offered';

-- =====================================================
-- INITIALIZATION AND CLEANUP
-- =====================================================

-- Function to initialize PPS metrics for existing providers
CREATE OR REPLACE FUNCTION initialize_pps_for_existing_providers()
RETURNS INTEGER AS $$
DECLARE
    provider_record RECORD;
    initialized_count INTEGER := 0;
BEGIN
    FOR provider_record IN 
        SELECT id FROM providers WHERE is_verified = true
    LOOP
        INSERT INTO provider_performance_metrics (provider_id)
        VALUES (provider_record.id)
        ON CONFLICT (provider_id) DO NOTHING;
        
        -- Calculate initial PPS score
        PERFORM calculate_pps_score(provider_record.id);
        
        initialized_count := initialized_count + 1;
    END LOOP;
    
    RETURN initialized_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired job assignments
CREATE OR REPLACE FUNCTION cleanup_expired_assignments()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE job_assignment_queue 
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'offered' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Display success message
SELECT 'PPS Extensions created successfully!' AS status;
SELECT 'Provider Performance Scoring system is now ready.' AS message;
SELECT 'Run initialize_pps_for_existing_providers() to set up metrics for existing providers.' AS next_step;