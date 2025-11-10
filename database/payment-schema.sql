-- ===============================================
-- PAYMENT INTEGRATION TABLES
-- ===============================================

-- Payment Methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('STRIPE', 'KLARNA', 'SWISH', 'PAYPAL')),
    type VARCHAR(50) NOT NULL,
    card JSONB, -- For Stripe card details
    klarna JSONB, -- For Klarna payment details  
    swish JSONB, -- For Swish phone number details
    paypal JSONB, -- For PayPal account details
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('STRIPE', 'KLARNA', 'SWISH', 'PAYPAL')),
    provider_transaction_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ONE_TIME', 'SUBSCRIPTION', 'REFUND')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REQUIRES_ACTION')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Provider Configuration table
CREATE TABLE IF NOT EXISTS payment_provider_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('STRIPE', 'KLARNA', 'SWISH', 'PAYPAL')),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    is_enabled BOOLEAN DEFAULT true,
    config_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, environment)
);

-- ===============================================
-- PAYMENT INDEXES FOR PERFORMANCE
-- ===============================================

-- Payment Methods indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_at ON payment_methods(created_at DESC);

-- Payment Transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_transaction_id ON payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_amount ON payment_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_currency ON payment_transactions(currency);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status ON payment_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_type ON payment_transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_status ON payment_transactions(provider, status);

-- Payment Provider Config indexes  
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_provider ON payment_provider_config(provider);
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_environment ON payment_provider_config(environment);
CREATE INDEX IF NOT EXISTS idx_payment_provider_config_enabled ON payment_provider_config(is_enabled);

-- ===============================================
-- PAYMENT HELPER FUNCTIONS
-- ===============================================

-- Function to ensure only one default payment method per user per provider
CREATE OR REPLACE FUNCTION check_default_payment_method() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE payment_methods 
        SET is_default = false, updated_at = NOW()
        WHERE user_id = NEW.user_id 
          AND provider = NEW.provider 
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default payment method constraint
DROP TRIGGER IF EXISTS trigger_check_default_payment_method ON payment_methods;
CREATE TRIGGER trigger_check_default_payment_method
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION check_default_payment_method();

