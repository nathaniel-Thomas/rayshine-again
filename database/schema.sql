-- =====================================================
-- RAYSHINE MARKETPLACE DATABASE SCHEMA
-- Complete Supabase database schema with authentication & roles
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS AND TYPES
-- =====================================================

-- User role enum supporting customer, provider, and admin roles
CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');

-- Provider onboarding status
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'documents_submitted', 'under_review', 'active', 'suspended', 'rejected');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Assignment method
CREATE TYPE assignment_method AS ENUM ('manual', 'auto_pps', 'auto_distance');

-- Coverage type for service areas
CREATE TYPE coverage_type AS ENUM ('radius', 'polygon', 'postal_codes');

-- =====================================================
-- CORE USER TABLES
-- =====================================================

-- User profiles table (extends auth.users)
-- This is the main table for user authentication and roles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone_number VARCHAR(20),
    role user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    password_reset_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SERVICE MANAGEMENT TABLES
-- =====================================================

-- Service categories
CREATE TABLE service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services offered
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL,
    base_price DECIMAL(10,2) NOT NULL,
    is_variable_pricing BOOLEAN DEFAULT false,
    estimated_duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Service add-ons
CREATE TABLE service_add_ons (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROVIDER MANAGEMENT TABLES
-- =====================================================

-- Provider profiles
CREATE TABLE providers (
    id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    bio TEXT,
    onboarding_status onboarding_status DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(8,2),
    background_check_completed BOOLEAN DEFAULT false,
    background_check_date TIMESTAMPTZ,
    insurance_verified BOOLEAN DEFAULT false,
    insurance_expiry_date DATE,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_jobs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_providers_updated_at 
    BEFORE UPDATE ON providers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Provider services (what services each provider offers)
CREATE TABLE provider_services (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    custom_rate DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, service_id)
);

-- =====================================================
-- ADDRESS AND LOCATION TABLES
-- =====================================================

-- User addresses
CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    address_label VARCHAR(50) DEFAULT 'Home',
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country_code CHAR(2) DEFAULT 'US',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location GEOGRAPHY(POINT, 4326),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_user_addresses_updated_at 
    BEFORE UPDATE ON user_addresses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-populate location from lat/lng
CREATE OR REPLACE FUNCTION update_location_from_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_address_location 
    BEFORE INSERT OR UPDATE ON user_addresses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_location_from_coordinates();

-- =====================================================
-- BOOKING SYSTEM TABLES
-- =====================================================

-- Bookings
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    scheduled_start_time TIMESTAMPTZ NOT NULL,
    scheduled_end_time TIMESTAMPTZ NOT NULL,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    status booking_status DEFAULT 'pending',
    address_id INTEGER REFERENCES user_addresses(id) ON DELETE CASCADE,
    customer_notes TEXT,
    provider_notes TEXT,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    assignment_method assignment_method DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Booking add-ons (selected add-ons for a booking)
CREATE TABLE booking_add_ons (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    add_on_id INTEGER REFERENCES service_add_ons(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    price_at_booking DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REVIEW AND RATING TABLES
-- =====================================================

-- Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NOTIFICATION SYSTEM
-- =====================================================

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- =====================================================
-- PROVIDER SERVICE COVERAGE
-- =====================================================

-- Provider service coverage areas
CREATE TABLE provider_service_coverage (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    coverage_type coverage_type NOT NULL,
    center_latitude DECIMAL(10,8),
    center_longitude DECIMAL(11,8),
    center_location GEOGRAPHY(POINT, 4326),
    max_radius_miles DECIMAL(6,2),
    preferred_max_distance_miles DECIMAL(6,2),
    coverage_polygon GEOGRAPHY(POLYGON, 4326),
    postal_codes TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_provider_service_coverage_updated_at 
    BEFORE UPDATE ON provider_service_coverage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-populate center_location from coordinates
CREATE OR REPLACE FUNCTION update_center_location_from_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.center_latitude IS NOT NULL AND NEW.center_longitude IS NOT NULL THEN
        NEW.center_location = ST_SetSRID(ST_MakePoint(NEW.center_longitude, NEW.center_latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coverage_center_location 
    BEFORE INSERT OR UPDATE ON provider_service_coverage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_center_location_from_coordinates();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_service_coverage ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Public can view provider profiles" ON user_profiles FOR SELECT USING (role = 'provider');

-- Providers Policies
CREATE POLICY "Providers can view their own profile" ON providers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Providers can update their own profile" ON providers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all providers" ON providers FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Public can view verified providers" ON providers FOR SELECT USING (is_verified = true);

-- User Addresses Policies
CREATE POLICY "Users can manage their own addresses" ON user_addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Providers can view customer addresses for their bookings" ON user_addresses FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bookings 
        WHERE bookings.address_id = user_addresses.id 
        AND bookings.provider_id = auth.uid()
    )
);

-- Bookings Policies
CREATE POLICY "Customers can view their own bookings" ON bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Providers can view their assigned bookings" ON bookings FOR SELECT USING (auth.uid() = provider_id);
CREATE POLICY "Customers can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Providers can update their assigned bookings" ON bookings FOR UPDATE USING (auth.uid() = provider_id);
CREATE POLICY "Admins can manage all bookings" ON bookings FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Reviews Policies
CREATE POLICY "Users can view public reviews" ON reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view reviews they wrote or received" ON reviews FOR SELECT USING (
    auth.uid() = reviewer_id OR auth.uid() = reviewee_id
);
CREATE POLICY "Users can create reviews for their bookings" ON reviews FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND 
    EXISTS (
        SELECT 1 FROM bookings 
        WHERE bookings.id = booking_id 
        AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
        AND bookings.status = 'completed'
    )
);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- DATABASE FUNCTIONS FOR USER MANAGEMENT
-- =====================================================

-- Function to create user profile on sign up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'customer');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result
    FROM user_profiles
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_role_result, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote user to provider
CREATE OR REPLACE FUNCTION promote_to_provider(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update user role
    UPDATE user_profiles 
    SET role = 'provider', updated_at = NOW() 
    WHERE id = user_uuid;
    
    -- Create provider profile
    INSERT INTO providers (id, onboarding_status)
    VALUES (user_uuid, 'pending')
    ON CONFLICT (id) DO NOTHING;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update provider average rating
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE providers 
    SET average_rating = (
        SELECT ROUND(AVG(rating::DECIMAL), 2)
        FROM reviews 
        WHERE reviewee_id = NEW.reviewee_id
    ),
    updated_at = NOW()
    WHERE id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update provider rating when review is added
CREATE TRIGGER update_provider_rating_trigger
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_rating();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- Providers indexes
CREATE INDEX idx_providers_onboarding_status ON providers(onboarding_status);
CREATE INDEX idx_providers_is_verified ON providers(is_verified);
CREATE INDEX idx_providers_average_rating ON providers(average_rating DESC);

-- Services indexes
CREATE INDEX idx_services_category_id ON services(category_id);
CREATE INDEX idx_services_is_active ON services(is_active);

-- Bookings indexes
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled_start_time ON bookings(scheduled_start_time);

-- Addresses indexes
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_location ON user_addresses USING GIST(location);

-- Reviews indexes
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Provider service coverage indexes
CREATE INDEX idx_provider_service_coverage_provider_id ON provider_service_coverage(provider_id);
CREATE INDEX idx_provider_service_coverage_center_location ON provider_service_coverage USING GIST(center_location);
CREATE INDEX idx_provider_service_coverage_polygon ON provider_service_coverage USING GIST(coverage_polygon);

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default service categories
INSERT INTO service_categories (name, description) VALUES
    ('Cleaning', 'Home and office cleaning services'),
    ('Handyman', 'General repair and maintenance services'),
    ('Plumbing', 'Plumbing installation, repair, and maintenance'),
    ('Electrical', 'Electrical installation, repair, and maintenance'),
    ('HVAC', 'Heating, ventilation, and air conditioning services'),
    ('Landscaping', 'Garden and yard maintenance services');

-- Display success message
SELECT 'Database schema created successfully!' AS status;
SELECT 'Core user authentication and role management system is now ready.' AS message;