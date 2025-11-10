-- API Service Database Schema

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL,
    prefix VARCHAR(20) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    rate_limit JSONB,
    ip_whitelist JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- API Key Usage table
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    ip_address INET NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    retry_policy JSONB NOT NULL DEFAULT '{}',
    headers JSONB,
    timeout INTEGER NOT NULL DEFAULT 30000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Webhook Deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    platform VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_settings JSONB NOT NULL DEFAULT '{}',
    mapping JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- SDK Generation Jobs table
CREATE TABLE IF NOT EXISTS sdk_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    language VARCHAR(50) NOT NULL,
    package_name VARCHAR(100) NOT NULL,
    options JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    file_path TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'expired')),
    CHECK (language IN ('javascript', 'typescript-fetch', 'python', 'php', 'java', 'csharp-netcore', 'go'))
);

-- SDK Download Statistics table
CREATE TABLE IF NOT EXISTS sdk_download_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES sdk_generation_jobs(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- SDK Generation Usage Metrics table for analytics
CREATE TABLE IF NOT EXISTS sdk_generation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    language VARCHAR(50) NOT NULL,
    generation_count INTEGER DEFAULT 1,
    total_downloads INTEGER DEFAULT 0,
    last_generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, language)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(is_active);

-- SDK generation indexes
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_user_id ON sdk_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_status ON sdk_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_expires_at ON sdk_generation_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_created_at ON sdk_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_user_language ON sdk_generation_jobs(user_id, language, package_name);

CREATE INDEX IF NOT EXISTS idx_sdk_download_stats_job_id ON sdk_download_stats(job_id);
CREATE INDEX IF NOT EXISTS idx_sdk_download_stats_downloaded_at ON sdk_download_stats(downloaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_user_id ON sdk_generation_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_language ON sdk_generation_metrics(language);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_last_generated ON sdk_generation_metrics(last_generated_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- SDK Generation Metrics Functions and Triggers
CREATE OR REPLACE FUNCTION update_sdk_generation_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO sdk_generation_metrics (user_id, language, generation_count, last_generated_at)
        VALUES (NEW.user_id, NEW.language, 1, NEW.completed_at)
        ON CONFLICT (user_id, language)
        DO UPDATE SET
            generation_count = sdk_generation_metrics.generation_count + 1,
            last_generated_at = NEW.completed_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sdk_generation_metrics_trigger
    AFTER UPDATE ON sdk_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_sdk_generation_metrics();

CREATE OR REPLACE FUNCTION update_sdk_download_metrics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sdk_generation_metrics 
    SET total_downloads = total_downloads + 1,
        updated_at = CURRENT_TIMESTAMP
    FROM sdk_generation_jobs sgj
    WHERE sdk_generation_metrics.user_id = sgj.user_id 
    AND sdk_generation_metrics.language = sgj.language
    AND sgj.id = NEW.job_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sdk_download_metrics_trigger
    AFTER INSERT ON sdk_download_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_sdk_download_metrics();

CREATE OR REPLACE FUNCTION cleanup_expired_sdk_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted_jobs AS (
        DELETE FROM sdk_generation_jobs
        WHERE expires_at < CURRENT_TIMESTAMP OR status = 'expired'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_jobs;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;