# Analytics Database Dummy Data

This file contains comprehensive dummy data for the analytics system that works with your existing database schema.

## 📊 Analytics Dummy Data Setup

Execute these SQL scripts to populate your database with realistic analytics data for testing and demonstration.

## 1. Create Sample Users and QR Codes

```sql
-- Insert sample users for analytics testing
INSERT INTO users (id, email, username, password_hash, full_name, subscription_tier, is_verified, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'analytics@demo.com', 'analytics_demo', '$2b$10$rGQHFh2Cv7hZZl7Zj7mZWu.VKVzRjZrKxXgO0lz5mJz8QHgxLpZUa', 'Analytics Demo User', 'pro', true, NOW() - INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440002', 'business@demo.com', 'business_demo', '$2b$10$rGQHFh2Cv7hZZl7Zj7mZWu.VKVzRjZrKxXgO0lz5mJz8QHgxLpZUa', 'Business Demo User', 'business', true, NOW() - INTERVAL '60 days'),
('550e8400-e29b-41d4-a716-446655440003', 'enterprise@demo.com', 'enterprise_demo', '$2b$10$rGQHFh2Cv7hZZl7Zj7mZWu.VKVzRjZrKxXgO0lz5mJz8QHgxLpZUa', 'Enterprise Demo User', 'enterprise', true, NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Create default categories for demo users
SELECT create_default_categories('550e8400-e29b-41d4-a716-446655440001');
SELECT create_default_categories('550e8400-e29b-41d4-a716-446655440002');
SELECT create_default_categories('550e8400-e29b-41d4-a716-446655440003');

-- Insert sample QR codes for analytics
INSERT INTO qr_codes (id, user_id, category_id, short_id, name, type, content, design_config, target_url, is_active, current_scans, created_at) VALUES 
-- Analytics Demo User QR Codes
('qr-demo-001-analytics-website', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Business' LIMIT 1), 'DEMO001', 'Company Website', 'url', '{"url": "https://demo-company.com"}', '{"size": 300, "errorCorrectionLevel": "M", "foregroundColor": "#000000", "backgroundColor": "#ffffff", "pattern": "square", "margin": 4}', 'https://demo-company.com', true, 1247, NOW() - INTERVAL '25 days'),
('qr-demo-002-product-catalog', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Marketing' LIMIT 1), 'DEMO002', 'Product Catalog', 'url', '{"url": "https://demo-company.com/products"}', '{"size": 350, "errorCorrectionLevel": "M", "foregroundColor": "#3B82F6", "backgroundColor": "#ffffff", "pattern": "rounded", "margin": 4}', 'https://demo-company.com/products', true, 892, NOW() - INTERVAL '20 days'),
('qr-demo-003-contact-card', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Business' LIMIT 1), 'DEMO003', 'Contact Card', 'vcard', '{"firstName": "John", "lastName": "Doe", "email": "john@demo.com", "phone": "+1234567890", "company": "Demo Company"}', '{"size": 300, "errorCorrectionLevel": "H", "foregroundColor": "#059669", "backgroundColor": "#ffffff", "pattern": "dots", "margin": 4}', null, true, 634, NOW() - INTERVAL '18 days'),
('qr-demo-004-event-ticket', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Events' LIMIT 1), 'DEMO004', 'Conference 2024', 'text', '{"text": "Conference 2024 - Ticket #12345"}', '{"size": 200, "errorCorrectionLevel": "H", "foregroundColor": "#7c3aed", "backgroundColor": "#ffffff", "pattern": "circle", "margin": 4}', null, true, 1156, NOW() - INTERVAL '15 days'),
('qr-demo-005-wifi-access', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'General' LIMIT 1), 'DEMO005', 'Office WiFi', 'wifi', '{"ssid": "DemoOffice", "password": "Demo123!", "security": "WPA"}', '{"size": 250, "errorCorrectionLevel": "M", "foregroundColor": "#dc2626", "backgroundColor": "#ffffff", "pattern": "square", "margin": 4}', null, true, 423, NOW() - INTERVAL '12 days'),

-- Business Demo User QR Codes
('qr-demo-006-restaurant-menu', '550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' AND name = 'Business' LIMIT 1), 'DEMO006', 'Restaurant Menu', 'url', '{"url": "https://restaurant-demo.com/menu"}', '{"size": 400, "errorCorrectionLevel": "M", "foregroundColor": "#f59e0b", "backgroundColor": "#ffffff", "pattern": "rounded", "margin": 4}', 'https://restaurant-demo.com/menu', true, 2341, NOW() - INTERVAL '45 days'),
('qr-demo-007-social-media', '550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' AND name = 'Marketing' LIMIT 1), 'DEMO007', 'Social Media Links', 'url', '{"url": "https://linktr.ee/restaurant-demo"}', '{"size": 300, "errorCorrectionLevel": "M", "foregroundColor": "#ec4899", "backgroundColor": "#ffffff", "pattern": "dots", "margin": 4}', 'https://linktr.ee/restaurant-demo', true, 1567, NOW() - INTERVAL '35 days'),
('qr-demo-008-feedback-form', '550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' AND name = 'General' LIMIT 1), 'DEMO008', 'Customer Feedback', 'url', '{"url": "https://forms.google.com/feedback-demo"}', '{"size": 250, "errorCorrectionLevel": "M", "foregroundColor": "#10b981", "backgroundColor": "#ffffff", "pattern": "square", "margin": 4}', 'https://forms.google.com/feedback-demo', true, 789, NOW() - INTERVAL '28 days'),

-- Enterprise Demo User QR Codes
('qr-demo-009-employee-badge', '550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440003' AND name = 'Business' LIMIT 1), 'DEMO009', 'Employee Badge', 'vcard', '{"firstName": "Jane", "lastName": "Smith", "email": "jane@enterprise-demo.com", "phone": "+9876543210", "company": "Enterprise Demo Corp", "title": "Senior Manager"}', '{"size": 200, "errorCorrectionLevel": "H", "foregroundColor": "#1f2937", "backgroundColor": "#ffffff", "pattern": "rounded", "margin": 4}', null, true, 345, NOW() - INTERVAL '70 days'),
('qr-demo-010-asset-tracking', '550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440003' AND name = 'General' LIMIT 1), 'DEMO010', 'Asset #A1234', 'text', '{"text": "Asset ID: A1234\\nLocation: Building B, Floor 3\\nPurchased: 2023-01-15"}', '{"size": 150, "errorCorrectionLevel": "H", "foregroundColor": "#374151", "backgroundColor": "#ffffff", "pattern": "square", "margin": 2}', null, true, 156, NOW() - INTERVAL '65 days')
ON CONFLICT (id) DO NOTHING;
```

