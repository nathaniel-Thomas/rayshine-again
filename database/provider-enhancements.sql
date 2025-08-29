-- =====================================================
-- PROVIDER MANAGEMENT ENHANCEMENTS
-- Additional tables and fields for comprehensive provider management
-- =====================================================

-- Execute this AFTER running schema.sql and pps-extensions.sql
-- This adds missing provider management features

-- =====================================================
-- ENUMS FOR PROVIDER ENHANCEMENTS
-- =====================================================

-- Document types for verification
CREATE TYPE document_type AS ENUM ('license', 'insurance', 'certification', 'background_check', 'tax_form', 'identity', 'other');

-- Document verification status
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected', 'expired', 'requires_update');

-- Availability day of week
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- =====================================================
-- PROVIDER TABLE ENHANCEMENTS
-- =====================================================

-- Add missing fields to existing providers table
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS business_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_state VARCHAR(2),
ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS specialty_description TEXT,
ADD COLUMN IF NOT EXISTS years_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_radius_miles DECIMAL(6,2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS emergency_services_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_online_payments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS minimum_job_value DECIMAL(8,2) DEFAULT 0.00;

-- Add indexes for new provider fields
CREATE INDEX IF NOT EXISTS idx_providers_business_name ON providers(business_name);
CREATE INDEX IF NOT EXISTS idx_providers_license_number ON providers(license_number);
CREATE INDEX IF NOT EXISTS idx_providers_license_state ON providers(license_state);
CREATE INDEX IF NOT EXISTS idx_providers_service_radius ON providers(service_radius_miles);

-- =====================================================
-- PROVIDER DOCUMENTS TABLE
-- =====================================================

-- Provider documents for verification
CREATE TABLE provider_documents (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    file_url TEXT NOT NULL, -- URL to stored file (Supabase Storage)
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    document_status document_status DEFAULT 'pending',
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    verified_date TIMESTAMPTZ,
    verified_by UUID REFERENCES user_profiles(id), -- Admin who verified
    expiry_date DATE,
    notes TEXT, -- Admin notes about verification
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_provider_documents_updated_at 
    BEFORE UPDATE ON provider_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for provider documents
CREATE INDEX idx_provider_documents_provider_id ON provider_documents(provider_id);
CREATE INDEX idx_provider_documents_type ON provider_documents(document_type);
CREATE INDEX idx_provider_documents_status ON provider_documents(document_status);
CREATE INDEX idx_provider_documents_expiry ON provider_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- PROVIDER AVAILABILITY SYSTEM
-- =====================================================

-- Provider availability schedule
CREATE TABLE provider_availability (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    break_start_time TIME, -- Optional lunch break
    break_end_time TIME,
    max_jobs_per_day INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_break_times CHECK (
        (break_start_time IS NULL AND break_end_time IS NULL) OR
        (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND 
         break_end_time > break_start_time AND 
         break_start_time >= start_time AND 
         break_end_time <= end_time)
    )
);

CREATE TRIGGER update_provider_availability_updated_at 
    BEFORE UPDATE ON provider_availability 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Provider time off/unavailable periods
CREATE TABLE provider_time_off (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME DEFAULT '00:00:00',
    end_time TIME DEFAULT '23:59:59',
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50), -- 'weekly', 'monthly', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_time_range_time_off CHECK (end_time > start_time OR start_date < end_date)
);

CREATE TRIGGER update_provider_time_off_updated_at 
    BEFORE UPDATE ON provider_time_off 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for availability system
CREATE INDEX idx_provider_availability_provider_id ON provider_availability(provider_id);
CREATE INDEX idx_provider_availability_day ON provider_availability(day_of_week);
CREATE INDEX idx_provider_time_off_provider_id ON provider_time_off(provider_id);
CREATE INDEX idx_provider_time_off_dates ON provider_time_off(start_date, end_date);

-- =====================================================
-- PROVIDER SERVICE SPECIALIZATIONS
-- =====================================================

-- Provider service specializations (sub-services they excel at)
CREATE TABLE provider_service_specializations (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    specialization_name VARCHAR(100) NOT NULL,
    description TEXT,
    premium_rate_multiplier DECIMAL(4,3) DEFAULT 1.000, -- 1.000 = no premium, 1.250 = 25% premium
    certification_required BOOLEAN DEFAULT false,
    certification_name VARCHAR(200),
    is_featured BOOLEAN DEFAULT false, -- Highlight this specialization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(provider_id, service_id, specialization_name)
);

CREATE TRIGGER update_provider_service_specializations_updated_at 
    BEFORE UPDATE ON provider_service_specializations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for specializations
CREATE INDEX idx_provider_service_specializations_provider_id ON provider_service_specializations(provider_id);
CREATE INDEX idx_provider_service_specializations_service_id ON provider_service_specializations(service_id);
CREATE INDEX idx_provider_service_specializations_featured ON provider_service_specializations(is_featured) WHERE is_featured = true;

-- =====================================================
-- PROVIDER VERIFICATION FUNCTIONS
-- =====================================================

-- Function to check if provider has all required documents
CREATE OR REPLACE FUNCTION check_provider_verification_status(provider_uuid UUID)
RETURNS TABLE(
    is_fully_verified BOOLEAN,
    missing_documents TEXT[],
    expired_documents TEXT[],
    verification_percentage DECIMAL(5,2)
) AS $$
DECLARE
    required_docs document_type[] := ARRAY['license', 'insurance', 'background_check', 'identity']::document_type[];
    doc_type document_type;
    missing_docs TEXT[] := ARRAY[]::TEXT[];
    expired_docs TEXT[] := ARRAY[]::TEXT[];
    total_required INTEGER := array_length(required_docs, 1);
    verified_count INTEGER := 0;
    doc_count INTEGER;
BEGIN
    -- Check each required document type
    FOREACH doc_type IN ARRAY required_docs
    LOOP
        SELECT COUNT(*) INTO doc_count
        FROM provider_documents 
        WHERE provider_id = provider_uuid 
        AND document_type = doc_type 
        AND document_status = 'approved'
        AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE);
        
        IF doc_count = 0 THEN
            -- Check if document exists but is expired or not approved
            SELECT COUNT(*) INTO doc_count
            FROM provider_documents 
            WHERE provider_id = provider_uuid 
            AND document_type = doc_type;
            
            IF doc_count = 0 THEN
                missing_docs := array_append(missing_docs, doc_type::TEXT);
            ELSE
                -- Check if expired
                SELECT COUNT(*) INTO doc_count
                FROM provider_documents 
                WHERE provider_id = provider_uuid 
                AND document_type = doc_type 
                AND expiry_date IS NOT NULL 
                AND expiry_date <= CURRENT_DATE;
                
                IF doc_count > 0 THEN
                    expired_docs := array_append(expired_docs, doc_type::TEXT);
                ELSE
                    missing_docs := array_append(missing_docs, doc_type::TEXT || ' (pending approval)');
                END IF;
            END IF;
        ELSE
            verified_count := verified_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        (verified_count = total_required)::BOOLEAN,
        missing_docs,
        expired_docs,
        ROUND((verified_count::DECIMAL / total_required::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update provider verification status automatically
CREATE OR REPLACE FUNCTION update_provider_verification()
RETURNS TRIGGER AS $$
DECLARE
    verification_result RECORD;
BEGIN
    -- Get verification status
    SELECT * FROM check_provider_verification_status(NEW.provider_id) INTO verification_result;
    
    -- Update provider verification status
    UPDATE providers 
    SET is_verified = verification_result.is_fully_verified,
        updated_at = NOW()
    WHERE id = NEW.provider_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update verification status when documents change
CREATE TRIGGER update_provider_verification_trigger
    AFTER INSERT OR UPDATE OR DELETE ON provider_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_verification();

-- =====================================================
-- AVAILABILITY HELPER FUNCTIONS
-- =====================================================

-- Function to check if provider is available at specific time
CREATE OR REPLACE FUNCTION is_provider_available(
    provider_uuid UUID,
    check_datetime TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    check_day day_of_week;
    check_time TIME;
    check_date DATE;
    availability_count INTEGER;
    time_off_count INTEGER;
BEGIN
    -- Extract components from datetime
    check_day := LOWER(TO_CHAR(check_datetime, 'Day'))::day_of_week;
    check_time := check_datetime::TIME;
    check_date := check_datetime::DATE;
    
    -- Check regular availability
    SELECT COUNT(*) INTO availability_count
    FROM provider_availability
    WHERE provider_id = provider_uuid
    AND day_of_week = check_day
    AND is_available = true
    AND start_time <= check_time
    AND end_time >= check_time
    AND (
        break_start_time IS NULL OR 
        break_end_time IS NULL OR
        check_time < break_start_time OR
        check_time > break_end_time
    );
    
    -- Check time off
    SELECT COUNT(*) INTO time_off_count
    FROM provider_time_off
    WHERE provider_id = provider_uuid
    AND start_date <= check_date
    AND end_date >= check_date
    AND start_time <= check_time
    AND end_time >= check_time;
    
    RETURN (availability_count > 0 AND time_off_count = 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get provider's next available time slots
CREATE OR REPLACE FUNCTION get_provider_availability_slots(
    provider_uuid UUID,
    from_datetime TIMESTAMPTZ,
    days_ahead INTEGER DEFAULT 7,
    slot_duration_minutes INTEGER DEFAULT 120
)
RETURNS TABLE(
    available_datetime TIMESTAMPTZ,
    day_name TEXT,
    slot_duration INTEGER
) AS $$
DECLARE
    current_date DATE;
    end_date DATE;
    current_day day_of_week;
    availability_record RECORD;
    current_datetime TIMESTAMPTZ;
    slot_time TIME;
BEGIN
    current_date := from_datetime::DATE;
    end_date := current_date + days_ahead;
    
    WHILE current_date <= end_date LOOP
        current_day := LOWER(TO_CHAR(current_date, 'Day'))::day_of_week;
        
        -- Get availability for this day
        FOR availability_record IN
            SELECT start_time, end_time, break_start_time, break_end_time
            FROM provider_availability
            WHERE provider_id = provider_uuid
            AND day_of_week = current_day
            AND is_available = true
        LOOP
            -- Generate slots for this availability window
            slot_time := availability_record.start_time;
            
            WHILE slot_time + (slot_duration_minutes || ' minutes')::INTERVAL <= availability_record.end_time LOOP
                current_datetime := (current_date::TEXT || ' ' || slot_time::TEXT)::TIMESTAMPTZ;
                
                -- Skip if in break time
                IF availability_record.break_start_time IS NULL OR 
                   slot_time < availability_record.break_start_time OR 
                   slot_time >= availability_record.break_end_time THEN
                   
                    -- Check if not in time off
                    IF NOT EXISTS (
                        SELECT 1 FROM provider_time_off
                        WHERE provider_id = provider_uuid
                        AND start_date <= current_date
                        AND end_date >= current_date
                        AND start_time <= slot_time
                        AND end_time > slot_time
                    ) THEN
                        RETURN QUERY SELECT 
                            current_datetime,
                            TO_CHAR(current_date, 'Day'),
                            slot_duration_minutes;
                    END IF;
                END IF;
                
                slot_time := slot_time + (slot_duration_minutes || ' minutes')::INTERVAL;
            END LOOP;
        END LOOP;
        
        current_date := current_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE provider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_service_specializations ENABLE ROW LEVEL SECURITY;

-- Provider Documents Policies
CREATE POLICY "Providers can manage their own documents" ON provider_documents 
    FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Admins can view all provider documents" ON provider_documents 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Admins can update document verification status" ON provider_documents 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Provider Availability Policies
CREATE POLICY "Providers can manage their own availability" ON provider_availability 
    FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Public can view provider availability" ON provider_availability 
    FOR SELECT USING (true); -- Needed for booking system

-- Provider Time Off Policies
CREATE POLICY "Providers can manage their own time off" ON provider_time_off 
    FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Public can view provider time off" ON provider_time_off 
    FOR SELECT USING (true); -- Needed for availability checking

-- Provider Specializations Policies
CREATE POLICY "Providers can manage their own specializations" ON provider_service_specializations 
    FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Public can view provider specializations" ON provider_service_specializations 
    FOR SELECT USING (true);

-- =====================================================
-- SAMPLE DATA SETUP
-- =====================================================

-- Function to create sample availability schedule for a provider
CREATE OR REPLACE FUNCTION create_default_availability(provider_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Monday to Friday: 8 AM - 5 PM with lunch break
    INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, break_start_time, break_end_time) VALUES
    (provider_uuid, 'monday', '08:00', '17:00', '12:00', '13:00'),
    (provider_uuid, 'tuesday', '08:00', '17:00', '12:00', '13:00'),
    (provider_uuid, 'wednesday', '08:00', '17:00', '12:00', '13:00'),
    (provider_uuid, 'thursday', '08:00', '17:00', '12:00', '13:00'),
    (provider_uuid, 'friday', '08:00', '17:00', '12:00', '13:00'),
    -- Saturday: Half day
    (provider_uuid, 'saturday', '08:00', '12:00', NULL, NULL)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Display completion message
SELECT 'Provider management enhancements completed successfully!' AS status;
SELECT 'Enhanced provider tables with business info, documents, and availability scheduling.' AS features_added;