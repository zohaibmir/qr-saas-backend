CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    is_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- QR Categories table
CREATE TABLE qr_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES qr_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(10) DEFAULT '📁',
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name, parent_id)
);

-- QR Codes table
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES qr_categories(id) ON DELETE SET NULL,
    short_id VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    design_config JSONB NOT NULL,
    target_url TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    max_scans INTEGER,
    current_scans INTEGER DEFAULT 0,
    password_hash VARCHAR(255),
    valid_schedule JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Scan Events for Analytics
CREATE TABLE scan_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(64),
    user_agent TEXT,
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    platform VARCHAR(50),
    device VARCHAR(50),
    referrer TEXT
);

-- Daily Analytics Summary
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_scans INTEGER DEFAULT 0,
    unique_scans INTEGER DEFAULT 0,
    top_platform VARCHAR(50),
    top_country VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(qr_code_id, date)
);

-- Subscription Plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    qr_limit INTEGER,
    analytics_retention_days INTEGER,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- File Uploads
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    upload_type VARCHAR(50) DEFAULT 'general',
    url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Messages (for notification persistence)
CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SMS Messages (for notification persistence)
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_phone VARCHAR(20) NOT NULL,
    from_phone VARCHAR(20),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification Templates (for future template management)
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    variables TEXT[], -- Array of variable names
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_qr_categories_user_id ON qr_categories(user_id);
CREATE INDEX idx_qr_categories_parent_id ON qr_categories(parent_id);
CREATE INDEX idx_qr_categories_name ON qr_categories(name);
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_codes_category_id ON qr_codes(category_id);
CREATE INDEX idx_qr_codes_short_id ON qr_codes(short_id);
CREATE INDEX idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX idx_qr_codes_design_config_gin ON qr_codes USING GIN (design_config);
CREATE INDEX idx_qr_codes_design_config_size ON qr_codes ((design_config->>'size'));
CREATE INDEX idx_qr_codes_design_config_pattern ON qr_codes ((design_config->>'pattern'));
CREATE INDEX idx_scan_events_qr_code_id ON scan_events(qr_code_id);
CREATE INDEX idx_scan_events_timestamp ON scan_events(timestamp);
CREATE INDEX idx_scan_events_country ON scan_events(country);
CREATE INDEX idx_scan_events_platform ON scan_events(platform);
CREATE INDEX idx_daily_analytics_qr_code_id ON daily_analytics(qr_code_id);
CREATE INDEX idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_created_at ON file_uploads(created_at);
CREATE INDEX idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX idx_email_messages_status ON email_messages(status);
CREATE INDEX idx_email_messages_created_at ON email_messages(created_at);
CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at);
CREATE INDEX idx_notification_templates_name ON notification_templates(name);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price, qr_limit, analytics_retention_days, features) VALUES 
('Free', 0.00, 10, 30, '{"customization": "basic", "api_access": false, "team_features": false}'),
('Pro', 19.00, 500, 365, '{"customization": "advanced", "api_access": true, "team_features": false, "custom_domains": true}'),
('Business', 49.00, -1, 1095, '{"customization": "advanced", "api_access": true, "team_features": true, "custom_domains": true, "white_label": true}'),
('Enterprise', 199.00, -1, -1, '{"customization": "advanced", "api_access": true, "team_features": true, "custom_domains": true, "white_label": true, "priority_support": true}');

