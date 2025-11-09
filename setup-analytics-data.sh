#!/bin/bash

# Analytics Database Dummy Data Setup Script
# This script populates your QR SaaS database with realistic analytics data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qr_saas}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo -e "${BLUE}🗄️  QR SaaS Analytics - Database Dummy Data Setup${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql is not installed or not available in PATH${NC}"
    echo -e "${YELLOW}Please install PostgreSQL client tools and try again${NC}"
    exit 1
fi

# Test database connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
export PGPASSWORD=$DB_PASSWORD
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database${NC}"
    echo -e "${YELLOW}Please check your database configuration:${NC}"
    echo -e "  Host: $DB_HOST"
    echo -e "  Port: $DB_PORT" 
    echo -e "  Database: $DB_NAME"
    echo -e "  User: $DB_USER"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Function to execute SQL with progress
execute_sql() {
    local description=$1
    local sql=$2
    echo -e "${BLUE}📊 $description...${NC}"
    if echo "$sql" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q; then
        echo -e "${GREEN}✅ $description completed${NC}"
    else
        echo -e "${RED}❌ Error: $description failed${NC}"
        exit 1
    fi
}

# 1. Create sample users and QR codes
execute_sql "Creating sample users and QR codes" "
-- Insert sample users for analytics testing
INSERT INTO users (id, email, username, password_hash, full_name, subscription_tier, is_verified, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'analytics@demo.com', 'analytics_demo', '\$2b\$10\$rGQHFh2Cv7hZZl7Zj7mZWu.VKVzRjZrKxXgO0lz5mJz8QHgxLpZUa', 'Analytics Demo User', 'pro', true, NOW() - INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440002', 'business@demo.com', 'business_demo', '\$2b\$10\$rGQHFh2Cv7hZZl7Zj7mZWu.VKVzRjZrKxXgO0lz5mJz8QHgxLpZUa', 'Business Demo User', 'business', true, NOW() - INTERVAL '60 days'),
('550e8400-e29b-41d4-a716-446655440003', 'enterprise@demo.com', 'enterprise_demo', '\$2b\$10\$rGQHFh2Cv7hZZl7Zj7mZWu.VKVzRjZrKxXgO0lz5mJz8QHgxLpZUa', 'Enterprise Demo User', 'enterprise', true, NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Create default categories for demo users
SELECT create_default_categories('550e8400-e29b-41d4-a716-446655440001');
SELECT create_default_categories('550e8400-e29b-41d4-a716-446655440002');
SELECT create_default_categories('550e8400-e29b-41d4-a716-446655440003');
"

# 2. Create QR codes
execute_sql "Creating sample QR codes" "
INSERT INTO qr_codes (id, user_id, category_id, short_id, name, type, content, design_config, target_url, is_active, current_scans, created_at) VALUES 
-- Analytics Demo User QR Codes
('qr-demo-001-analytics-website', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Business' LIMIT 1), 'DEMO001', 'Company Website', 'url', '{\"url\": \"https://demo-company.com\"}', '{\"size\": 300, \"errorCorrectionLevel\": \"M\", \"foregroundColor\": \"#000000\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"square\", \"margin\": 4}', 'https://demo-company.com', true, 1247, NOW() - INTERVAL '25 days'),
('qr-demo-002-product-catalog', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Marketing' LIMIT 1), 'DEMO002', 'Product Catalog', 'url', '{\"url\": \"https://demo-company.com/products\"}', '{\"size\": 350, \"errorCorrectionLevel\": \"M\", \"foregroundColor\": \"#3B82F6\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"rounded\", \"margin\": 4}', 'https://demo-company.com/products', true, 892, NOW() - INTERVAL '20 days'),
('qr-demo-003-contact-card', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Business' LIMIT 1), 'DEMO003', 'Contact Card', 'vcard', '{\"firstName\": \"John\", \"lastName\": \"Doe\", \"email\": \"john@demo.com\", \"phone\": \"+1234567890\", \"company\": \"Demo Company\"}', '{\"size\": 300, \"errorCorrectionLevel\": \"H\", \"foregroundColor\": \"#059669\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"dots\", \"margin\": 4}', null, true, 634, NOW() - INTERVAL '18 days'),
('qr-demo-004-event-ticket', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'Events' LIMIT 1), 'DEMO004', 'Conference 2024', 'text', '{\"text\": \"Conference 2024 - Ticket #12345\"}', '{\"size\": 200, \"errorCorrectionLevel\": \"H\", \"foregroundColor\": \"#7c3aed\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"circle\", \"margin\": 4}', null, true, 1156, NOW() - INTERVAL '15 days'),
('qr-demo-005-wifi-access', '550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440001' AND name = 'General' LIMIT 1), 'DEMO005', 'Office WiFi', 'wifi', '{\"ssid\": \"DemoOffice\", \"password\": \"Demo123!\", \"security\": \"WPA\"}', '{\"size\": 250, \"errorCorrectionLevel\": \"M\", \"foregroundColor\": \"#dc2626\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"square\", \"margin\": 4}', null, true, 423, NOW() - INTERVAL '12 days'),
-- Business Demo User QR Codes
('qr-demo-006-restaurant-menu', '550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' AND name = 'Business' LIMIT 1), 'DEMO006', 'Restaurant Menu', 'url', '{\"url\": \"https://restaurant-demo.com/menu\"}', '{\"size\": 400, \"errorCorrectionLevel\": \"M\", \"foregroundColor\": \"#f59e0b\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"rounded\", \"margin\": 4}', 'https://restaurant-demo.com/menu', true, 2341, NOW() - INTERVAL '45 days'),
('qr-demo-007-social-media', '550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' AND name = 'Marketing' LIMIT 1), 'DEMO007', 'Social Media Links', 'url', '{\"url\": \"https://linktr.ee/restaurant-demo\"}', '{\"size\": 300, \"errorCorrectionLevel\": \"M\", \"foregroundColor\": \"#ec4899\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"dots\", \"margin\": 4}', 'https://linktr.ee/restaurant-demo', true, 1567, NOW() - INTERVAL '35 days'),
('qr-demo-008-feedback-form', '550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440002' AND name = 'General' LIMIT 1), 'DEMO008', 'Customer Feedback', 'url', '{\"url\": \"https://forms.google.com/feedback-demo\"}', '{\"size\": 250, \"errorCorrectionLevel\": \"M\", \"foregroundColor\": \"#10b981\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"square\", \"margin\": 4}', 'https://forms.google.com/feedback-demo', true, 789, NOW() - INTERVAL '28 days'),
-- Enterprise Demo User QR Codes
('qr-demo-009-employee-badge', '550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440003' AND name = 'Business' LIMIT 1), 'DEMO009', 'Employee Badge', 'vcard', '{\"firstName\": \"Jane\", \"lastName\": \"Smith\", \"email\": \"jane@enterprise-demo.com\", \"phone\": \"+9876543210\", \"company\": \"Enterprise Demo Corp\", \"title\": \"Senior Manager\"}', '{\"size\": 200, \"errorCorrectionLevel\": \"H\", \"foregroundColor\": \"#1f2937\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"rounded\", \"margin\": 4}', null, true, 345, NOW() - INTERVAL '70 days'),
('qr-demo-010-asset-tracking', '550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM qr_categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440003' AND name = 'General' LIMIT 1), 'DEMO010', 'Asset #A1234', 'text', '{\"text\": \"Asset ID: A1234\\nLocation: Building B, Floor 3\\nPurchased: 2023-01-15\"}', '{\"size\": 150, \"errorCorrectionLevel\": \"H\", \"foregroundColor\": \"#374151\", \"backgroundColor\": \"#ffffff\", \"pattern\": \"square\", \"margin\": 2}', null, true, 156, NOW() - INTERVAL '65 days')
ON CONFLICT (id) DO NOTHING;
"

# 3. Generate scan events (this is the most time-consuming part)
echo -e "${BLUE}📊 Generating scan events (this may take a few minutes)...${NC}"
echo -e "${YELLOW}⏳ Creating ~50,000 realistic scan events across 30 days...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q << 'EOF'
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
    total_scans INTEGER := 0;
BEGIN
    FOR qr_record IN 
        SELECT id, short_id, name, type, created_at, current_scans
        FROM qr_codes 
        WHERE id LIKE 'qr-demo-%'
    LOOP
        FOR scan_date IN 
            SELECT generate_series(
                GREATEST(qr_record.created_at::DATE, CURRENT_DATE - INTERVAL '30 days'), 
                CURRENT_DATE, 
                '1 day'::INTERVAL
            )::DATE
        LOOP
            FOR hour_int IN 0..23 LOOP
                scans_per_hour := CASE 
                    WHEN hour_int BETWEEN 9 AND 17 THEN (random() * 20)::INTEGER + 5
                    WHEN hour_int BETWEEN 18 AND 22 THEN (random() * 15)::INTEGER + 2
                    WHEN hour_int BETWEEN 6 AND 8 THEN (random() * 10)::INTEGER + 1
                    ELSE (random() * 5)::INTEGER
                END;
                
                scans_per_hour := CASE
                    WHEN qr_record.short_id = 'DEMO006' THEN scans_per_hour * 2
                    WHEN qr_record.short_id = 'DEMO001' THEN scans_per_hour * 1.5::INTEGER
                    WHEN qr_record.short_id = 'DEMO010' THEN GREATEST(scans_per_hour / 3, 1)
                    ELSE scans_per_hour
                END;
                
                FOR i IN 1..scans_per_hour LOOP
                    random_country := countries[1 + (random() * array_length(countries, 1))::INTEGER];
                    random_region := regions[1 + (random() * array_length(regions, 1))::INTEGER];
                    random_city := cities[1 + (random() * array_length(cities, 1))::INTEGER];
                    
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
                            random_lat := (random() - 0.5) * 180;
                            random_lng := (random() - 0.5) * 360;
                    END CASE;
                    
                    random_platform := platforms[1 + (random() * array_length(platforms, 1))::INTEGER];
                    random_device := devices[1 + (random() * array_length(devices, 1))::INTEGER];
                    random_user_agent := user_agents[1 + (random() * array_length(user_agents, 1))::INTEGER];
                    random_referrer := referrers[1 + (random() * array_length(referrers, 1))::INTEGER];
                    
                    base_ip := (random() * 255)::INTEGER;
                    
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
                    
                    total_scans := total_scans + 1;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated % scan events successfully!', total_scans;
END $$;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Scan events generation completed${NC}"
else
    echo -e "${RED}❌ Error: Scan events generation failed${NC}"
    exit 1
fi

# 4. Generate daily analytics summaries
execute_sql "Generating daily analytics summaries" "
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
"

# 5. Update QR code scan counters
execute_sql "Updating QR code scan counters" "
UPDATE qr_codes 
SET current_scans = (
    SELECT COUNT(*)
    FROM scan_events se
    WHERE se.qr_code_id = qr_codes.short_id
)
WHERE id LIKE 'qr-demo-%';
"

# 6. Verify data integrity
echo -e "${BLUE}🔍 Verifying data integrity...${NC}"
VERIFICATION_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    COUNT(*) as total_users
FROM users 
WHERE id LIKE '550e8400-e29b-41d4-a716-44665544000%';
")

QR_CODES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM qr_codes WHERE id LIKE 'qr-demo-%';
")

SCAN_EVENTS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM scan_events WHERE qr_code_id LIKE 'DEMO%';
")

DAILY_ANALYTICS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM daily_analytics WHERE qr_code_id LIKE 'qr-demo-%';
")

echo -e "${GREEN}✅ Data verification completed:${NC}"
echo -e "  📊 Demo Users: $(echo $VERIFICATION_RESULT | xargs)"
echo -e "  🎯 QR Codes: $(echo $QR_CODES_COUNT | xargs)" 
echo -e "  📈 Scan Events: $(echo $SCAN_EVENTS_COUNT | xargs)"
echo -e "  📅 Daily Analytics: $(echo $DAILY_ANALYTICS_COUNT | xargs)"

# 7. Show sample analytics query
echo -e "${BLUE}📊 Sample Analytics Query Results:${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    qr.short_id as \"QR ID\",
    qr.name as \"QR Name\",
    qr.current_scans as \"Total Scans\",
    COUNT(DISTINCT se.ip_address) as \"Unique Visitors\",
    COUNT(DISTINCT DATE(se.timestamp)) as \"Active Days\"
FROM qr_codes qr
LEFT JOIN scan_events se ON qr.short_id = se.qr_code_id
WHERE qr.id LIKE 'qr-demo-%'
GROUP BY qr.id, qr.short_id, qr.name, qr.current_scans
ORDER BY qr.current_scans DESC;
"

echo ""
echo -e "${GREEN}🎉 Analytics dummy data setup completed successfully!${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. 🚀 Start your analytics service: ${BLUE}cd apps/analytics && npm run dev${NC}"
echo -e "2. 📊 View the demo data in your analytics dashboard"
echo -e "3. 🧪 Run analytics queries using the sample QR IDs: DEMO001-DEMO010"
echo -e "4. 📖 Check ${BLUE}/private/var/www/qrgeneration/ANALYTICS_DUMMY_DATA.md${NC} for more query examples"
echo ""
echo -e "${BLUE}Demo User Credentials:${NC}"
echo -e "  📧 analytics@demo.com (Pro user with 5 QR codes)"
echo -e "  📧 business@demo.com (Business user with 3 QR codes)"  
echo -e "  📧 enterprise@demo.com (Enterprise user with 2 QR codes)"
echo ""
echo -e "${GREEN}Happy analyzing! 📊✨${NC}"