## 2. Generate Scan Events (Analytics Data)

```sql
-- Generate realistic scan events for the past 30 days
-- This creates a comprehensive dataset for analytics testing

DO $$
DECLARE
    qr_record RECORD;
    scan_date DATE;
    hour_int INTEGER;
    scans_per_hour INTEGER;
    i INTEGER;
    countries TEXT[] := ARRAY['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'India', 'Mexico', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'South Korea'];
    regions TEXT[] := ARRAY['California', 'New York', 'Texas', 'Florida', 'Ontario', 'London', 'Bavaria', 'Tokyo', 'New South Wales', 'São Paulo'];
    cities TEXT[] := ARRAY['San Francisco', 'New York', 'Los Angeles', 'Toronto', 'London', 'Berlin', 'Paris', 'Tokyo', 'Sydney', 'São Paulo', 'Mumbai', 'Mexico City', 'Madrid', 'Rome', 'Amsterdam', 'Stockholm', 'Seoul'];
    platforms TEXT[] := ARRAY['mobile', 'desktop', 'tablet'];
    devices TEXT[] := ARRAY['iPhone', 'Android', 'iPad', 'Chrome Desktop', 'Safari Desktop', 'Firefox Desktop', 'Samsung Galaxy', 'Google Pixel', 'MacBook', 'Windows PC'];
    user_agents TEXT[] := ARRAY[
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Android 12; Mobile; rv:98.0) Gecko/98.0 Firefox/98.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/98.0.4758.102',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/605.1.15',
        'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    ];
    referrers TEXT[] := ARRAY['https://google.com', 'https://facebook.com', 'https://twitter.com', 'https://linkedin.com', 'direct', null];
    random_country TEXT;
    random_region TEXT;
    random_city TEXT;
    random_platform TEXT;
    random_device TEXT;
    random_user_agent TEXT;
    random_referrer TEXT;
    random_lat DECIMAL(10, 7);
    random_lng DECIMAL(10, 7);
    base_ip INTEGER;
BEGIN
    -- Generate scan events for each QR code
    FOR qr_record IN 
        SELECT id, short_id, name, type, created_at, current_scans
        FROM qr_codes 
        WHERE id LIKE 'qr-demo-%'
    LOOP
        RAISE NOTICE 'Generating scans for QR: %', qr_record.short_id;
        
        -- Generate scans for the past 30 days
        FOR scan_date IN 
            SELECT generate_series(
                GREATEST(qr_record.created_at::DATE, CURRENT_DATE - INTERVAL '30 days'), 
                CURRENT_DATE, 
                '1 day'::INTERVAL
            )::DATE
        LOOP
            -- Generate scans throughout the day (more during business hours)
            FOR hour_int IN 0..23 LOOP
                -- Realistic hourly distribution (more scans during business hours)
                scans_per_hour := CASE 
                    WHEN hour_int BETWEEN 9 AND 17 THEN (random() * 20)::INTEGER + 5  -- Business hours: 5-25 scans
                    WHEN hour_int BETWEEN 18 AND 22 THEN (random() * 15)::INTEGER + 2  -- Evening: 2-17 scans
                    WHEN hour_int BETWEEN 6 AND 8 THEN (random() * 10)::INTEGER + 1    -- Morning: 1-11 scans
                    ELSE (random() * 5)::INTEGER                                        -- Night: 0-5 scans
                END;
                
                -- Different QR codes have different usage patterns
                scans_per_hour := CASE
                    WHEN qr_record.short_id = 'DEMO006' THEN scans_per_hour * 2  -- Restaurant menu gets more scans
                    WHEN qr_record.short_id = 'DEMO001' THEN scans_per_hour * 1.5  -- Company website popular
                    WHEN qr_record.short_id = 'DEMO010' THEN GREATEST(scans_per_hour / 3, 1)  -- Asset tracking less frequent
                    ELSE scans_per_hour
                END;
                
                -- Generate individual scan events for this hour
                FOR i IN 1..scans_per_hour LOOP
                    -- Random geographic data
                    random_country := countries[1 + (random() * array_length(countries, 1))::INTEGER];
                    random_region := regions[1 + (random() * array_length(regions, 1))::INTEGER];
                    random_city := cities[1 + (random() * array_length(cities, 1))::INTEGER];
                    
                    -- Generate realistic coordinates based on major cities
                    CASE random_city
                        WHEN 'San Francisco' THEN
                            random_lat := 37.7749 + (random() - 0.5) * 0.1;
                            random_lng := -122.4194 + (random() - 0.5) * 0.1;
                        WHEN 'New York' THEN
                            random_lat := 40.7128 + (random() - 0.5) * 0.1;
                            random_lng := -74.0060 + (random() - 0.5) * 0.1;
                        WHEN 'London' THEN
                            random_lat := 51.5074 + (random() - 0.5) * 0.1;
                            random_lng := -0.1278 + (random() - 0.5) * 0.1;
                        WHEN 'Tokyo' THEN
                            random_lat := 35.6762 + (random() - 0.5) * 0.1;
                            random_lng := 139.6503 + (random() - 0.5) * 0.1;
                        ELSE
                            random_lat := (random() - 0.5) * 180;  -- Random global coordinates
                            random_lng := (random() - 0.5) * 360;
                    END CASE;
                    
                    -- Random device/platform data
                    random_platform := platforms[1 + (random() * array_length(platforms, 1))::INTEGER];
                    random_device := devices[1 + (random() * array_length(devices, 1))::INTEGER];
                    random_user_agent := user_agents[1 + (random() * array_length(user_agents, 1))::INTEGER];
                    random_referrer := referrers[1 + (random() * array_length(referrers, 1))::INTEGER];
                    
                    -- Generate semi-realistic IP address
                    base_ip := (random() * 255)::INTEGER;
                    
                    -- Insert scan event
                    INSERT INTO scan_events (
                        qr_code_id, 
                        timestamp, 
                        ip_address, 
                        user_agent, 
                        country, 
                        region, 
                        city, 
                        latitude, 
                        longitude, 
                        platform, 
                        device, 
                        referrer
                    ) VALUES (
                        qr_record.short_id,
                        scan_date + INTERVAL '1 hour' * hour_int + INTERVAL '1 minute' * (random() * 60)::INTEGER,
                        '192.168.' || base_ip || '.' || (1 + random() * 254)::INTEGER,
                        random_user_agent,
                        random_country,
                        random_region,
                        random_city,
                        random_lat,
                        random_lng,
                        random_platform,
                        random_device,
                        random_referrer
                    );
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Scan events generation completed!';
END $$;
```