-- Insert default bulk QR templates
INSERT INTO qr_bulk_templates (name, description, template_type, field_mappings, default_values, validation_rules, qr_settings, is_system_template) VALUES 
('URL List', 'Bulk create QR codes from a list of URLs', 'url_list', 
 '{"name": "name", "url": "url", "description": "description"}',
 '{"type": "url", "design_config": {"size": 300, "errorCorrectionLevel": "M", "foregroundColor": "#000000", "backgroundColor": "#ffffff", "pattern": "square", "margin": 4}}',
 '{"url": {"required": true, "pattern": "^https?://.+"}, "name": {"required": true, "maxLength": 255}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true),

('Business Cards', 'Bulk create vCard QR codes for business contacts', 'vcard_bulk',
 '{"name": "name", "firstName": "first_name", "lastName": "last_name", "email": "email", "phone": "phone", "company": "company", "title": "title"}',
 '{"type": "vcard", "design_config": {"size": 350, "errorCorrectionLevel": "M", "foregroundColor": "#1f2937", "backgroundColor": "#ffffff", "pattern": "rounded", "frame": {"style": "rounded", "width": 10, "color": "#e5e7eb"}}}',
 '{"firstName": {"required": true}, "lastName": {"required": true}, "email": {"pattern": "^[^@]+@[^@]+\\.[^@]+$"}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true),

('Product Catalog', 'Bulk create QR codes for product listings', 'product_bulk',
 '{"name": "product_name", "sku": "sku", "url": "product_url", "price": "price", "category": "category"}',
 '{"type": "url", "design_config": {"size": 400, "errorCorrectionLevel": "H", "foregroundColor": "#059669", "backgroundColor": "#ffffff", "pattern": "dots", "eyePattern": {"outer": "rounded", "inner": "circle"}, "gradient": {"type": "linear", "colors": ["#059669", "#10b981"]}}}',
 '{"product_name": {"required": true}, "sku": {"required": true}, "product_url": {"required": true, "pattern": "^https?://.+"}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true),

('Event Tickets', 'Bulk create QR codes for event tickets and check-ins', 'event_tickets',
 '{"name": "ticket_name", "eventName": "event_name", "ticketId": "ticket_id", "seatNumber": "seat", "gateInfo": "gate"}',
 '{"type": "text", "design_config": {"foregroundColor": "#7c3aed", "backgroundColor": "#ffffff", "size": 200}}',
 '{"ticket_name": {"required": true}, "event_name": {"required": true}, "ticket_id": {"required": true}}',
 '{"errorCorrectionLevel": "H", "format": "png"}', true),

('WiFi Access', 'Bulk create WiFi QR codes for multiple locations', 'wifi_bulk',
 '{"name": "location_name", "ssid": "wifi_ssid", "password": "wifi_password", "security": "security_type"}',
 '{"type": "wifi", "design_config": {"foregroundColor": "#dc2626", "backgroundColor": "#ffffff", "size": 200}}',
 '{"location_name": {"required": true}, "wifi_ssid": {"required": true}, "security_type": {"enum": ["WPA", "WEP", "nopass"]}}',
 '{"errorCorrectionLevel": "M", "format": "png"}', true);

-- Create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO qr_categories (user_id, name, description, color, icon, is_default, sort_order)
    VALUES 
        (p_user_id, 'General', 'Default category for general QR codes', '#6B7280', '📋', true, 0),
        (p_user_id, 'Business', 'Business-related QR codes', '#3B82F6', '💼', true, 10),
        (p_user_id, 'Marketing', 'Marketing and promotional QR codes', '#EF4444', '�', true, 20),
        (p_user_id, 'Events', 'Event-related QR codes', '#10B981', '🎉', true, 30),
        (p_user_id, 'Personal', 'Personal QR codes', '#8B5CF6', '👤', true, 40)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- DYNAMIC QR CODES SYSTEM TABLES
-- ===============================================

-- QR Code Content Versions for Dynamic QRs
CREATE TABLE IF NOT EXISTS qr_content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content JSONB NOT NULL,
    redirect_url TEXT,
    is_active BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMP,
    activated_at TIMESTAMP,
    deactivated_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique version numbers per QR code
    UNIQUE(qr_code_id, version_number),
    -- Only one active version per QR code at a time
    EXCLUDE (qr_code_id WITH =) WHERE (is_active = true)
);

-- A/B Testing for Dynamic QRs
CREATE TABLE IF NOT EXISTS qr_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    variant_a_version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    variant_b_version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    traffic_split INTEGER DEFAULT 50 CHECK (traffic_split BETWEEN 0 AND 100),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    winner_variant VARCHAR(1) CHECK (winner_variant IN ('A', 'B')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic QR Redirect Rules
CREATE TABLE IF NOT EXISTS qr_redirect_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('geographic', 'device', 'time', 'custom')),
    conditions JSONB NOT NULL,
    target_version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    priority INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic QR Analytics (Enhanced)
CREATE TABLE IF NOT EXISTS qr_dynamic_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    version_id UUID REFERENCES qr_content_versions(id),
    ab_test_id UUID REFERENCES qr_ab_tests(id),
    variant VARCHAR(1), -- For A/B testing
    redirect_rule_id UUID REFERENCES qr_redirect_rules(id),
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    referrer TEXT,
    conversion_event VARCHAR(100),
    session_id VARCHAR(255),
    scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for performance
    INDEX idx_dynamic_analytics_qr_code (qr_code_id),
    INDEX idx_dynamic_analytics_version (version_id),
    INDEX idx_dynamic_analytics_timestamp (scan_timestamp),
    INDEX idx_dynamic_analytics_ab_test (ab_test_id, variant)
);

-- QR Content Scheduling
CREATE TABLE IF NOT EXISTS qr_content_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES qr_content_versions(id),
    schedule_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    repeat_pattern VARCHAR(50), -- 'none', 'daily', 'weekly', 'monthly'
    repeat_days INTEGER[], -- Days of week for weekly repeat (1-7)
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- INDEXES FOR DYNAMIC QR PERFORMANCE
-- ===============================================

-- Content versions indexes
CREATE INDEX IF NOT EXISTS idx_content_versions_qr_code ON qr_content_versions(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_active ON qr_content_versions(qr_code_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_versions_scheduled ON qr_content_versions(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- A/B testing indexes  
CREATE INDEX IF NOT EXISTS idx_ab_tests_qr_code ON qr_ab_tests(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON qr_ab_tests(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_ab_tests_dates ON qr_ab_tests(start_date, end_date);

-- Redirect rules indexes
CREATE INDEX IF NOT EXISTS idx_redirect_rules_qr_code ON qr_redirect_rules(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_redirect_rules_enabled ON qr_redirect_rules(qr_code_id, is_enabled, priority) WHERE is_enabled = true;

-- Content schedule indexes
CREATE INDEX IF NOT EXISTS idx_content_schedule_qr_code ON qr_content_schedule(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_content_schedule_active ON qr_content_schedule(is_active, start_time, end_time) WHERE is_active = true;

-- ===============================================
-- BULK QR GENERATION SYSTEM TABLES
-- ===============================================

-- Bulk QR Generation Batches
CREATE TABLE IF NOT EXISTS qr_bulk_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id VARCHAR(50), -- Optional template to use for all QRs
    category_id UUID REFERENCES qr_categories(id) ON DELETE SET NULL,
    total_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    input_file_id UUID REFERENCES file_uploads(id),
    input_data JSONB, -- Store CSV data or array of QR requests
    error_log JSONB, -- Store processing errors
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    estimated_completion_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bulk QR Generation Items (Individual QR codes in a batch)
CREATE TABLE IF NOT EXISTS qr_bulk_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES qr_bulk_batches(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL, -- Null if creation failed
    row_number INTEGER NOT NULL, -- Original row number from CSV
    input_data JSONB NOT NULL, -- Original input data for this QR
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped')),
    error_message TEXT,
    error_details JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique row numbers within batch
    UNIQUE(batch_id, row_number)
);

-- Bulk QR Templates for common bulk operations
CREATE TABLE IF NOT EXISTS qr_bulk_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for system templates
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL, -- 'csv_mapping', 'url_list', 'vcard_bulk', etc.
    field_mappings JSONB NOT NULL, -- Map CSV columns to QR fields
    default_values JSONB, -- Default values for optional fields
    validation_rules JSONB, -- Validation rules for input data
    qr_settings JSONB, -- Default QR generation settings
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- BULK QR GENERATION INDEXES
-- ===============================================

-- Bulk batches indexes
CREATE INDEX IF NOT EXISTS idx_bulk_batches_user_id ON qr_bulk_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_status ON qr_bulk_batches(status);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_created_at ON qr_bulk_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_processing ON qr_bulk_batches(status, processing_started_at) WHERE status = 'processing';

-- Bulk items indexes
CREATE INDEX IF NOT EXISTS idx_bulk_items_batch_id ON qr_bulk_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_bulk_items_status ON qr_bulk_items(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_items_qr_code_id ON qr_bulk_items(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_bulk_items_row_number ON qr_bulk_items(batch_id, row_number);

-- Bulk templates indexes
CREATE INDEX IF NOT EXISTS idx_bulk_templates_user_id ON qr_bulk_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_templates_type ON qr_bulk_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_bulk_templates_system ON qr_bulk_templates(is_system_template) WHERE is_system_template = true;
CREATE INDEX IF NOT EXISTS idx_bulk_templates_active ON qr_bulk_templates(is_active) WHERE is_active = true;

-- ===============================================
-- BULK QR GENERATION FUNCTIONS
-- ===============================================

-- Function to update batch progress
CREATE OR REPLACE FUNCTION update_batch_progress(p_batch_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total INTEGER;
    v_processed INTEGER;
    v_success INTEGER;
    v_failed INTEGER;
    v_progress INTEGER;
BEGIN
    -- Get current counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('success', 'failed', 'skipped')),
        COUNT(*) FILTER (WHERE status = 'success'),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO v_total, v_processed, v_success, v_failed
    FROM qr_bulk_items 
    WHERE batch_id = p_batch_id;
    
    -- Calculate progress percentage
    v_progress := CASE 
        WHEN v_total > 0 THEN ROUND((v_processed::DECIMAL / v_total) * 100)
        ELSE 0 
    END;
    
    -- Update batch
    UPDATE qr_bulk_batches 
    SET 
        total_count = v_total,
        processed_count = v_processed,
        success_count = v_success,
        failed_count = v_failed,
        progress_percentage = v_progress,
        status = CASE 
            WHEN v_processed = v_total AND v_total > 0 THEN 'completed'
            WHEN v_processed > 0 THEN 'processing'
            ELSE status
        END,
        processing_completed_at = CASE 
            WHEN v_processed = v_total AND v_total > 0 THEN CURRENT_TIMESTAMP
            ELSE processing_completed_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get batch statistics
CREATE OR REPLACE FUNCTION get_batch_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_batches BIGINT,
    completed_batches BIGINT,
    processing_batches BIGINT,
    failed_batches BIGINT,
    total_qr_codes BIGINT,
    avg_batch_size NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_batches,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_batches,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_batches,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_batches,
        COALESCE(SUM(success_count), 0) as total_qr_codes,
        COALESCE(AVG(total_count), 0) as avg_batch_size,
        CASE 
            WHEN SUM(total_count) > 0 THEN 
                ROUND((SUM(success_count)::DECIMAL / SUM(total_count)) * 100, 2)
            ELSE 0
        END as success_rate
    FROM qr_bulk_batches
    WHERE user_id = p_user_id 
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- DYNAMIC QR HELPER FUNCTIONS
-- ===============================================

-- Function to activate scheduled content
CREATE OR REPLACE FUNCTION activate_scheduled_content()
RETURNS INTEGER AS $$
DECLARE
    activated_count INTEGER := 0;
BEGIN
    -- Activate scheduled versions that are due
    UPDATE qr_content_versions 
    SET is_active = true, activated_at = CURRENT_TIMESTAMP
    WHERE scheduled_at IS NOT NULL 
      AND scheduled_at <= CURRENT_TIMESTAMP 
      AND is_active = false;
    
    GET DIAGNOSTICS activated_count = ROW_COUNT;
    
    RETURN activated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active content version for QR
CREATE OR REPLACE FUNCTION get_active_qr_content(p_qr_code_id UUID)
RETURNS TABLE(
    version_id UUID,
    content JSONB,
    redirect_url TEXT,
    version_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.id as version_id,
        cv.content,
        cv.redirect_url,
        cv.version_number
    FROM qr_content_versions cv
    WHERE cv.qr_code_id = p_qr_code_id 
      AND cv.is_active = true
    ORDER BY cv.version_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- INCLUDE ADVANCED ANALYTICS SCHEMA
-- ===============================================
\i advanced-analytics-schema.sql