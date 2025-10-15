-- ===============================================
-- ADVANCED ANALYTICS SYSTEM TABLES
-- ===============================================

-- Conversion Goals Table
CREATE TABLE IF NOT EXISTS conversion_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('url_visit', 'form_completion', 'purchase', 'download', 'signup', 'custom')),
    target_url TEXT,
    target_selector VARCHAR(500), -- CSS selector for tracking
    value_amount DECIMAL(10,2), -- Monetary value of conversion
    value_currency VARCHAR(3) DEFAULT 'USD',
    funnel_steps JSONB, -- Array of funnel step definitions
    attribution_window_hours INTEGER DEFAULT 24, -- Attribution window in hours
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_conversion_goals_qr_code (qr_code_id),
    INDEX idx_conversion_goals_user (user_id),
    INDEX idx_conversion_goals_active (qr_code_id, is_active) WHERE is_active = true
);

-- Conversion Events Table
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES conversion_goals(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    user_fingerprint VARCHAR(255), -- Browser fingerprint for user tracking
    step_number INTEGER NOT NULL DEFAULT 1, -- Funnel step number
    step_name VARCHAR(255), -- Name of the funnel step
    event_type VARCHAR(50) NOT NULL, -- Type of conversion event
    event_data JSONB, -- Additional event data
    attribution_type VARCHAR(50) DEFAULT 'direct', -- first_touch, last_touch, linear, etc.
    conversion_value DECIMAL(10,2), -- Value of this specific conversion
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    page_url TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_conversion_events_goal (goal_id),
    INDEX idx_conversion_events_qr_code (qr_code_id),
    INDEX idx_conversion_events_session (session_id),
    INDEX idx_conversion_events_timestamp (timestamp),
    INDEX idx_conversion_events_funnel (goal_id, step_number, timestamp)
);

-- Heatmap Data Storage Table
CREATE TABLE IF NOT EXISTS heatmap_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    heatmap_type VARCHAR(50) NOT NULL CHECK (heatmap_type IN ('geographic', 'temporal', 'device', 'platform')),
    data_key VARCHAR(255) NOT NULL, -- Country code, hour, device name, etc.
    data_value INTEGER NOT NULL DEFAULT 0, -- Count/intensity value
    normalized_value DECIMAL(5,4) DEFAULT 0.0, -- Normalized value (0-1)
    coordinates_lat DECIMAL(10,7), -- For geographic heatmaps
    coordinates_lng DECIMAL(10,7), -- For geographic heatmaps
    time_period TIMESTAMP, -- For temporal heatmaps
    metadata JSONB, -- Additional context data
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- For cache invalidation
    
    INDEX idx_heatmap_data_qr_code (qr_code_id),
    INDEX idx_heatmap_data_type (qr_code_id, heatmap_type),
    INDEX idx_heatmap_data_key (qr_code_id, heatmap_type, data_key),
    INDEX idx_heatmap_data_time (qr_code_id, time_period),
    INDEX idx_heatmap_data_expires (expires_at),
    UNIQUE(qr_code_id, heatmap_type, data_key, time_period)
);

-- Real-time Metrics Cache Table  
CREATE TABLE IF NOT EXISTS realtime_metrics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL, -- active_scans, current_viewers, response_time, etc.
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50), -- seconds, count, percentage, etc.
    aggregation_period VARCHAR(20) DEFAULT 'instant', -- instant, 1min, 5min, 15min, 1hour
    tags JSONB, -- Additional metric tags (country, device, etc.)
    timestamp TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
    
    INDEX idx_realtime_metrics_qr_code (qr_code_id),
    INDEX idx_realtime_metrics_type (qr_code_id, metric_type),
    INDEX idx_realtime_metrics_timestamp (timestamp),
    INDEX idx_realtime_metrics_expires (expires_at),
    UNIQUE(qr_code_id, metric_type, aggregation_period, timestamp)
);

-- Peak Time Analysis Results Table
CREATE TABLE IF NOT EXISTS peak_time_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL,
    time_granularity VARCHAR(20) NOT NULL CHECK (time_granularity IN ('hour', 'day', 'week', 'month')),
    peak_periods JSONB NOT NULL, -- Array of peak time periods with intensities
    trough_periods JSONB NOT NULL, -- Array of low activity periods
    business_hours_performance JSONB, -- Business hours vs off-hours analysis
    day_of_week_patterns JSONB, -- Weekly pattern analysis
    seasonal_trends JSONB, -- Monthly/seasonal trend data
    recommendations JSONB, -- AI-generated recommendations
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- Confidence in analysis (0-1)
    data_points_analyzed INTEGER NOT NULL DEFAULT 0,
    analysis_version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_peak_analysis_qr_code (qr_code_id),
    INDEX idx_peak_analysis_date (analysis_date),
    INDEX idx_peak_analysis_granularity (qr_code_id, time_granularity),
    UNIQUE(qr_code_id, analysis_date, time_granularity)
);