-- Function to update transaction status and metadata
CREATE OR REPLACE FUNCTION update_transaction_status(
    p_transaction_id UUID,
    p_status VARCHAR(20),
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE payment_transactions 
    SET 
        status = p_status,
        failure_reason = CASE WHEN p_failure_reason IS NOT NULL THEN p_failure_reason ELSE failure_reason END,
        metadata = CASE WHEN p_metadata IS NOT NULL THEN metadata || p_metadata ELSE metadata END,
        updated_at = NOW()
    WHERE id = p_transaction_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user payment summary
CREATE OR REPLACE FUNCTION get_user_payment_summary(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_transactions BIGINT,
    successful_transactions BIGINT,
    failed_transactions BIGINT,
    total_amount DECIMAL(12,2),
    successful_amount DECIMAL(12,2),
    preferred_provider VARCHAR(20),
    success_rate NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'SUCCEEDED') as successful_transactions,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCEEDED'), 0) as successful_amount,
        MODE() WITHIN GROUP (ORDER BY provider) as preferred_provider,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0
        END as success_rate
    FROM payment_transactions
    WHERE user_id = p_user_id 
      AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- PAYMENT PROVIDER CONFIGURATIONS
-- ===============================================

-- Insert default payment provider configurations optimized for Swedish market
INSERT INTO payment_provider_config (provider, environment, is_enabled, config_data) VALUES 
-- Stripe Configuration (Global + Swedish support)
('STRIPE', 'sandbox', true, '{
    "supported_currencies": ["USD", "EUR", "SEK", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI"],
    "features": ["cards", "subscriptions", "refunds", "webhooks"],
    "swedish_features": {
        "local_cards": true,
        "sek_processing": true,
        "eu_compliance": true
    }
}'),
('STRIPE', 'production', false, '{
    "supported_currencies": ["USD", "EUR", "SEK", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI"],
    "features": ["cards", "subscriptions", "refunds", "webhooks"],
    "swedish_features": {
        "local_cards": true,
        "sek_processing": true,
        "eu_compliance": true
    }
}'),

-- Klarna Configuration (Nordic focus)
('KLARNA', 'sandbox', true, '{
    "supported_currencies": ["SEK", "EUR", "USD", "NOK", "DKK"],
    "supported_countries": ["SE", "NO", "DK", "FI", "DE", "AT", "NL"],
    "features": ["pay_later", "pay_in_installments", "direct_payments"],
    "swedish_features": {
        "market_leader": true,
        "local_brand_recognition": "high",
        "mobile_optimized": true
    }
}'),
('KLARNA', 'production', false, '{
    "supported_currencies": ["SEK", "EUR", "USD", "NOK", "DKK"],
    "supported_countries": ["SE", "NO", "DK", "FI", "DE", "AT", "NL"],
    "features": ["pay_later", "pay_in_installments", "direct_payments"],
    "swedish_features": {
        "market_leader": true,
        "local_brand_recognition": "high",
        "mobile_optimized": true
    }
}'),

-- Swish Configuration (Sweden-specific)
('SWISH', 'sandbox', true, '{
    "supported_currencies": ["SEK"],
    "supported_countries": ["SE"],
    "features": ["instant_payments", "qr_codes", "mobile_native"],
    "limits": {
        "min_amount": 1,
        "max_amount": 150000,
        "daily_limit": 150000
    },
    "swedish_features": {
        "market_share": "60+",
        "instant_settlement": true,
        "bank_integration": "all_major_banks",
        "mobile_first": true
    }
}'),
('SWISH', 'production', false, '{
    "supported_currencies": ["SEK"],
    "supported_countries": ["SE"],
    "features": ["instant_payments", "qr_codes", "mobile_native"],
    "limits": {
        "min_amount": 1,
        "max_amount": 150000,
        "daily_limit": 150000
    },
    "swedish_features": {
        "market_share": "60+",
        "instant_settlement": true,
        "bank_integration": "all_major_banks",
        "mobile_first": true
    }
}'),

-- PayPal Configuration (International fallback)
('PAYPAL', 'sandbox', true, '{
    "supported_currencies": ["USD", "EUR", "SEK", "GBP", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI", "NL"],
    "features": ["express_checkout", "subscriptions", "refunds", "guest_payments"],
    "swedish_features": {
        "recognized_brand": true,
        "international_customers": true,
        "fallback_option": true
    }
}'),
('PAYPAL', 'production', false, '{
    "supported_currencies": ["USD", "EUR", "SEK", "GBP", "NOK", "DKK"],
    "supported_countries": ["SE", "US", "GB", "DE", "FR", "NO", "DK", "FI", "NL"],
    "features": ["express_checkout", "subscriptions", "refunds", "guest_payments"],
    "swedish_features": {
        "recognized_brand": true,
        "international_customers": true,
        "fallback_option": true
    }
}')
ON CONFLICT (provider, environment) DO UPDATE SET
    config_data = EXCLUDED.config_data,
    updated_at = NOW();

-- ===============================================
-- PAYMENT AUDIT AND LOGGING
-- ===============================================

-- Payment audit log table for tracking all payment-related actions
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_user_id ON payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_transaction_id ON payment_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_action ON payment_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at ON payment_audit_log(created_at DESC);

-- Function to log payment actions
CREATE OR REPLACE FUNCTION log_payment_action(
    p_user_id UUID,
    p_transaction_id UUID,
    p_action VARCHAR(50),
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO payment_audit_log (
        user_id, transaction_id, action, old_data, new_data, ip_address, user_agent
    ) VALUES (
        p_user_id, p_transaction_id, p_action, p_old_data, p_new_data, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Payment tables and functions created successfully
-- Swedish market optimization complete with Swish integration
-- Ready for production payment processing