-- =====================================================
-- SEED DATA for Development and Testing
-- =====================================================

-- Note: This script assumes you have already run the main schema and PPS extensions

-- Insert sample service categories (if not already present)
INSERT INTO service_categories (name, description) VALUES
    ('Cleaning', 'Home and office cleaning services'),
    ('Handyman', 'General repair and maintenance services'),
    ('Plumbing', 'Plumbing installation, repair, and maintenance'),
    ('Electrical', 'Electrical installation, repair, and maintenance'),
    ('HVAC', 'Heating, ventilation, and air conditioning services'),
    ('Landscaping', 'Garden and yard maintenance services')
ON CONFLICT (name) DO NOTHING;

-- Insert sample services
INSERT INTO services (name, description, category_id, base_price, is_variable_pricing, estimated_duration_minutes) VALUES
    ('House Cleaning', 'Standard house cleaning service', 1, 120.00, true, 120),
    ('Office Cleaning', 'Professional office cleaning', 1, 80.00, true, 90),
    ('Sink Repair', 'Kitchen and bathroom sink repairs', 3, 95.00, false, 60),
    ('Light Installation', 'Install ceiling lights and fixtures', 4, 75.00, false, 45),
    ('AC Maintenance', 'Air conditioning system maintenance', 5, 150.00, false, 90),
    ('Lawn Mowing', 'Regular lawn mowing service', 6, 60.00, true, 60),
    ('Furniture Assembly', 'Assemble furniture and fixtures', 2, 85.00, true, 90),
    ('Toilet Repair', 'Toilet installation and repair', 3, 125.00, false, 75)
ON CONFLICT DO NOTHING;

-- Insert service add-ons
INSERT INTO service_add_ons (service_id, name, description, price, is_active) VALUES
    (1, 'Deep Clean', 'Detailed cleaning including baseboards and windows', 50.00, true),
    (1, 'Inside Oven', 'Clean inside of oven and refrigerator', 35.00, true),
    (2, 'Trash Removal', 'Empty all trash bins and replace liners', 15.00, true),
    (3, 'Garbage Disposal', 'Install or repair garbage disposal unit', 45.00, true),
    (4, 'Dimmer Switch', 'Install dimmer switch instead of regular switch', 25.00, true),
    (5, 'Filter Replacement', 'Replace air filter during maintenance', 30.00, true),
    (6, 'Edge Trimming', 'Trim edges around walkways and flower beds', 25.00, true),
    (7, 'TV Mounting', 'Mount TV on wall after furniture assembly', 75.00, true);