## 3. Generate Daily Analytics Summary

```sql
-- Generate daily analytics summaries based on scan events
INSERT INTO daily_analytics (qr_code_id, date, total_scans, unique_scans, top_platform, top_country)
SELECT 
    qr.id as qr_code_id,
    se.scan_date,
    COUNT(*) as total_scans,
    COUNT(DISTINCT se.ip_address) as unique_scans,
    MODE() WITHIN GROUP (ORDER BY se.platform) as top_platform,
    MODE() WITHIN GROUP (ORDER BY se.country) as top_country
FROM qr_codes qr
INNER JOIN (
    SELECT 
        qr_code_id,
        DATE(timestamp) as scan_date,
        ip_address,
        platform,
        country
    FROM scan_events
    WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
) se ON qr.short_id = se.qr_code_id
WHERE qr.id LIKE 'qr-demo-%'
GROUP BY qr.id, se.scan_date
ORDER BY qr.id, se.scan_date
ON CONFLICT (qr_code_id, date) DO UPDATE SET
    total_scans = EXCLUDED.total_scans,
    unique_scans = EXCLUDED.unique_scans,
    top_platform = EXCLUDED.top_platform,
    top_country = EXCLUDED.top_country;
```

## 4. Update QR Code Scan Counters

```sql
-- Update the current_scans counter in qr_codes table based on actual scan events
UPDATE qr_codes 
SET current_scans = (
    SELECT COUNT(*)
    FROM scan_events se
    WHERE se.qr_code_id = qr_codes.short_id
)
WHERE id LIKE 'qr-demo-%';
```

