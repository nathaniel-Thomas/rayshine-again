-- =====================================================
-- SERVICE CATALOG AND BOOKING LIFECYCLE ENHANCEMENTS
-- Enhanced service management and comprehensive booking lifecycle
-- =====================================================

-- Execute this AFTER running schema.sql
-- This enhances the basic service and booking system with advanced features

-- =====================================================
-- ENHANCED SERVICE CATALOG ENUMS
-- =====================================================

-- Service pricing types
CREATE TYPE pricing_type AS ENUM ('fixed', 'hourly', 'square_footage', 'room_count', 'custom');

-- Service difficulty levels
CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'difficult', 'expert');

-- Booking priority levels
CREATE TYPE booking_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Special requirements
CREATE TYPE special_requirement AS ENUM (
    'equipment_provided', 'materials_included', 'cleanup_included',
    'background_check_required', 'insurance_required', 'license_required',
    'weekend_available', 'evening_available', 'emergency_service'
);

-- =====================================================
-- ENHANCED SERVICE CATEGORIES WITH HIERARCHY
-- =====================================================

-- Enhance existing service_categories table
ALTER TABLE service_categories 
ADD COLUMN IF NOT EXISTS parent_category_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category_level INTEGER DEFAULT 1 CHECK (category_level >= 1 AND category_level <= 5),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
ADD COLUMN IF NOT EXISTS requires_license BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS average_duration_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS category_image_url TEXT,
ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Create function to generate category hierarchy path
CREATE OR REPLACE FUNCTION get_category_path(category_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    path TEXT := '';
    current_id INTEGER := category_id;
    current_name TEXT;
    parent_id INTEGER;
BEGIN
    WHILE current_id IS NOT NULL LOOP
        SELECT name, parent_category_id 
        INTO current_name, parent_id
        FROM service_categories 
        WHERE id = current_id;
        
        IF path = '' THEN
            path := current_name;
        ELSE
            path := current_name || ' > ' || path;
        END IF;
        
        current_id := parent_id;
    END LOOP;
    
    RETURN path;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for category hierarchy
CREATE INDEX IF NOT EXISTS idx_service_categories_parent ON service_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_level ON service_categories(category_level);
CREATE INDEX IF NOT EXISTS idx_service_categories_sort ON service_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON service_categories(seo_slug);

-- =====================================================
-- ENHANCED SERVICES TABLE
-- =====================================================

-- Enhance existing services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS service_code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS pricing_type pricing_type DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS minimum_charge DECIMAL(8,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS difficulty_level difficulty_level DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS requires_consultation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consultation_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS min_advance_booking_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS special_requirements special_requirement[],
ADD COLUMN IF NOT EXISTS service_image_urls TEXT[],
ADD COLUMN IF NOT EXISTS instruction_video_url TEXT,
ADD COLUMN IF NOT EXISTS preparation_instructions TEXT,
ADD COLUMN IF NOT EXISTS what_included TEXT,
ADD COLUMN IF NOT EXISTS what_not_included TEXT,
ADD COLUMN IF NOT EXISTS service_guarantee_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(200) UNIQUE,
ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200),
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Service pricing tiers (for different service levels)
CREATE TABLE service_pricing_tiers (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    tier_name VARCHAR(100) NOT NULL, -- Basic, Standard, Premium
    tier_description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    max_square_footage INTEGER,
    max_rooms INTEGER,
    included_features TEXT[],
    additional_benefits TEXT,
    is_most_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(service_id, tier_name)
);

-- Service packages (bundled services)
CREATE TABLE service_packages (
    id SERIAL PRIMARY KEY,
    package_name VARCHAR(200) NOT NULL,
    description TEXT,
    total_duration_minutes INTEGER,
    package_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_seasonal BOOLEAN DEFAULT false,
    season_start_date DATE,
    season_end_date DATE,
    max_bookings_per_customer INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_service_packages_updated_at 
    BEFORE UPDATE ON service_packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Package services (services included in packages)
CREATE TABLE package_services (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES service_packages(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    custom_duration_minutes INTEGER, -- Override service default duration
    sort_order INTEGER DEFAULT 0,
    
    UNIQUE(package_id, service_id)
);

-- Service questionnaire (for custom pricing)
CREATE TABLE service_questions (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'text', -- text, number, select, multiselect, boolean, file
    options JSONB, -- For select/multiselect questions
    is_required BOOLEAN DEFAULT false,
    affects_pricing BOOLEAN DEFAULT false,
    pricing_multiplier DECIMAL(5,3) DEFAULT 1.000,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for service enhancements
CREATE INDEX IF NOT EXISTS idx_services_service_code ON services(service_code);
CREATE INDEX IF NOT EXISTS idx_services_pricing_type ON services(pricing_type);
CREATE INDEX IF NOT EXISTS idx_services_difficulty ON services(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(seo_slug);
CREATE INDEX IF NOT EXISTS idx_service_pricing_tiers_service_id ON service_pricing_tiers(service_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON service_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_service_questions_service_id ON service_questions(service_id);

-- =====================================================
-- ENHANCED BOOKINGS TABLE
-- =====================================================

-- Enhance existing bookings table with lifecycle tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(20) UNIQUE DEFAULT 'BK' || LPAD(nextval('bookings_id_seq')::TEXT, 8, '0'),
ADD COLUMN IF NOT EXISTS priority booking_priority DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS service_tier_id INTEGER REFERENCES service_pricing_tiers(id),
ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES service_packages(id),

-- Timeline tracking fields
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider_en_route_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider_arrived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS work_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,

-- Pricing breakdown
ADD COLUMN IF NOT EXISTS service_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS add_ons_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS materials_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS travel_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rush_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00,

-- Special instructions and requirements
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS access_instructions TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20) DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS parking_instructions TEXT,
ADD COLUMN IF NOT EXISTS pet_information TEXT,
ADD COLUMN IF NOT EXISTS equipment_needed TEXT,
ADD COLUMN IF NOT EXISTS materials_provided_by VARCHAR(20) DEFAULT 'provider', -- provider, customer, both

-- Service details
ADD COLUMN IF NOT EXISTS square_footage INTEGER,
ADD COLUMN IF NOT EXISTS room_count INTEGER,
ADD COLUMN IF NOT EXISTS floor_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS difficulty_notes TEXT,

-- Follow-up and warranty
ADD COLUMN IF NOT EXISTS warranty_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_date DATE,
ADD COLUMN IF NOT EXISTS completion_photos_urls TEXT[],
ADD COLUMN IF NOT EXISTS before_photos_urls TEXT[];

-- Booking questionnaire responses
CREATE TABLE booking_question_responses (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES service_questions(id) ON DELETE CASCADE,
    response_text TEXT,
    response_number DECIMAL(10,2),
    response_boolean BOOLEAN,
    response_file_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(booking_id, question_id)
);

-- Booking status history (audit trail)
CREATE TABLE booking_status_history (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    previous_status booking_status,
    new_status booking_status NOT NULL,
    changed_by UUID REFERENCES user_profiles(id),
    change_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced booking add-ons with pricing at time of booking
ALTER TABLE booking_add_ons 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0.00;

-- Add indexes for booking enhancements
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON bookings(priority);
CREATE INDEX IF NOT EXISTS idx_bookings_accepted_at ON bookings(accepted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed_at ON bookings(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_booking_question_responses_booking_id ON booking_question_responses(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);

-- =====================================================
-- BOOKING LIFECYCLE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to calculate total booking cost
CREATE OR REPLACE FUNCTION calculate_booking_total(booking_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total DECIMAL(10,2) := 0.00;
    booking_record RECORD;
BEGIN
    SELECT * FROM bookings WHERE id = booking_id INTO booking_record;
    
    IF booking_record IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Base service cost
    total := COALESCE(booking_record.service_cost, 0.00);
    
    -- Add-ons cost
    total := total + COALESCE(booking_record.add_ons_cost, 0.00);
    
    -- Materials cost
    total := total + COALESCE(booking_record.materials_cost, 0.00);
    
    -- Travel cost
    total := total + COALESCE(booking_record.travel_cost, 0.00);
    
    -- Rush fee
    total := total + COALESCE(booking_record.rush_fee, 0.00);
    
    -- Apply discount
    total := total - COALESCE(booking_record.discount_amount, 0.00);
    
    -- Add tax
    total := total + COALESCE(booking_record.tax_amount, 0.00);
    
    -- Add tip
    total := total + COALESCE(booking_record.tip_amount, 0.00);
    
    -- Update final_cost in booking
    UPDATE bookings 
    SET final_cost = total, updated_at = NOW() 
    WHERE id = booking_id;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to update booking status with history tracking
CREATE OR REPLACE FUNCTION update_booking_status(
    p_booking_id INTEGER,
    p_new_status booking_status,
    p_changed_by UUID,
    p_change_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status booking_status;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Get current status
    SELECT status INTO old_status FROM bookings WHERE id = p_booking_id;
    
    IF old_status IS NULL THEN
        RETURN false; -- Booking not found
    END IF;
    
    IF old_status = p_new_status THEN
        RETURN true; -- No change needed
    END IF;
    
    -- Update booking status and timestamp fields
    UPDATE bookings 
    SET status = p_new_status,
        updated_at = current_time,
        -- Update relevant timestamp fields
        accepted_at = CASE WHEN p_new_status = 'confirmed' AND accepted_at IS NULL THEN current_time ELSE accepted_at END,
        confirmed_at = CASE WHEN p_new_status = 'confirmed' AND confirmed_at IS NULL THEN current_time ELSE confirmed_at END,
        work_started_at = CASE WHEN p_new_status = 'in_progress' AND work_started_at IS NULL THEN current_time ELSE work_started_at END,
        work_completed_at = CASE WHEN p_new_status = 'completed' AND work_completed_at IS NULL THEN current_time ELSE work_completed_at END
    WHERE id = p_booking_id;
    
    -- Record status change in history
    INSERT INTO booking_status_history (
        booking_id, previous_status, new_status, changed_by, change_reason, notes
    ) VALUES (
        p_booking_id, old_status, p_new_status, p_changed_by, p_change_reason, p_notes
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    reference TEXT;
    year_code TEXT;
    random_part TEXT;
BEGIN
    -- Get year code (last 2 digits of year)
    year_code := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
    
    -- Generate random alphanumeric string
    random_part := UPPER(substring(md5(random()::text) from 1 for 6));
    
    reference := 'RB' || year_code || random_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM bookings WHERE booking_reference = reference) LOOP
        random_part := UPPER(substring(md5(random()::text) from 1 for 6));
        reference := 'RB' || year_code || random_part;
    END LOOP;
    
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Function to check booking conflicts for provider
CREATE OR REPLACE FUNCTION check_provider_availability(
    p_provider_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_booking_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE provider_id = p_provider_id
    AND status NOT IN ('cancelled', 'completed')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
        (scheduled_start_time <= p_start_time AND scheduled_end_time > p_start_time) OR
        (scheduled_start_time < p_end_time AND scheduled_end_time >= p_end_time) OR
        (scheduled_start_time >= p_start_time AND scheduled_end_time <= p_end_time)
    );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get service pricing based on booking details
CREATE OR REPLACE FUNCTION calculate_service_pricing(
    p_service_id INTEGER,
    p_square_footage INTEGER DEFAULT NULL,
    p_room_count INTEGER DEFAULT NULL,
    p_duration_hours DECIMAL DEFAULT NULL,
    p_tier_id INTEGER DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    service_record RECORD;
    tier_record RECORD;
    calculated_price DECIMAL(10,2) := 0.00;
BEGIN
    -- Get service details
    SELECT * FROM services WHERE id = p_service_id INTO service_record;
    
    IF service_record IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Check if tier pricing is requested
    IF p_tier_id IS NOT NULL THEN
        SELECT * FROM service_pricing_tiers 
        WHERE id = p_tier_id AND service_id = p_service_id 
        INTO tier_record;
        
        IF tier_record IS NOT NULL THEN
            RETURN tier_record.base_price;
        END IF;
    END IF;
    
    -- Calculate based on pricing type
    CASE service_record.pricing_type
        WHEN 'fixed' THEN
            calculated_price := service_record.base_price;
            
        WHEN 'hourly' THEN
            IF p_duration_hours IS NOT NULL AND service_record.hourly_rate IS NOT NULL THEN
                calculated_price := service_record.hourly_rate * p_duration_hours;
            ELSE
                calculated_price := service_record.base_price;
            END IF;
            
        WHEN 'square_footage' THEN
            IF p_square_footage IS NOT NULL THEN
                -- Base price per 100 sq ft
                calculated_price := service_record.base_price * (p_square_footage / 100.0);
            ELSE
                calculated_price := service_record.base_price;
            END IF;
            
        WHEN 'room_count' THEN
            IF p_room_count IS NOT NULL THEN
                calculated_price := service_record.base_price * p_room_count;
            ELSE
                calculated_price := service_record.base_price;
            END IF;
            
        ELSE
            calculated_price := service_record.base_price;
    END CASE;
    
    -- Apply minimum charge
    IF service_record.minimum_charge IS NOT NULL THEN
        calculated_price := GREATEST(calculated_price, service_record.minimum_charge);
    END IF;
    
    RETURN calculated_price;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE service_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

-- Service pricing tiers policies (public read)
CREATE POLICY "Anyone can view active service pricing tiers" ON service_pricing_tiers 
    FOR SELECT USING (is_active = true);

-- Service packages policies (public read)
CREATE POLICY "Anyone can view active service packages" ON service_packages 
    FOR SELECT USING (is_active = true);

-- Package services policies (public read)
CREATE POLICY "Anyone can view package services" ON package_services 
    FOR SELECT USING (true);

-- Service questions policies (public read for booking)
CREATE POLICY "Anyone can view active service questions" ON service_questions 
    FOR SELECT USING (is_active = true);

-- Booking question responses policies
CREATE POLICY "Customers can manage their booking responses" ON booking_question_responses 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_question_responses.booking_id 
            AND customer_id = auth.uid()
        )
    );
CREATE POLICY "Providers can view responses for their bookings" ON booking_question_responses 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_question_responses.booking_id 
            AND provider_id = auth.uid()
        )
    );

-- Booking status history policies
CREATE POLICY "Users can view history for their bookings" ON booking_status_history 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_status_history.booking_id 
            AND (customer_id = auth.uid() OR provider_id = auth.uid())
        )
    );

-- =====================================================
-- SAMPLE DATA FOR ENHANCED CATALOG
-- =====================================================

-- Update existing service categories with hierarchy
UPDATE service_categories SET 
    commission_rate = 15.00,
    category_level = 1,
    sort_order = id * 10
WHERE parent_category_id IS NULL;

-- Add some subcategories
INSERT INTO service_categories (name, description, parent_category_id, category_level, sort_order, commission_rate) VALUES
('Deep Cleaning', 'Thorough deep cleaning services', 1, 2, 11, 15.00),
('Regular Cleaning', 'Routine cleaning and maintenance', 1, 2, 12, 12.00),
('Kitchen Repairs', 'Kitchen-specific repair services', 2, 2, 21, 18.00),
('Bathroom Repairs', 'Bathroom-specific repair services', 2, 2, 22, 18.00)
ON CONFLICT (name) DO NOTHING;

-- Add service pricing tiers for house cleaning
INSERT INTO service_pricing_tiers (service_id, tier_name, tier_description, base_price, duration_minutes, included_features, is_most_popular) VALUES
(1, 'Basic', 'Essential cleaning services', 80.00, 120, ARRAY['Vacuum', 'Dust surfaces', 'Bathroom clean', 'Kitchen clean'], false),
(1, 'Standard', 'Comprehensive cleaning package', 120.00, 180, ARRAY['Everything in Basic', 'Inside oven', 'Inside refrigerator', 'Baseboards'], true),
(1, 'Premium', 'Complete deep cleaning service', 180.00, 240, ARRAY['Everything in Standard', 'Inside cabinets', 'Light fixtures', 'Wall washing'], false)
ON CONFLICT (service_id, tier_name) DO NOTHING;

-- Display completion message
SELECT 'Service catalog and booking lifecycle enhancements completed successfully!' AS status;
SELECT 'Enhanced services with pricing tiers, packages, and comprehensive booking lifecycle management.' AS features_added;