-- Export Jobs Table
CREATE TABLE IF NOT EXISTS analytics_export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE, -- NULL for multi-QR exports
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('excel', 'pdf', 'csv', 'json')),
    export_format VARCHAR(50) NOT NULL, -- standard, executive, detailed, custom
    configuration JSONB NOT NULL, -- Export settings and filters
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    download_url TEXT,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'expired')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    error_message TEXT,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    downloaded_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_export_jobs_user (user_id),
    INDEX idx_export_jobs_qr_code (qr_code_id),
    INDEX idx_export_jobs_status (status),
    INDEX idx_export_jobs_expires (expires_at),
    INDEX idx_export_jobs_created (created_at)
);

-- Analytics Alerts Table
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('scan_threshold', 'conversion_drop', 'traffic_spike', 'anomaly', 'goal_achieved')),
    alert_name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL, -- Alert trigger conditions
    notification_channels JSONB DEFAULT '[]', -- email, sms, webhook
    is_active BOOLEAN DEFAULT true,
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP,
    last_notification_sent_at TIMESTAMP,
    snooze_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_analytics_alerts_user (user_id),
    INDEX idx_analytics_alerts_qr_code (qr_code_id),
    INDEX idx_analytics_alerts_active (qr_code_id, is_active) WHERE is_active = true,
    INDEX idx_analytics_alerts_type (alert_type)
);

-- Analytics Alert History Table
CREATE TABLE IF NOT EXISTS analytics_alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES analytics_alerts(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP DEFAULT NOW(),
    trigger_value DECIMAL(15,4), -- The value that triggered the alert
    threshold_value DECIMAL(15,4), -- The threshold that was exceeded
    notification_sent BOOLEAN DEFAULT false,
    notification_channels_used JSONB, -- Which channels were used for notification
    metadata JSONB, -- Additional context about the trigger
    
    INDEX idx_alert_history_alert (alert_id),
    INDEX idx_alert_history_triggered (triggered_at)
);

-- WebSocket Connections Table (for real-time tracking)
CREATE TABLE IF NOT EXISTS realtime_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscribed_qr_codes TEXT[], -- Array of QR code IDs
    subscribed_metrics TEXT[], -- Array of metric types
    connection_metadata JSONB, -- Client info, user agent, etc.
    connected_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    disconnected_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    INDEX idx_realtime_connections_user (user_id),
    INDEX idx_realtime_connections_active (is_active, last_activity_at) WHERE is_active = true,
    INDEX idx_realtime_connections_qr_subscriptions USING GIN (subscribed_qr_codes)
);

-- ===============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ===============================================