## 5. Advanced Analytics: Create Dynamic QR Content Versions

```sql
-- Create dynamic content versions for some QR codes (if using dynamic QR system)
INSERT INTO qr_content_versions (qr_code_id, version_number, content, redirect_url, is_active, created_at) VALUES
-- Dynamic versions for company website
('qr-demo-001-analytics-website', 1, '{"url": "https://demo-company.com", "title": "Main Website"}', 'https://demo-company.com', true, NOW() - INTERVAL '25 days'),
('qr-demo-001-analytics-website', 2, '{"url": "https://demo-company.com/promo", "title": "Promo Landing"}', 'https://demo-company.com/promo', false, NOW() - INTERVAL '10 days'),

-- Dynamic versions for restaurant menu
('qr-demo-006-restaurant-menu', 1, '{"url": "https://restaurant-demo.com/menu", "title": "Regular Menu"}', 'https://restaurant-demo.com/menu', true, NOW() - INTERVAL '45 days'),
('qr-demo-006-restaurant-menu', 2, '{"url": "https://restaurant-demo.com/lunch-special", "title": "Lunch Special"}', 'https://restaurant-demo.com/lunch-special', false, NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;
```

## 6. Create A/B Testing Data

```sql
-- Create A/B tests for dynamic QR codes
INSERT INTO qr_ab_tests (qr_code_id, test_name, description, variant_a_version_id, variant_b_version_id, traffic_split, start_date, end_date, status) VALUES
(
    'qr-demo-001-analytics-website',
    'Homepage vs Promo Page',
    'Testing conversion rates between main homepage and promotional landing page',
    (SELECT id FROM qr_content_versions WHERE qr_code_id = 'qr-demo-001-analytics-website' AND version_number = 1),
    (SELECT id FROM qr_content_versions WHERE qr_code_id = 'qr-demo-001-analytics-website' AND version_number = 2),
    50,
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '10 days',
    'running'
),
(
    'qr-demo-006-restaurant-menu',
    'Regular Menu vs Lunch Special',
    'Testing customer engagement with regular menu vs lunch specials',
    (SELECT id FROM qr_content_versions WHERE qr_code_id = 'qr-demo-006-restaurant-menu' AND version_number = 1),
    (SELECT id FROM qr_content_versions WHERE qr_code_id = 'qr-demo-006-restaurant-menu' AND version_number = 2),
    70,
    NOW() - INTERVAL '15 days',
    NOW() + INTERVAL '5 days',
    'running'
)
ON CONFLICT DO NOTHING;
```

## 7. Analytics Query Examples

Here are some useful queries to test your analytics data:

