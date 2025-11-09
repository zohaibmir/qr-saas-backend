-- Analytics Dummy Data for QR SaaS Platform
-- This script inserts comprehensive test data for all analytics components

\c qr_saas;

-- Insert dummy users first
INSERT INTO users (id, email, password_hash, first_name, last_name, is_verified, created_at, updated_at) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'john.doe@example.com', '$2b$10$hash1', 'John', 'Doe', true, NOW() - INTERVAL '30 days', NOW()),
    ('550e8400-e29b-41d4-a716-446655440001', 'jane.smith@example.com', '$2b$10$hash2', 'Jane', 'Smith', true, NOW() - INTERVAL '25 days', NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'bob.johnson@example.com', '$2b$10$hash3', 'Bob', 'Johnson', true, NOW() - INTERVAL '20 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert dummy QR codes
INSERT INTO qr_codes (id, user_id, name, qr_text, destination_url, short_id, qr_data_url, created_at, updated_at, is_active)
VALUES 
    ('650e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Marketing Campaign QR', 'https://example.com/campaign1', 'https://example.com/campaign1', 'camp1', 'data:image/png;base64,qr1', NOW() - INTERVAL '25 days', NOW(), true),
    ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Product Demo QR', 'https://example.com/demo', 'https://example.com/demo', 'demo1', 'data:image/png;base64,qr2', NOW() - INTERVAL '20 days', NOW(), true),
    ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Event Registration QR', 'https://example.com/event', 'https://example.com/event', 'event1', 'data:image/png;base64,qr3', NOW() - INTERVAL '15 days', NOW(), true),
    ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Restaurant Menu QR', 'https://example.com/menu', 'https://example.com/menu', 'menu1', 'data:image/png;base64,qr4', NOW() - INTERVAL '10 days', NOW(), true)
ON CONFLICT (id) DO NOTHING;

-- Insert scan events (realistic distribution over time)
INSERT INTO scan_events (id, qr_code_id, user_agent, ip_address, location, timestamp, country, city, device_type, browser, platform, referrer)
SELECT 
    gen_random_uuid(),
    qr_codes.id,
    CASE (random() * 4)::int
        WHEN 0 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
        WHEN 1 THEN 'Mozilla/5.0 (Android 12; Mobile; rv:106.0)'
        WHEN 2 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ELSE 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    END as user_agent,
    CASE (random() * 4)::int
        WHEN 0 THEN '192.168.1.' || (random() * 255)::int
        WHEN 1 THEN '10.0.0.' || (random() * 255)::int
        WHEN 2 THEN '172.16.0.' || (random() * 255)::int
        ELSE '203.0.113.' || (random() * 255)::int
    END as ip_address,
    CASE (random() * 5)::int
        WHEN 0 THEN 'New York, NY'
        WHEN 1 THEN 'Los Angeles, CA'
        WHEN 2 THEN 'Chicago, IL'
        WHEN 3 THEN 'Houston, TX'
        ELSE 'Phoenix, AZ'
    END as location,
    NOW() - (random() * INTERVAL '25 days') as timestamp,
    CASE (random() * 5)::int
        WHEN 0 THEN 'United States'
        WHEN 1 THEN 'Canada'
        WHEN 2 THEN 'United Kingdom'
        WHEN 3 THEN 'Germany'
        ELSE 'Australia'
    END as country,
    CASE (random() * 5)::int
        WHEN 0 THEN 'New York'
        WHEN 1 THEN 'Los Angeles'
        WHEN 2 THEN 'Chicago'
        WHEN 3 THEN 'Houston'
        ELSE 'Phoenix'
    END as city,
    CASE (random() * 3)::int
        WHEN 0 THEN 'mobile'
        WHEN 1 THEN 'desktop'
        ELSE 'tablet'
    END as device_type,
    CASE (random() * 4)::int
        WHEN 0 THEN 'Chrome'
        WHEN 1 THEN 'Safari'
        WHEN 2 THEN 'Firefox'
        ELSE 'Edge'
    END as browser,
    CASE (random() * 4)::int
        WHEN 0 THEN 'iOS'
        WHEN 1 THEN 'Android'
        WHEN 2 THEN 'Windows'
        ELSE 'macOS'
    END as platform,
    CASE (random() * 3)::int
        WHEN 0 THEN 'https://google.com'
        WHEN 1 THEN 'https://facebook.com'
        ELSE NULL
    END as referrer
FROM qr_codes
CROSS JOIN generate_series(1, 150) as series;

-- Insert conversion goals
INSERT INTO conversion_goals (id, qr_code_id, user_id, name, goal_type, target_url, value_amount, is_active, created_at, updated_at)
VALUES 
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Campaign Sign-ups', 'form_submit', 'https://example.com/signup', 50.00, true, NOW() - INTERVAL '20 days', NOW()),
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Demo Requests', 'url_visit', 'https://example.com/demo-request', 100.00, true, NOW() - INTERVAL '18 days', NOW()),
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Event Registrations', 'purchase', 'https://example.com/register', 25.00, true, NOW() - INTERVAL '15 days', NOW()),
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Menu Downloads', 'download', 'https://example.com/menu.pdf', 0.00, true, NOW() - INTERVAL '10 days', NOW());

-- Insert conversion events (some conversions from the scans)
INSERT INTO conversion_events (id, goal_id, scan_event_id, qr_code_id, user_id, conversion_value, conversion_data, timestamp)
SELECT 
    gen_random_uuid(),
    cg.id,
    se.id,
    se.qr_code_id,
    cg.user_id,
    CASE 
        WHEN cg.goal_type = 'purchase' THEN cg.value_amount + (random() * 20 - 10)
        WHEN cg.goal_type = 'form_submit' THEN cg.value_amount
        ELSE 0
    END as conversion_value,
    jsonb_build_object(
        'source', 'qr_scan',
        'device', se.device_type,
        'location', se.location,
        'conversion_type', cg.goal_type
    ) as conversion_data,
    se.timestamp + INTERVAL '5 minutes'
FROM conversion_goals cg
JOIN scan_events se ON se.qr_code_id = cg.qr_code_id
WHERE random() < 0.15  -- 15% conversion rate
LIMIT 25;

-- Insert heatmap data
INSERT INTO heatmap_data (id, qr_code_id, heatmap_type, data_key, value, metadata, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    qr_codes.id,
    'click_heatmap',
    'coordinates',
    (random() * 100)::int,
    jsonb_build_object(
        'x', (random() * 400)::int,
        'y', (random() * 300)::int,
        'intensity', (random() * 10)::int + 1
    ),
    NOW() - (random() * INTERVAL '20 days'),
    NOW()
FROM qr_codes
CROSS JOIN generate_series(1, 50);

-- Insert scroll heatmap data
INSERT INTO heatmap_data (id, qr_code_id, heatmap_type, data_key, value, metadata, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    qr_codes.id,
    'scroll_heatmap',
    'scroll_depth',
    (random() * 100)::int,
    jsonb_build_object(
        'depth_percentage', (random() * 100)::int,
        'time_spent', (random() * 60)::int + 5,
        'page_height', 1200 + (random() * 800)::int
    ),
    NOW() - (random() * INTERVAL '20 days'),
    NOW()
FROM qr_codes
CROSS JOIN generate_series(1, 30);

-- Insert peak time analysis data
INSERT INTO peak_time_analysis (id, qr_code_id, analysis_date, hourly_data, daily_patterns, weekly_patterns, insights, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    qr_codes.id,
    CURRENT_DATE - (series % 7),
    jsonb_build_object(
        'hour_0', (random() * 5)::int,
        'hour_6', (random() * 15)::int + 5,
        'hour_9', (random() * 25)::int + 10,
        'hour_12', (random() * 35)::int + 15,
        'hour_15', (random() * 30)::int + 12,
        'hour_18', (random() * 40)::int + 20,
        'hour_21', (random() * 20)::int + 8
    ),
    jsonb_build_object(
        'monday', (random() * 100)::int + 50,
        'tuesday', (random() * 100)::int + 60,
        'wednesday', (random() * 100)::int + 70,
        'thursday', (random() * 100)::int + 65,
        'friday', (random() * 100)::int + 80,
        'saturday', (random() * 100)::int + 45,
        'sunday', (random() * 100)::int + 30
    ),
    jsonb_build_object(
        'week_1', (random() * 500)::int + 200,
        'week_2', (random() * 500)::int + 250,
        'week_3', (random() * 500)::int + 300,
        'week_4', (random() * 500)::int + 280
    ),
    jsonb_build_object(
        'peak_hour', '18:00',
        'peak_day', 'Friday',
        'trend', 'increasing',
        'recommendations', ARRAY['Focus marketing on Friday evenings', 'Increase weekend promotion']
    ),
    NOW() - (series * INTERVAL '1 day'),
    NOW()
FROM qr_codes
CROSS JOIN generate_series(0, 6) as series;

-- Insert export jobs
INSERT INTO export_jobs (id, user_id, qr_code_id, export_type, parameters, status, file_url, created_at, completed_at, error_message)
VALUES 
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440000', 'scan_data', '{"format": "csv", "date_range": "30_days"}', 'completed', 'https://storage.example.com/exports/scan_data_123.csv', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '2 minutes', NULL),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440001', 'analytics_summary', '{"format": "pdf", "include_charts": true}', 'completed', 'https://storage.example.com/exports/analytics_123.pdf', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 minute', NULL),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', 'conversion_report', '{"format": "xlsx", "include_funnel": true}', 'processing', NULL, NOW() - INTERVAL '1 hour', NULL, NULL),
    (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003', 'heatmap_data', '{"format": "json", "heatmap_type": "all"}', 'failed', NULL, NOW() - INTERVAL '2 days', NULL, 'File size exceeded limit');

-- Insert analytics alerts
INSERT INTO analytics_alerts (id, qr_code_id, user_id, alert_type, conditions, is_active, last_triggered, trigger_count, created_at, updated_at)
VALUES 
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'scan_threshold', '{"threshold": 100, "period": "daily", "comparison": "greater_than"}', true, NOW() - INTERVAL '2 days', 3, NOW() - INTERVAL '10 days', NOW()),
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'conversion_drop', '{"threshold": 5, "period": "hourly", "comparison": "less_than"}', true, NOW() - INTERVAL '6 hours', 1, NOW() - INTERVAL '8 days', NOW()),
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'geographic_anomaly', '{"countries": ["US", "CA"], "threshold": 20, "comparison": "outside_range"}', true, NULL, 0, NOW() - INTERVAL '5 days', NOW()),
    (gen_random_uuid(), '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'performance_alert', '{"response_time": 2000, "error_rate": 5, "comparison": "greater_than"}', false, NOW() - INTERVAL '1 day', 2, NOW() - INTERVAL '3 days', NOW());

-- Insert real-time metrics (simulated recent activity)
-- Note: This would typically be in Redis, but we'll add some recent scan events for demo
INSERT INTO scan_events (id, qr_code_id, user_agent, ip_address, location, timestamp, country, city, device_type, browser, platform)
SELECT 
    gen_random_uuid(),
    qr_codes.id,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    '192.168.1.' || (random() * 255)::int,
    'Live Location',
    NOW() - (random() * INTERVAL '10 minutes'),
    'United States',
    'San Francisco',
    'mobile',
    'Safari',
    'iOS'
FROM qr_codes
CROSS JOIN generate_series(1, 5);

ANALYZE scan_events;
ANALYZE conversion_events;
ANALYZE heatmap_data;
ANALYZE peak_time_analysis;
ANALYZE export_jobs;
ANALYZE analytics_alerts;

-- Display summary of inserted data
SELECT 'Scan Events' as table_name, COUNT(*) as record_count FROM scan_events
UNION ALL
SELECT 'Conversion Goals', COUNT(*) FROM conversion_goals
UNION ALL
SELECT 'Conversion Events', COUNT(*) FROM conversion_events
UNION ALL
SELECT 'Heatmap Data', COUNT(*) FROM heatmap_data
UNION ALL
SELECT 'Peak Time Analysis', COUNT(*) FROM peak_time_analysis
UNION ALL
SELECT 'Export Jobs', COUNT(*) FROM export_jobs
UNION ALL
SELECT 'Analytics Alerts', COUNT(*) FROM analytics_alerts
ORDER BY table_name;

-- Show recent activity summary
SELECT 
    qc.name as qr_name,
    COUNT(se.id) as total_scans,
    COUNT(DISTINCT se.country) as countries_reached,
    COUNT(ce.id) as conversions,
    ROUND(AVG(ce.conversion_value::numeric), 2) as avg_conversion_value
FROM qr_codes qc
LEFT JOIN scan_events se ON qc.id = se.qr_code_id
LEFT JOIN conversion_events ce ON qc.id = ce.qr_code_id
GROUP BY qc.id, qc.name
ORDER BY total_scans DESC;

ECHO 'Analytics dummy data inserted successfully!';