-- Daily Analytics Summary (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_analytics_summary AS
SELECT 
    DATE_TRUNC('day', se.timestamp) as analytics_date,
    se.qr_code_id,
    COUNT(*) as total_scans,
    COUNT(DISTINCT se.ip_address) as unique_scans,
    COUNT(DISTINCT se.country) as unique_countries,
    COUNT(DISTINCT se.device) as unique_devices,
    MODE() WITHIN GROUP (ORDER BY se.country) as top_country,
    MODE() WITHIN GROUP (ORDER BY se.platform) as top_platform,
    MODE() WITHIN GROUP (ORDER BY se.device) as top_device,
    AVG(EXTRACT(HOUR FROM se.timestamp)) as avg_scan_hour,
    MIN(se.timestamp) as first_scan_time,
    MAX(se.timestamp) as last_scan_time
FROM scan_events se
WHERE se.timestamp >= CURRENT_DATE - INTERVAL '90 days' -- Keep 90 days of daily summaries
GROUP BY DATE_TRUNC('day', se.timestamp), se.qr_code_id;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_analytics_summary_unique 
ON daily_analytics_summary (analytics_date, qr_code_id);

-- Conversion Funnel Performance (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS conversion_funnel_summary AS
SELECT 
    cg.id as goal_id,
    cg.qr_code_id,
    cg.name as goal_name,
    DATE_TRUNC('day', ce.timestamp) as conversion_date,
    ce.step_number,
    COUNT(*) as step_completions,
    COUNT(DISTINCT ce.session_id) as unique_sessions,
    SUM(ce.conversion_value) as total_value,
    AVG(ce.conversion_value) as avg_value
FROM conversion_goals cg
JOIN conversion_events ce ON cg.id = ce.goal_id
WHERE ce.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cg.id, cg.qr_code_id, cg.name, DATE_TRUNC('day', ce.timestamp), ce.step_number;

-- Create unique index for conversion funnel view
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_funnel_summary_unique 
ON conversion_funnel_summary (goal_id, conversion_date, step_number);

-- ===============================================
-- ANALYTICS FUNCTIONS AND PROCEDURES
-- ===============================================

-- Function to update heatmap data
CREATE OR REPLACE FUNCTION update_heatmap_data(
    p_qr_code_id UUID,
    p_heatmap_type VARCHAR(50),
    p_data_key VARCHAR(255),
    p_increment INTEGER DEFAULT 1,
    p_coordinates_lat DECIMAL(10,7) DEFAULT NULL,
    p_coordinates_lng DECIMAL(10,7) DEFAULT NULL,
    p_time_period TIMESTAMP DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO heatmap_data (
        qr_code_id, heatmap_type, data_key, data_value, 
        coordinates_lat, coordinates_lng, time_period,
        expires_at
    ) VALUES (
        p_qr_code_id, p_heatmap_type, p_data_key, p_increment,
        p_coordinates_lat, p_coordinates_lng, p_time_period,
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (qr_code_id, heatmap_type, data_key, time_period)
    DO UPDATE SET 
        data_value = heatmap_data.data_value + p_increment,
        generated_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to normalize heatmap values
CREATE OR REPLACE FUNCTION normalize_heatmap_data(p_qr_code_id UUID, p_heatmap_type VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    max_value INTEGER;
    updated_count INTEGER;
BEGIN
    -- Get maximum value for this heatmap type
    SELECT MAX(data_value) INTO max_value
    FROM heatmap_data
    WHERE qr_code_id = p_qr_code_id AND heatmap_type = p_heatmap_type;
    
    -- Update normalized values
    UPDATE heatmap_data
    SET normalized_value = CASE 
        WHEN max_value > 0 THEN data_value::DECIMAL / max_value
        ELSE 0
    END
    WHERE qr_code_id = p_qr_code_id AND heatmap_type = p_heatmap_type;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cache real-time metrics
CREATE OR REPLACE FUNCTION cache_realtime_metric(
    p_qr_code_id UUID,
    p_metric_type VARCHAR(100),
    p_metric_value DECIMAL(15,4),
    p_metric_unit VARCHAR(50) DEFAULT NULL,
    p_aggregation_period VARCHAR(20) DEFAULT 'instant',
    p_tags JSONB DEFAULT NULL,
    p_ttl_seconds INTEGER DEFAULT 3600
) RETURNS VOID AS $$
BEGIN
    INSERT INTO realtime_metrics_cache (
        qr_code_id, metric_type, metric_value, metric_unit,
        aggregation_period, tags, expires_at
    ) VALUES (
        p_qr_code_id, p_metric_type, p_metric_value, p_metric_unit,
        p_aggregation_period, p_tags, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL
    )
    ON CONFLICT (qr_code_id, metric_type, aggregation_period, timestamp)
    DO UPDATE SET 
        metric_value = p_metric_value,
        metric_unit = p_metric_unit,
        tags = p_tags,
        expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger analytics alerts
CREATE OR REPLACE FUNCTION check_analytics_alerts(p_qr_code_id UUID)
RETURNS INTEGER AS $$
DECLARE
    alert_record RECORD;
    triggered_count INTEGER := 0;
BEGIN
    -- Loop through active alerts for this QR code
    FOR alert_record IN 
        SELECT * FROM analytics_alerts 
        WHERE qr_code_id = p_qr_code_id 
          AND is_active = true 
          AND (snooze_until IS NULL OR snooze_until < NOW())
    LOOP
        -- Check alert conditions based on type
        -- This is a simplified version - actual implementation would be more complex
        IF alert_record.alert_type = 'scan_threshold' THEN
            -- Check if scan count exceeds threshold
            NULL; -- Implementation would go here
        ELSIF alert_record.alert_type = 'traffic_spike' THEN
            -- Check for unusual traffic patterns
            NULL; -- Implementation would go here
        END IF;
        
        triggered_count := triggered_count + 1;
    END LOOP;
    
    RETURN triggered_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired data
CREATE OR REPLACE FUNCTION cleanup_analytics_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Clean up expired heatmap data
    DELETE FROM heatmap_data WHERE expires_at < NOW();
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Clean up expired real-time metrics
    DELETE FROM realtime_metrics_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
    
    -- Clean up expired export jobs
    UPDATE analytics_export_jobs 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status IN ('completed', 'failed');
    
    -- Clean up old scan events (keep based on subscription tier)
    -- This would be implemented based on business rules
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY conversion_funnel_summary;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- ANALYTICS TRIGGERS
-- ===============================================

-- Trigger to update heatmap data on scan events
CREATE OR REPLACE FUNCTION trigger_update_heatmap_on_scan()
RETURNS TRIGGER AS $$
BEGIN
    -- Update geographic heatmap
    IF NEW.country IS NOT NULL THEN
        PERFORM update_heatmap_data(
            NEW.qr_code_id::UUID, 
            'geographic', 
            NEW.country, 
            1, 
            NEW.latitude, 
            NEW.longitude,
            DATE_TRUNC('hour', NEW.timestamp)
        );
    END IF;
    
    -- Update device heatmap
    IF NEW.device IS NOT NULL THEN
        PERFORM update_heatmap_data(
            NEW.qr_code_id::UUID, 
            'device', 
            NEW.device, 
            1,
            NULL,
            NULL,
            DATE_TRUNC('hour', NEW.timestamp)
        );
    END IF;
    
    -- Update temporal heatmap
    PERFORM update_heatmap_data(
        NEW.qr_code_id::UUID, 
        'temporal', 
        EXTRACT(HOUR FROM NEW.timestamp)::VARCHAR, 
        1,
        NULL,
        NULL,
        DATE_TRUNC('hour', NEW.timestamp)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS scan_event_heatmap_update ON scan_events;
CREATE TRIGGER scan_event_heatmap_update
    AFTER INSERT ON scan_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_heatmap_on_scan();

-- Trigger to update real-time connection activity
CREATE OR REPLACE FUNCTION trigger_update_connection_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE realtime_connections 
    SET last_activity_at = NOW()
    WHERE connection_id = NEW.connection_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- ADVANCED ANALYTICS INDEXES FOR PERFORMANCE
-- ===============================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scan_events_analytics_combo ON scan_events (qr_code_id, timestamp, country, device, platform);
CREATE INDEX IF NOT EXISTS idx_scan_events_hourly ON scan_events (qr_code_id, DATE_TRUNC('hour', timestamp));
CREATE INDEX IF NOT EXISTS idx_scan_events_daily ON scan_events (qr_code_id, DATE_TRUNC('day', timestamp));

-- Partial indexes for active data
CREATE INDEX IF NOT EXISTS idx_conversion_goals_active_qr ON conversion_goals (qr_code_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_active_qr ON analytics_alerts (qr_code_id) WHERE is_active = true;

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_conversion_goals_funnel_steps ON conversion_goals USING GIN (funnel_steps);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_data ON conversion_events USING GIN (event_data);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_conditions ON analytics_alerts USING GIN (conditions);
CREATE INDEX IF NOT EXISTS idx_peak_analysis_recommendations ON peak_time_analysis USING GIN (recommendations);

-- Expression indexes for common calculations
CREATE INDEX IF NOT EXISTS idx_scan_events_hour_of_day ON scan_events (qr_code_id, EXTRACT(HOUR FROM timestamp));
CREATE INDEX IF NOT EXISTS idx_scan_events_day_of_week ON scan_events (qr_code_id, EXTRACT(DOW FROM timestamp));
CREATE INDEX IF NOT EXISTS idx_conversion_events_conversion_rate ON conversion_events (goal_id, step_number, session_id);

-- ===============================================
-- ANALYTICS SECURITY AND PERMISSIONS
-- ===============================================

-- Row Level Security for analytics data
ALTER TABLE conversion_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_export_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for data access (these would be customized based on your auth system)
-- CREATE POLICY user_conversion_goals ON conversion_goals FOR ALL USING (user_id = current_setting('app.user_id')::UUID);
-- CREATE POLICY user_analytics_alerts ON analytics_alerts FOR ALL USING (user_id = current_setting('app.user_id')::UUID);
-- CREATE POLICY user_export_jobs ON analytics_export_jobs FOR ALL USING (user_id = current_setting('app.user_id')::UUID);