-- Create sample user profiles (you'll need to create these users in Supabase Auth first)
-- These are placeholder UUIDs - replace with actual user IDs from your auth.users table

-- Sample customers
INSERT INTO user_profiles (id, username, full_name, avatar_url, phone_number, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'john_customer', 'John Smith', null, '+1234567890', 'customer'),
    ('22222222-2222-2222-2222-222222222222', 'sarah_customer', 'Sarah Johnson', null, '+1234567891', 'customer'),
    ('33333333-3333-3333-3333-333333333333', 'mike_customer', 'Mike Davis', null, '+1234567892', 'customer')
ON CONFLICT (id) DO NOTHING;

-- Sample providers
INSERT INTO user_profiles (id, username, full_name, avatar_url, phone_number, role) VALUES
    ('44444444-4444-4444-4444-444444444444', 'alex_cleaner', 'Alex Rodriguez', null, '+1234567893', 'provider'),
    ('55555555-5555-5555-5555-555555555555', 'maria_handyman', 'Maria Garcia', null, '+1234567894', 'provider'),
    ('66666666-6666-6666-6666-666666666666', 'tom_plumber', 'Tom Wilson', null, '+1234567895', 'provider'),
    ('77777777-7777-7777-7777-777777777777', 'lisa_electric', 'Lisa Chen', null, '+1234567896', 'provider'),
    ('88888888-8888-8888-8888-888888888888', 'david_hvac', 'David Thompson', null, '+1234567897', 'provider')
ON CONFLICT (id) DO NOTHING;

-- Sample admin
INSERT INTO user_profiles (id, username, full_name, avatar_url, phone_number, role) VALUES
    ('99999999-9999-9999-9999-999999999999', 'admin_user', 'Admin User', null, '+1234567899', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Create provider profiles
INSERT INTO providers (id, bio, onboarding_status, is_verified, hourly_rate) VALUES
    ('44444444-4444-4444-4444-444444444444', 'Professional house cleaner with 5+ years experience. Specializing in deep cleaning and eco-friendly products.', 'active', true, 35.00),
    ('55555555-5555-5555-5555-555555555555', 'Experienced handyman offering furniture assembly, basic repairs, and home improvement services.', 'active', true, 45.00),
    ('66666666-6666-6666-6666-666666666666', 'Licensed plumber with 10+ years experience. Available for repairs, installations, and emergencies.', 'active', true, 65.00),
    ('77777777-7777-7777-7777-777777777777', 'Certified electrician specializing in residential electrical work and lighting installations.', 'active', true, 55.00),
    ('88888888-8888-8888-8888-888888888888', 'HVAC technician with expertise in AC maintenance, repair, and installation.', 'active', true, 70.00)
ON CONFLICT (id) DO NOTHING;

-- Assign services to providers
INSERT INTO provider_services (provider_id, service_id) VALUES
    -- Alex (cleaner)
    ('44444444-4444-4444-4444-444444444444', 1), -- House Cleaning
    ('44444444-4444-4444-4444-444444444444', 2), -- Office Cleaning
    -- Maria (handyman)  
    ('55555555-5555-5555-5555-555555555555', 7), -- Furniture Assembly
    -- Tom (plumber)
    ('66666666-6666-6666-6666-666666666666', 3), -- Sink Repair
    ('66666666-6666-6666-6666-666666666666', 8), -- Toilet Repair
    -- Lisa (electrician)
    ('77777777-7777-7777-7777-777777777777', 4), -- Light Installation
    -- David (HVAC)
    ('88888888-8888-8888-8888-888888888888', 5)  -- AC Maintenance
ON CONFLICT DO NOTHING;

-- Sample addresses
INSERT INTO user_addresses (user_id, address_label, street_address, city, state, postal_code, country_code, latitude, longitude, is_primary) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Home', '123 Main St', 'Austin', 'TX', '78701', 'US', 30.2672, -97.7431, true),
    ('22222222-2222-2222-2222-222222222222', 'Home', '456 Oak Ave', 'Austin', 'TX', '78704', 'US', 30.2500, -97.7500, true),
    ('33333333-3333-3333-3333-333333333333', 'Home', '789 Pine Rd', 'Austin', 'TX', '78702', 'US', 30.2800, -97.7300, true)
ON CONFLICT DO NOTHING;

-- Sample provider service coverage areas
INSERT INTO provider_service_coverage (provider_id, coverage_type, center_latitude, center_longitude, max_radius_miles, preferred_max_distance_miles, is_active) VALUES
    ('44444444-4444-4444-4444-444444444444', 'radius', 30.2672, -97.7431, 25, 15, true), -- Alex
    ('55555555-5555-5555-5555-555555555555', 'radius', 30.2700, -97.7400, 20, 12, true), -- Maria  
    ('66666666-6666-6666-6666-666666666666', 'radius', 30.2650, -97.7450, 30, 20, true), -- Tom
    ('77777777-7777-7777-7777-777777777777', 'radius', 30.2600, -97.7400, 25, 15, true), -- Lisa
    ('88888888-8888-8888-8888-888888888888', 'radius', 30.2750, -97.7500, 35, 25, true)  -- David
ON CONFLICT DO NOTHING;

-- Initialize provider performance metrics with some base data
INSERT INTO provider_performance_metrics (provider_id, jobs_completed, jobs_offered, jobs_accepted, on_time_arrivals, current_pps_score) VALUES
    ('44444444-4444-4444-4444-444444444444', 45, 50, 48, 43, 85.5), -- Alex - good performer
    ('55555555-5555-5555-5555-555555555555', 32, 40, 35, 30, 78.2), -- Maria - decent performer
    ('66666666-6666-6666-6666-666666666666', 67, 70, 68, 65, 92.1), -- Tom - excellent performer
    ('77777777-7777-7777-7777-777777777777', 28, 35, 30, 26, 74.8), -- Lisa - newer provider
    ('88888888-8888-8888-8888-888888888888', 53, 60, 56, 51, 88.3)  -- David - very good performer
ON CONFLICT DO NOTHING;

-- Sample bookings
INSERT INTO bookings (customer_id, provider_id, service_id, scheduled_start_time, scheduled_end_time, status, address_id, customer_notes, estimated_cost, assignment_method) VALUES
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 1, '2024-01-15 10:00:00+00', '2024-01-15 12:00:00+00', 'completed', 1, 'Please focus on the kitchen and bathrooms', 170.00, 'manual'),
    ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 3, '2024-01-16 14:00:00+00', '2024-01-16 15:00:00+00', 'completed', 2, 'Kitchen sink is completely blocked', 95.00, 'auto_pps'),
    ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 7, '2024-01-17 09:00:00+00', '2024-01-17 10:30:00+00', 'in_progress', 3, 'IKEA dresser and nightstand', 160.00, 'auto_pps')
ON CONFLICT DO NOTHING;

-- Sample reviews
INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment) VALUES
    (1, '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 5, 'Excellent cleaning service! Very thorough and professional.'),
    (2, '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 5, 'Fixed the sink quickly and explained what was wrong. Highly recommend!')
ON CONFLICT DO NOTHING;

-- Sample performance history records
INSERT INTO provider_performance_history (provider_id, booking_id, distance_miles, was_on_time, was_completed, customer_rating) VALUES
    ('44444444-4444-4444-4444-444444444444', 1, 5.2, true, true, 5),
    ('66666666-6666-6666-6666-666666666666', 2, 3.8, true, true, 5)
ON CONFLICT DO NOTHING;

-- Sample notifications
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
    ('44444444-4444-4444-4444-444444444444', 'Booking Completed', 'Your cleaning service at 123 Main St has been marked as completed. Thank you!', 'booking_alert', true),
    ('66666666-6666-6666-6666-666666666666', 'Great Review!', 'You received a 5-star review from Sarah Johnson. Keep up the excellent work!', 'review', false),
    ('11111111-1111-1111-1111-111111111111', 'Service Complete', 'Your house cleaning service is complete. Please rate your experience.', 'booking_alert', false)
ON CONFLICT DO NOTHING;

-- Update sequences to avoid conflicts with seed data
SELECT setval('service_categories_id_seq', 100);
SELECT setval('services_id_seq', 100); 
SELECT setval('service_add_ons_id_seq', 100);
SELECT setval('user_addresses_id_seq', 100);
SELECT setval('bookings_id_seq', 100);
SELECT setval('reviews_id_seq', 100);
SELECT setval('notifications_id_seq', 100);

-- Display summary
SELECT 'Database seeded successfully!' as status;
SELECT 'Providers created: ' || count(*) as providers FROM providers;
SELECT 'Services created: ' || count(*) as services FROM services;  
SELECT 'Bookings created: ' || count(*) as bookings FROM bookings;
SELECT 'Performance metrics initialized: ' || count(*) as metrics FROM provider_performance_metrics;