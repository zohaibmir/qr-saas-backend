
-- ===============================================
-- LANDING PAGES & CONTENT SYSTEM SCHEMA
-- ===============================================
-- This schema contains all tables, indexes, and functions
-- required for the Landing Pages Service
-- 
-- Dependencies: Core schema (users, qr_codes tables)
-- Tables: 8 landing page tables with complete functionality
-- Features: Templates, A/B testing, forms, analytics, domains
-- ===============================================

-- ===============================================
-- LANDING PAGES & CONTENT SYSTEM TABLES  
-- ===============================================

-- Landing Page Templates
CREATE TABLE IF NOT EXISTS landing_page_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('business', 'personal', 'event', 'marketing', 'ecommerce', 'portfolio')),
    layout_config JSONB NOT NULL, -- Page layout configuration
    default_styles JSONB NOT NULL, -- Default styling options
    component_config JSONB NOT NULL, -- Available components and their configs
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    preview_image_url TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Landing Pages
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
    template_id UUID REFERENCES landing_page_templates(id),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB NOT NULL, -- Page content configuration
    styles JSONB NOT NULL, -- Custom styling
    seo_config JSONB DEFAULT '{}', -- SEO meta tags, title, description
    custom_domain VARCHAR(255),
    is_published BOOLEAN DEFAULT false,
    is_mobile_optimized BOOLEAN DEFAULT true,
    password_protected BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- A/B Testing for Landing Pages
CREATE TABLE IF NOT EXISTS landing_page_ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    variant_a_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    variant_b_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    traffic_split INTEGER DEFAULT 50 CHECK (traffic_split BETWEEN 0 AND 100),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    winner_variant VARCHAR(1) CHECK (winner_variant IN ('A', 'B')),
    confidence_level DECIMAL(5,4) DEFAULT 0.0,
    statistical_significance DECIMAL(5,4) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Form Integration for Landing Pages
CREATE TABLE IF NOT EXISTS landing_page_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    form_name VARCHAR(255) NOT NULL,
    form_type VARCHAR(50) NOT NULL CHECK (form_type IN ('contact', 'newsletter', 'lead', 'survey', 'feedback', 'custom')),
    fields_config JSONB NOT NULL, -- Form field definitions
    validation_rules JSONB, -- Field validation rules
    notification_settings JSONB, -- Email notifications config
    integration_config JSONB, -- Third-party integrations (CRM, email marketing)
    auto_responder_config JSONB, -- Auto-response email settings
    redirect_after_submit VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    submission_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Form Submissions
CREATE TABLE IF NOT EXISTS landing_page_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES landing_page_forms(id) ON DELETE CASCADE,
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255), -- Anonymous visitor tracking
    submission_data JSONB NOT NULL, -- Form data
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    device_info JSONB,
    geo_location JSONB, -- Country, city, coordinates
    submission_source VARCHAR(100), -- ab_test_variant_a, ab_test_variant_b, direct
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Social Sharing Configuration
CREATE TABLE IF NOT EXISTS landing_page_social_sharing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'email', 'copy_link')),
    is_enabled BOOLEAN DEFAULT true,
    custom_message TEXT,
    tracking_parameters JSONB, -- UTM parameters for social sharing
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(landing_page_id, platform)
);

-- Landing Page Analytics Events
CREATE TABLE IF NOT EXISTS landing_page_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    ab_test_id UUID REFERENCES landing_page_ab_tests(id),
    variant VARCHAR(1), -- For A/B testing (A or B)
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'form_submission', 'social_share', 'conversion', 'bounce', 'scroll', 'click')),
    event_data JSONB, -- Additional event context
    visitor_id VARCHAR(255), -- Anonymous visitor tracking
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    referrer_url TEXT,
    page_url TEXT,
    scroll_depth INTEGER, -- Percentage scrolled
    time_on_page INTEGER, -- Seconds spent on page
    conversion_value DECIMAL(10,2),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Landing Page Custom Domains
CREATE TABLE IF NOT EXISTS landing_page_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_certificate TEXT,
    dns_verified BOOLEAN DEFAULT false,
    dns_verification_token VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed', 'suspended')),
    error_message TEXT,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- LANDING PAGES INDEXES FOR PERFORMANCE
-- ===============================================