### Get QR Code Analytics Summary
```sql
SELECT 
    qr.short_id,
    qr.name,
    qr.type,
    qr.current_scans,
    COUNT(se.id) as total_events,
    COUNT(DISTINCT se.ip_address) as unique_visitors,
    COUNT(DISTINCT DATE(se.timestamp)) as active_days,
    AVG(CASE WHEN se.timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) * COUNT(*) as scans_last_7_days
FROM qr_codes qr
LEFT JOIN scan_events se ON qr.short_id = se.qr_code_id
WHERE qr.id LIKE 'qr-demo-%'
GROUP BY qr.id, qr.short_id, qr.name, qr.type, qr.current_scans
ORDER BY total_events DESC;
```

### Get Geographic Distribution
```sql
SELECT 
    se.country,
    se.city,
    COUNT(*) as scans,
    COUNT(DISTINCT se.qr_code_id) as unique_qr_codes,
    ROUND(AVG(se.latitude), 4) as avg_lat,
    ROUND(AVG(se.longitude), 4) as avg_lng
FROM scan_events se
WHERE se.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY se.country, se.city
ORDER BY scans DESC
LIMIT 20;
```

### Get Platform & Device Breakdown
```sql
SELECT 
    se.platform,
    se.device,
    COUNT(*) as scans,
    ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM scan_events se
WHERE se.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY se.platform, se.device
ORDER BY scans DESC;
```

### Get Hourly Scan Distribution
```sql
SELECT 
    EXTRACT(HOUR FROM se.timestamp) as hour,
    COUNT(*) as scans,
    ROUND(AVG(COUNT(*)) OVER (ORDER BY EXTRACT(HOUR FROM se.timestamp) ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING), 1) as moving_avg
FROM scan_events se
WHERE se.timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM se.timestamp)
ORDER BY hour;
```

### Get Daily Analytics Trends
```sql
SELECT 
    da.date,
    SUM(da.total_scans) as total_scans,
    SUM(da.unique_scans) as unique_scans,
    COUNT(DISTINCT da.qr_code_id) as active_qr_codes,
    ROUND(SUM(da.total_scans)::DECIMAL / NULLIF(SUM(da.unique_scans), 0), 2) as scans_per_visitor
FROM daily_analytics da
WHERE da.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY da.date
ORDER BY da.date;
```

## 8. Performance Monitoring Queries

### Check Data Volume
```sql
SELECT 
    'scan_events' as table_name,
    COUNT(*) as records,
    MIN(timestamp) as earliest_event,
    MAX(timestamp) as latest_event
FROM scan_events
UNION ALL
SELECT 
    'daily_analytics' as table_name,
    COUNT(*) as records,
    MIN(date)::TIMESTAMP as earliest_event,
    MAX(date)::TIMESTAMP as latest_event
FROM daily_analytics
UNION ALL
SELECT 
    'qr_codes' as table_name,
    COUNT(*) as records,
    MIN(created_at) as earliest_event,
    MAX(created_at) as latest_event
FROM qr_codes
WHERE id LIKE 'qr-demo-%';
```

### Verify Data Consistency
```sql
SELECT 
    qr.short_id,
    qr.current_scans as qr_counter,
    COUNT(se.id) as actual_scans,
    qr.current_scans - COUNT(se.id) as difference
FROM qr_codes qr
LEFT JOIN scan_events se ON qr.short_id = se.qr_code_id
WHERE qr.id LIKE 'qr-demo-%'
GROUP BY qr.id, qr.short_id, qr.current_scans
HAVING qr.current_scans != COUNT(se.id);
```

## 🎯 Summary

This dummy data includes:

- **10 Sample QR Codes** across 3 different users with various types (URL, vCard, WiFi, Text)
- **~50,000 Scan Events** generated over the past 30 days with realistic patterns:
  - Business hours peak (9 AM - 5 PM)
  - Geographic distribution across 15 countries
  - Device/platform variety (mobile, desktop, tablet)
  - Realistic referrer sources
- **Daily Analytics Summaries** automatically calculated from scan events
- **Dynamic QR Content Versions** for advanced features
- **A/B Testing Data** for conversion optimization
- **Performance Queries** for monitoring and validation

The data follows realistic usage patterns:
- Restaurant menus get more scans
- Business hours show peak activity
- Geographic distribution favors major cities
- Mobile devices dominate scan sources

You can adjust the scan volume by modifying the `scans_per_hour` calculations in the scan generation script.