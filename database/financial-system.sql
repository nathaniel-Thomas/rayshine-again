-- =====================================================
-- FINANCIAL TRANSACTIONS AND PAYOUT SYSTEM
-- Comprehensive financial tracking, payments, and provider payouts
-- =====================================================

-- Execute this AFTER running schema.sql and service-booking-enhancements.sql
-- This implements the complete financial infrastructure for the marketplace

-- =====================================================
-- FINANCIAL ENUMS AND TYPES
-- =====================================================

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
    'payment', 'refund', 'partial_refund', 'chargeback',
    'payout', 'commission', 'platform_fee', 'adjustment',
    'bonus', 'penalty', 'tip', 'tax'
);

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 
    'cancelled', 'disputed', 'reversed'
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
    'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet',
    'apple_pay', 'google_pay', 'stripe', 'paypal', 'cash'
);

-- Payout status
CREATE TYPE payout_status AS ENUM (
    'scheduled', 'processing', 'completed', 'failed', 'cancelled'
);

-- Payout frequency
CREATE TYPE payout_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

-- Dispute status
CREATE TYPE dispute_status AS ENUM ('pending', 'investigating', 'resolved', 'escalated', 'closed');

-- =====================================================
-- CORE FINANCIAL TABLES
-- =====================================================

-- Financial transactions (all money movements)
CREATE TABLE financial_transactions (
    id SERIAL PRIMARY KEY,
    transaction_reference VARCHAR(50) UNIQUE NOT NULL DEFAULT 'TX' || LPAD(nextval('financial_transactions_id_seq')::TEXT, 10, '0'),
    
    -- Related entities
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',
    payment_method payment_method,
    
    -- Amount breakdown
    gross_amount DECIMAL(12,2) NOT NULL CHECK (gross_amount >= 0),
    commission_rate DECIMAL(5,2) DEFAULT 15.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    commission_amount DECIMAL(12,2) DEFAULT 0.00 CHECK (commission_amount >= 0),
    platform_fee DECIMAL(12,2) DEFAULT 0.00 CHECK (platform_fee >= 0),
    processing_fee DECIMAL(12,2) DEFAULT 0.00 CHECK (processing_fee >= 0),
    tax_amount DECIMAL(12,2) DEFAULT 0.00 CHECK (tax_amount >= 0),
    tip_amount DECIMAL(12,2) DEFAULT 0.00 CHECK (tip_amount >= 0),
    net_amount DECIMAL(12,2) NOT NULL, -- Amount after all deductions
    
    -- Provider earnings
    provider_earnings DECIMAL(12,2) DEFAULT 0.00 CHECK (provider_earnings >= 0),
    
    -- External payment processor details
    stripe_payment_intent_id VARCHAR(200),
    stripe_charge_id VARCHAR(200),
    stripe_transfer_id VARCHAR(200),
    external_transaction_id VARCHAR(200),
    external_reference VARCHAR(200),
    
    -- Timing
    processed_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metadata and notes
    description TEXT,
    internal_notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_financial_transactions_updated_at 
    BEFORE UPDATE ON financial_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Provider payout records
CREATE TABLE provider_payouts (
    id SERIAL PRIMARY KEY,
    payout_reference VARCHAR(50) UNIQUE NOT NULL DEFAULT 'PO' || LPAD(nextval('provider_payouts_id_seq')::TEXT, 10, '0'),
    
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Payout period
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    -- Payout amounts
    total_earnings DECIMAL(12,2) NOT NULL CHECK (total_earnings >= 0),
    total_commission DECIMAL(12,2) NOT NULL CHECK (total_commission >= 0),
    total_fees DECIMAL(12,2) DEFAULT 0.00 CHECK (total_fees >= 0),
    adjustments DECIMAL(12,2) DEFAULT 0.00, -- Can be positive or negative
    net_payout_amount DECIMAL(12,2) NOT NULL CHECK (net_payout_amount >= 0),
    
    -- Payout details
    transaction_count INTEGER DEFAULT 0,
    booking_count INTEGER DEFAULT 0,
    status payout_status DEFAULT 'scheduled',
    
    -- Payment method details
    payout_method VARCHAR(50) DEFAULT 'bank_transfer',
    bank_account_last4 VARCHAR(4),
    
    -- External processor details
    stripe_payout_id VARCHAR(200),
    external_payout_id VARCHAR(200),
    
    -- Timing
    scheduled_date DATE NOT NULL,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_provider_payouts_updated_at 
    BEFORE UPDATE ON provider_payouts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Junction table for transactions included in payouts
CREATE TABLE payout_transactions (
    id SERIAL PRIMARY KEY,
    payout_id INTEGER REFERENCES provider_payouts(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES financial_transactions(id) ON DELETE CASCADE,
    included_amount DECIMAL(12,2) NOT NULL CHECK (included_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(payout_id, transaction_id)
);

-- Provider payout preferences
CREATE TABLE provider_payout_preferences (
    id SERIAL PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE UNIQUE,
    
    -- Payout frequency and timing
    payout_frequency payout_frequency DEFAULT 'weekly',
    payout_day INTEGER DEFAULT 1 CHECK (payout_day >= 1 AND payout_day <= 31), -- Day of week/month
    minimum_payout_amount DECIMAL(10,2) DEFAULT 25.00 CHECK (minimum_payout_amount >= 0),
    
    -- Bank account details (encrypted in practice)
    bank_account_holder_name VARCHAR(200),
    bank_name VARCHAR(200),
    account_number_encrypted TEXT, -- Would be encrypted
    routing_number_encrypted TEXT, -- Would be encrypted
    account_type VARCHAR(20) DEFAULT 'checking', -- checking, savings
    
    -- Alternative payout methods
    paypal_email VARCHAR(200),
    stripe_account_id VARCHAR(200),
    
    -- Preferences
    auto_payout_enabled BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_provider_payout_preferences_updated_at 
    BEFORE UPDATE ON provider_payout_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINANCIAL DISPUTES AND ADJUSTMENTS
-- =====================================================

-- Dispute management
CREATE TABLE financial_disputes (
    id SERIAL PRIMARY KEY,
    dispute_reference VARCHAR(50) UNIQUE NOT NULL DEFAULT 'DS' || LPAD(nextval('financial_disputes_id_seq')::TEXT, 8, '0'),
    
    transaction_id INTEGER REFERENCES financial_transactions(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Dispute details
    disputed_amount DECIMAL(12,2) NOT NULL CHECK (disputed_amount > 0),
    dispute_reason TEXT NOT NULL,
    customer_explanation TEXT,
    provider_response TEXT,
    
    status dispute_status DEFAULT 'pending',
    priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 5),
    
    -- Resolution
    resolution_notes TEXT,
    resolved_amount DECIMAL(12,2) DEFAULT 0.00 CHECK (resolved_amount >= 0),
    resolved_by UUID REFERENCES user_profiles(id),
    resolved_at TIMESTAMPTZ,
    
    -- External dispute (Stripe, PayPal, etc.)
    external_dispute_id VARCHAR(200),
    external_dispute_status VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_financial_disputes_updated_at 
    BEFORE UPDATE ON financial_disputes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Financial adjustments (manual corrections)
CREATE TABLE financial_adjustments (
    id SERIAL PRIMARY KEY,
    adjustment_reference VARCHAR(50) UNIQUE NOT NULL DEFAULT 'ADJ' || LPAD(nextval('financial_adjustments_id_seq')::TEXT, 8, '0'),
    
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES financial_transactions(id) ON DELETE SET NULL,
    
    -- Adjustment details
    adjustment_amount DECIMAL(12,2) NOT NULL, -- Can be positive or negative
    adjustment_type VARCHAR(50) NOT NULL, -- bonus, penalty, correction, refund, etc.
    reason TEXT NOT NULL,
    description TEXT,
    
    -- Approval workflow
    requested_by UUID REFERENCES user_profiles(id) NOT NULL,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- Processing
    applied_to_payout_id INTEGER REFERENCES provider_payouts(id),
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_financial_adjustments_updated_at 
    BEFORE UPDATE ON financial_adjustments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINANCIAL CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate commission and fees for a transaction
CREATE OR REPLACE FUNCTION calculate_transaction_breakdown(
    p_gross_amount DECIMAL(12,2),
    p_commission_rate DECIMAL(5,2) DEFAULT 15.00,
    p_processing_fee_rate DECIMAL(5,2) DEFAULT 2.9,
    p_processing_fee_fixed DECIMAL(4,2) DEFAULT 0.30
)
RETURNS TABLE(
    gross_amount DECIMAL(12,2),
    commission_amount DECIMAL(12,2),
    processing_fee DECIMAL(12,2),
    platform_fee DECIMAL(12,2),
    provider_earnings DECIMAL(12,2),
    net_amount DECIMAL(12,2)
) AS $$
DECLARE
    calc_commission DECIMAL(12,2);
    calc_processing_fee DECIMAL(12,2);
    calc_platform_fee DECIMAL(12,2);
    calc_provider_earnings DECIMAL(12,2);
    calc_net_amount DECIMAL(12,2);
BEGIN
    -- Calculate commission (platform's cut)
    calc_commission := ROUND(p_gross_amount * (p_commission_rate / 100.0), 2);
    
    -- Calculate processing fee (Stripe, etc.)
    calc_processing_fee := ROUND((p_gross_amount * (p_processing_fee_rate / 100.0)) + p_processing_fee_fixed, 2);
    
    -- Platform fee is usually part of commission
    calc_platform_fee := 0.00;
    
    -- Provider earnings (gross - commission - processing fee)
    calc_provider_earnings := p_gross_amount - calc_commission - calc_processing_fee;
    
    -- Net amount is what customer pays (same as gross for now)
    calc_net_amount := p_gross_amount;
    
    RETURN QUERY SELECT 
        p_gross_amount,
        calc_commission,
        calc_processing_fee,
        calc_platform_fee,
        calc_provider_earnings,
        calc_net_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to create a payment transaction
CREATE OR REPLACE FUNCTION create_payment_transaction(
    p_booking_id INTEGER,
    p_gross_amount DECIMAL(12,2),
    p_payment_method payment_method DEFAULT 'credit_card',
    p_stripe_payment_intent_id VARCHAR(200) DEFAULT NULL,
    p_tip_amount DECIMAL(12,2) DEFAULT 0.00,
    p_tax_amount DECIMAL(12,2) DEFAULT 0.00
)
RETURNS INTEGER AS $$
DECLARE
    transaction_id INTEGER;
    booking_record RECORD;
    breakdown RECORD;
    total_gross DECIMAL(12,2);
BEGIN
    -- Get booking details
    SELECT * FROM bookings WHERE id = p_booking_id INTO booking_record;
    
    IF booking_record IS NULL THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;
    
    -- Calculate total gross amount including tip and tax
    total_gross := p_gross_amount + p_tip_amount + p_tax_amount;
    
    -- Get commission breakdown
    SELECT * FROM calculate_transaction_breakdown(total_gross) INTO breakdown;
    
    -- Create the transaction
    INSERT INTO financial_transactions (
        booking_id,
        customer_id,
        provider_id,
        transaction_type,
        status,
        payment_method,
        gross_amount,
        commission_amount,
        processing_fee,
        platform_fee,
        tax_amount,
        tip_amount,
        net_amount,
        provider_earnings,
        stripe_payment_intent_id,
        commission_rate,
        description
    ) VALUES (
        p_booking_id,
        booking_record.customer_id,
        booking_record.provider_id,
        'payment',
        'pending',
        p_payment_method,
        breakdown.gross_amount,
        breakdown.commission_amount,
        breakdown.processing_fee,
        breakdown.platform_fee,
        p_tax_amount,
        p_tip_amount,
        breakdown.net_amount,
        breakdown.provider_earnings,
        p_stripe_payment_intent_id,
        15.00, -- Default commission rate
        'Payment for booking #' || booking_record.booking_reference
    ) RETURNING id INTO transaction_id;
    
    -- Update booking with payment processed timestamp
    UPDATE bookings 
    SET payment_processed_at = NOW(), updated_at = NOW()
    WHERE id = p_booking_id;
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate provider payout
CREATE OR REPLACE FUNCTION generate_provider_payout(
    p_provider_id UUID,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS INTEGER AS $$
DECLARE
    payout_id INTEGER;
    total_earnings DECIMAL(12,2) := 0.00;
    total_commission DECIMAL(12,2) := 0.00;
    total_fees DECIMAL(12,2) := 0.00;
    total_adjustments DECIMAL(12,2) := 0.00;
    net_payout DECIMAL(12,2) := 0.00;
    transaction_count INTEGER := 0;
    booking_count INTEGER := 0;
    payout_preferences RECORD;
    transaction_record RECORD;
BEGIN
    -- Get provider payout preferences
    SELECT * FROM provider_payout_preferences 
    WHERE provider_id = p_provider_id 
    INTO payout_preferences;
    
    -- Calculate totals from completed transactions
    SELECT 
        COALESCE(SUM(provider_earnings), 0.00),
        COALESCE(SUM(commission_amount), 0.00),
        COALESCE(SUM(processing_fee), 0.00),
        COUNT(*),
        COUNT(DISTINCT booking_id)
    INTO total_earnings, total_commission, total_fees, transaction_count, booking_count
    FROM financial_transactions
    WHERE provider_id = p_provider_id
    AND status = 'completed'
    AND created_at::DATE BETWEEN p_period_start AND p_period_end
    AND transaction_type IN ('payment', 'tip', 'bonus');
    
    -- Calculate adjustments
    SELECT COALESCE(SUM(adjustment_amount), 0.00)
    INTO total_adjustments
    FROM financial_adjustments
    WHERE provider_id = p_provider_id
    AND approved_at IS NOT NULL
    AND created_at::DATE BETWEEN p_period_start AND p_period_end
    AND applied_to_payout_id IS NULL;
    
    -- Calculate net payout
    net_payout := total_earnings + total_adjustments;
    
    -- Check if payout meets minimum threshold
    IF payout_preferences IS NOT NULL AND net_payout < payout_preferences.minimum_payout_amount THEN
        RAISE NOTICE 'Payout amount % is below minimum threshold %', net_payout, payout_preferences.minimum_payout_amount;
        RETURN NULL;
    END IF;
    
    -- Create payout record
    INSERT INTO provider_payouts (
        provider_id,
        period_start_date,
        period_end_date,
        total_earnings,
        total_commission,
        total_fees,
        adjustments,
        net_payout_amount,
        transaction_count,
        booking_count,
        scheduled_date,
        description
    ) VALUES (
        p_provider_id,
        p_period_start,
        p_period_end,
        total_earnings,
        total_commission,
        total_fees,
        total_adjustments,
        net_payout,
        transaction_count,
        booking_count,
        CURRENT_DATE + INTERVAL '1 day', -- Schedule for next day
        'Payout for period ' || p_period_start || ' to ' || p_period_end
    ) RETURNING id INTO payout_id;
    
    -- Link transactions to payout
    FOR transaction_record IN 
        SELECT id, provider_earnings
        FROM financial_transactions
        WHERE provider_id = p_provider_id
        AND status = 'completed'
        AND created_at::DATE BETWEEN p_period_start AND p_period_end
        AND transaction_type IN ('payment', 'tip', 'bonus')
    LOOP
        INSERT INTO payout_transactions (payout_id, transaction_id, included_amount)
        VALUES (payout_id, transaction_record.id, transaction_record.provider_earnings);
    END LOOP;
    
    -- Mark adjustments as applied
    UPDATE financial_adjustments
    SET applied_to_payout_id = payout_id,
        processed_at = NOW()
    WHERE provider_id = p_provider_id
    AND approved_at IS NOT NULL
    AND created_at::DATE BETWEEN p_period_start AND p_period_end
    AND applied_to_payout_id IS NULL;
    
    RETURN payout_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get provider financial summary
CREATE OR REPLACE FUNCTION get_provider_financial_summary(
    p_provider_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    total_bookings BIGINT,
    total_earnings DECIMAL(12,2),
    total_commission_paid DECIMAL(12,2),
    total_tips_received DECIMAL(12,2),
    pending_earnings DECIMAL(12,2),
    completed_payouts DECIMAL(12,2),
    pending_payouts DECIMAL(12,2)
) AS $$
BEGIN
    -- Set default date range if not provided
    IF p_start_date IS NULL THEN
        p_start_date := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;
    
    RETURN QUERY
    WITH financial_stats AS (
        SELECT 
            COUNT(DISTINCT ft.booking_id) as booking_count,
            COALESCE(SUM(CASE WHEN ft.transaction_type = 'payment' THEN ft.provider_earnings ELSE 0 END), 0) as earnings,
            COALESCE(SUM(ft.commission_amount), 0) as commission,
            COALESCE(SUM(CASE WHEN ft.transaction_type = 'tip' THEN ft.gross_amount ELSE 0 END), 0) as tips,
            COALESCE(SUM(CASE WHEN ft.status = 'completed' THEN ft.provider_earnings ELSE 0 END), 0) as completed_earnings,
            COALESCE(SUM(CASE WHEN ft.status IN ('pending', 'processing') THEN ft.provider_earnings ELSE 0 END), 0) as pending_earnings
        FROM financial_transactions ft
        WHERE ft.provider_id = p_provider_id
        AND ft.created_at::DATE BETWEEN p_start_date AND p_end_date
    ),
    payout_stats AS (
        SELECT 
            COALESCE(SUM(CASE WHEN pp.status = 'completed' THEN pp.net_payout_amount ELSE 0 END), 0) as completed_payouts,
            COALESCE(SUM(CASE WHEN pp.status IN ('scheduled', 'processing') THEN pp.net_payout_amount ELSE 0 END), 0) as pending_payouts
        FROM provider_payouts pp
        WHERE pp.provider_id = p_provider_id
        AND pp.period_end_date BETWEEN p_start_date AND p_end_date
    )
    SELECT 
        fs.booking_count,
        fs.earnings,
        fs.commission,
        fs.tips,
        fs.pending_earnings,
        ps.completed_payouts,
        ps.pending_payouts
    FROM financial_stats fs, payout_stats ps;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FINANCIAL REPORTING VIEWS
-- =====================================================

-- Daily financial summary view
CREATE VIEW daily_financial_summary AS
SELECT 
    DATE(created_at) as summary_date,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT booking_id) as total_bookings,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(DISTINCT provider_id) as active_providers,
    SUM(gross_amount) as total_gross_revenue,
    SUM(commission_amount) as total_commission,
    SUM(processing_fee) as total_processing_fees,
    SUM(provider_earnings) as total_provider_earnings,
    AVG(gross_amount) as average_transaction_value
FROM financial_transactions
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY summary_date DESC;

-- Provider earnings summary view
CREATE VIEW provider_earnings_summary AS
SELECT 
    p.id as provider_id,
    up.full_name as provider_name,
    COUNT(ft.id) as total_transactions,
    COUNT(DISTINCT ft.booking_id) as total_bookings,
    SUM(ft.provider_earnings) as total_earnings,
    SUM(ft.commission_amount) as total_commission_paid,
    AVG(ft.provider_earnings) as average_earnings_per_booking,
    SUM(CASE WHEN ft.status = 'pending' THEN ft.provider_earnings ELSE 0 END) as pending_earnings,
    MAX(ft.created_at) as last_transaction_date
FROM providers p
JOIN user_profiles up ON up.id = p.id
LEFT JOIN financial_transactions ft ON ft.provider_id = p.id
WHERE ft.transaction_type = 'payment'
GROUP BY p.id, up.full_name
ORDER BY total_earnings DESC;

-- Monthly platform revenue view
CREATE VIEW monthly_platform_revenue AS
SELECT 
    DATE_TRUNC('month', created_at) as revenue_month,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT booking_id) as total_bookings,
    SUM(gross_amount) as total_gross_revenue,
    SUM(commission_amount) as total_commission_revenue,
    SUM(processing_fee) as total_processing_costs,
    SUM(commission_amount) - SUM(processing_fee) as net_platform_revenue,
    AVG(commission_rate) as average_commission_rate
FROM financial_transactions
WHERE status = 'completed'
AND transaction_type = 'payment'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY revenue_month DESC;

-- =====================================================
-- INDEXES FOR FINANCIAL PERFORMANCE
-- =====================================================

-- Financial transactions indexes
CREATE INDEX idx_financial_transactions_reference ON financial_transactions(transaction_reference);
CREATE INDEX idx_financial_transactions_booking_id ON financial_transactions(booking_id);
CREATE INDEX idx_financial_transactions_customer_id ON financial_transactions(customer_id);
CREATE INDEX idx_financial_transactions_provider_id ON financial_transactions(provider_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_created_at ON financial_transactions(created_at DESC);
CREATE INDEX idx_financial_transactions_processed_at ON financial_transactions(processed_at DESC);
CREATE INDEX idx_financial_transactions_stripe_payment_intent ON financial_transactions(stripe_payment_intent_id);

-- Provider payouts indexes
CREATE INDEX idx_provider_payouts_reference ON provider_payouts(payout_reference);
CREATE INDEX idx_provider_payouts_provider_id ON provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON provider_payouts(status);
CREATE INDEX idx_provider_payouts_scheduled_date ON provider_payouts(scheduled_date);
CREATE INDEX idx_provider_payouts_period ON provider_payouts(period_start_date, period_end_date);

-- Other financial table indexes
CREATE INDEX idx_payout_transactions_payout_id ON payout_transactions(payout_id);
CREATE INDEX idx_financial_disputes_transaction_id ON financial_disputes(transaction_id);
CREATE INDEX idx_financial_disputes_status ON financial_disputes(status);
CREATE INDEX idx_financial_adjustments_provider_id ON financial_adjustments(provider_id);
CREATE INDEX idx_financial_adjustments_approved_at ON financial_adjustments(approved_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all financial tables
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payout_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_adjustments ENABLE ROW LEVEL SECURITY;

-- Financial transactions policies
CREATE POLICY "Customers can view their payment transactions" ON financial_transactions 
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Providers can view their earning transactions" ON financial_transactions 
    FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all transactions" ON financial_transactions 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "System can create transactions" ON financial_transactions 
    FOR INSERT WITH CHECK (true);

-- Provider payouts policies
CREATE POLICY "Providers can view their own payouts" ON provider_payouts 
    FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Admins can manage all payouts" ON provider_payouts 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Payout transactions policies
CREATE POLICY "Providers can view their payout transaction details" ON payout_transactions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM provider_payouts pp 
            WHERE pp.id = payout_transactions.payout_id 
            AND pp.provider_id = auth.uid()
        )
    );

-- Provider payout preferences policies
CREATE POLICY "Providers can manage their own payout preferences" ON provider_payout_preferences 
    FOR ALL USING (auth.uid() = provider_id);

-- Financial disputes policies
CREATE POLICY "Users can view disputes involving their transactions" ON financial_disputes 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM financial_transactions ft 
            WHERE ft.id = financial_disputes.transaction_id 
            AND (ft.customer_id = auth.uid() OR ft.provider_id = auth.uid())
        )
    );

-- Financial adjustments policies
CREATE POLICY "Providers can view their adjustments" ON financial_adjustments 
    FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Admins can manage all adjustments" ON financial_adjustments 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- SAMPLE FINANCIAL DATA SETUP
-- =====================================================

-- Function to create default payout preferences for new providers
CREATE OR REPLACE FUNCTION create_default_payout_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO provider_payout_preferences (
        provider_id,
        payout_frequency,
        minimum_payout_amount,
        auto_payout_enabled
    ) VALUES (
        NEW.id,
        'weekly',
        25.00,
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default payout preferences for new providers
CREATE TRIGGER create_default_payout_preferences_trigger
    AFTER INSERT ON providers
    FOR EACH ROW
    EXECUTE FUNCTION create_default_payout_preferences();

-- Display completion message
SELECT 'Financial transactions and payout system completed successfully!' AS status;
SELECT 'Comprehensive financial infrastructure with transactions, payouts, and reporting ready.' AS features_added;