-- Landing page templates indexes
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_type ON landing_page_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_active ON landing_page_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_premium ON landing_page_templates(is_premium);

-- Landing pages indexes
CREATE INDEX IF NOT EXISTS idx_landing_pages_user_id ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_qr_code_id ON landing_pages(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_published ON landing_pages(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_landing_pages_domain ON landing_pages(custom_domain);
CREATE INDEX IF NOT EXISTS idx_landing_pages_template ON landing_pages(template_id);

-- A/B testing indexes
CREATE INDEX IF NOT EXISTS idx_landing_ab_tests_user_id ON landing_page_ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_ab_tests_status ON landing_page_ab_tests(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_landing_ab_tests_dates ON landing_page_ab_tests(start_date, end_date);

-- Forms indexes
CREATE INDEX IF NOT EXISTS idx_landing_page_forms_page_id ON landing_page_forms(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_forms_active ON landing_page_forms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_landing_page_forms_type ON landing_page_forms(form_type);

-- Form submissions indexes
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON landing_page_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_page_id ON landing_page_form_submissions(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_visitor ON landing_page_form_submissions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON landing_page_form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_processed ON landing_page_form_submissions(is_processed);

-- Social sharing indexes
CREATE INDEX IF NOT EXISTS idx_social_sharing_page_id ON landing_page_social_sharing(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_social_sharing_platform ON landing_page_social_sharing(platform);
CREATE INDEX IF NOT EXISTS idx_social_sharing_enabled ON landing_page_social_sharing(is_enabled) WHERE is_enabled = true;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_landing_analytics_page_id ON landing_page_analytics(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_timestamp ON landing_page_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_event_type ON landing_page_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_ab_test ON landing_page_analytics(ab_test_id, variant) WHERE ab_test_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_landing_analytics_visitor ON landing_page_analytics(visitor_id);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_session ON landing_page_analytics(session_id);

-- Custom domains indexes
CREATE INDEX IF NOT EXISTS idx_landing_domains_user_id ON landing_page_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_domains_status ON landing_page_domains(status);
CREATE INDEX IF NOT EXISTS idx_landing_domains_verified ON landing_page_domains(dns_verified) WHERE dns_verified = true;

-- ===============================================
-- LANDING PAGES HELPER FUNCTIONS
-- ===============================================

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_landing_page_slug(p_title VARCHAR(255), p_user_id UUID)
RETURNS VARCHAR(255) AS $$
DECLARE
    base_slug VARCHAR(255);
    final_slug VARCHAR(255);
    counter INTEGER := 0;
BEGIN
    -- Create base slug from title
    base_slug := lower(regexp_replace(trim(p_title), '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := substring(base_slug from 1 for 200);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM landing_pages WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to track landing page analytics
CREATE OR REPLACE FUNCTION track_landing_page_event(
    p_landing_page_id UUID,
    p_event_type VARCHAR(50),
    p_visitor_id VARCHAR(255) DEFAULT NULL,
    p_event_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_ab_test_id UUID DEFAULT NULL,
    p_variant VARCHAR(1) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO landing_page_analytics (
        landing_page_id, ab_test_id, variant, event_type, event_data,
        visitor_id, ip_address, user_agent, referrer_url
    ) VALUES (
        p_landing_page_id, p_ab_test_id, p_variant, p_event_type, p_event_data,
        p_visitor_id, p_ip_address, p_user_agent, p_referrer_url
    ) RETURNING id INTO event_id;
    
    -- Update landing page view count for view events
    IF p_event_type = 'view' THEN
        UPDATE landing_pages 
        SET view_count = view_count + 1, last_viewed_at = NOW()
        WHERE id = p_landing_page_id;
    END IF;
    
    -- Update conversion count for conversion events
    IF p_event_type = 'conversion' THEN
        UPDATE landing_pages 
        SET conversion_count = conversion_count + 1
        WHERE id = p_landing_page_id;
    END IF;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get landing page analytics summary
CREATE OR REPLACE FUNCTION get_landing_page_analytics_summary(
    p_landing_page_id UUID,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE(
    total_views BIGINT,
    unique_visitors BIGINT,
    total_conversions BIGINT,
    conversion_rate DECIMAL(5,4),
    avg_time_on_page DECIMAL(10,2),
    bounce_rate DECIMAL(5,4),
    top_referrer TEXT,
    top_country VARCHAR(100),
    top_device VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'view') as total_views,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as total_conversions,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'view') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE event_type = 'conversion')::DECIMAL / 
                       COUNT(*) FILTER (WHERE event_type = 'view')) * 100, 4)
            ELSE 0
        END as conversion_rate,
        AVG(time_on_page) as avg_time_on_page,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'view') > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE event_type = 'bounce')::DECIMAL / 
                       COUNT(*) FILTER (WHERE event_type = 'view')) * 100, 4)
            ELSE 0
        END as bounce_rate,
        MODE() WITHIN GROUP (ORDER BY referrer_url) as top_referrer,
        MODE() WITHIN GROUP (ORDER BY country) as top_country,
        MODE() WITHIN GROUP (ORDER BY device_type) as top_device
    FROM landing_page_analytics
    WHERE landing_page_id = p_landing_page_id 
      AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Insert default landing page templates
INSERT INTO landing_page_templates (name, description, template_type, layout_config, default_styles, component_config, is_premium) VALUES 
('Business Card', 'Professional business card landing page', 'business', 
 '{"layout": "single_column", "sections": ["header", "content", "contact", "footer"]}',
 '{"primaryColor": "#3B82F6", "secondaryColor": "#1F2937", "backgroundColor": "#FFFFFF", "textColor": "#374151"}',
 '{"header": {"logo": true, "navigation": false}, "content": {"hero": true, "description": true, "features": false}, "contact": {"form": true, "social": true}, "footer": {"simple": true}}',
 false),

('Event Promotion', 'Event landing page with registration form', 'event',
 '{"layout": "full_width", "sections": ["hero", "details", "speakers", "registration", "footer"]}',
 '{"primaryColor": "#EF4444", "secondaryColor": "#991B1B", "backgroundColor": "#FEF2F2", "textColor": "#7F1D1D"}',
 '{"hero": {"countdown": true, "video": true}, "details": {"schedule": true, "location": true}, "speakers": {"grid": true, "bio": true}, "registration": {"form": true, "pricing": true}}',
 false),

('Product Showcase', 'Product landing page with features and CTA', 'marketing',
 '{"layout": "multi_column", "sections": ["hero", "features", "testimonials", "pricing", "cta"]}',
 '{"primaryColor": "#10B981", "secondaryColor": "#059669", "backgroundColor": "#ECFDF5", "textColor": "#065F46"}',
 '{"hero": {"video": true, "gallery": true}, "features": {"icons": true, "comparison": true}, "testimonials": {"carousel": true, "ratings": true}, "pricing": {"plans": true, "calculator": true}}',
 false),

('Portfolio Showcase', 'Creative portfolio with project gallery', 'portfolio',
 '{"layout": "masonry", "sections": ["header", "about", "portfolio", "services", "contact"]}',
 '{"primaryColor": "#8B5CF6", "secondaryColor": "#7C3AED", "backgroundColor": "#FAFAFA", "textColor": "#4C1D95"}',
 '{"header": {"minimal": true, "fixed": true}, "about": {"timeline": true, "skills": true}, "portfolio": {"filter": true, "lightbox": true}, "services": {"pricing": true, "packages": true}}',
 true),

('E-commerce Product', 'Product page with shopping features', 'ecommerce',
 '{"layout": "product_layout", "sections": ["navigation", "product", "description", "reviews", "related"]}',
 '{"primaryColor": "#F59E0B", "secondaryColor": "#D97706", "backgroundColor": "#FFFBEB", "textColor": "#92400E"}',
 '{"product": {"gallery": true, "variants": true, "inventory": true}, "description": {"tabs": true, "specifications": true}, "reviews": {"ratings": true, "photos": true}, "related": {"recommendations": true, "upsells": true}}',
 true),

('Lead Generation', 'High-converting lead capture page', 'marketing',
 '{"layout": "centered", "sections": ["hero", "benefits", "form", "testimonials", "footer"]}',
 '{"primaryColor": "#DC2626", "secondaryColor": "#B91C1C", "backgroundColor": "#FFFFFF", "textColor": "#1F2937"}',
 '{"hero": {"headline": true, "subheadline": true, "media": true}, "benefits": {"list": true, "icons": true}, "form": {"multi_step": true, "validation": true}, "testimonials": {"social_proof": true, "logos": true}}',
 false);

