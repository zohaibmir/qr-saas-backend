-- SDK Generation Tables

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

-- Indexes for SDK generation jobs
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_user_id ON sdk_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_status ON sdk_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_expires_at ON sdk_generation_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_created_at ON sdk_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_jobs_user_language ON sdk_generation_jobs(user_id, language, package_name);

-- SDK Download Statistics table
CREATE TABLE IF NOT EXISTS sdk_download_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES sdk_generation_jobs(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    CONSTRAINT fk_sdk_download_stats_job
        FOREIGN KEY (job_id) REFERENCES sdk_generation_jobs(id)
        ON DELETE CASCADE
);

-- Index for download statistics
CREATE INDEX IF NOT EXISTS idx_sdk_download_stats_job_id ON sdk_download_stats(job_id);
CREATE INDEX IF NOT EXISTS idx_sdk_download_stats_downloaded_at ON sdk_download_stats(downloaded_at DESC);

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

-- Index for usage metrics
CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_user_id ON sdk_generation_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_language ON sdk_generation_metrics(language);
CREATE INDEX IF NOT EXISTS idx_sdk_generation_metrics_last_generated ON sdk_generation_metrics(last_generated_at DESC);

-- Function to update generation metrics
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

-- Trigger to automatically update metrics when SDK generation completes
CREATE OR REPLACE TRIGGER sdk_generation_metrics_trigger
    AFTER UPDATE ON sdk_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_sdk_generation_metrics();

-- Function to update download statistics
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

-- Trigger to update download metrics
CREATE OR REPLACE TRIGGER sdk_download_metrics_trigger
    AFTER INSERT ON sdk_download_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_sdk_download_metrics();

-- Cleanup function for expired SDK files
CREATE OR REPLACE FUNCTION cleanup_expired_sdk_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired jobs and their associated files
    WITH deleted_jobs AS (
        DELETE FROM sdk_generation_jobs
        WHERE expires_at < CURRENT_TIMESTAMP OR status = 'expired'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_jobs;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE sdk_generation_jobs IS 'Tracks SDK generation requests and their status';
COMMENT ON TABLE sdk_download_stats IS 'Records SDK download events for analytics';
COMMENT ON TABLE sdk_generation_metrics IS 'Aggregated metrics for SDK generation by user and language';

COMMENT ON COLUMN sdk_generation_jobs.options IS 'JSON configuration for SDK generation (version, clientName, namespace, etc.)';
COMMENT ON COLUMN sdk_generation_jobs.file_path IS 'Path to the generated SDK ZIP file';
COMMENT ON COLUMN sdk_generation_jobs.expires_at IS 'When the SDK download link expires (typically 24 hours)';

-- Sample data for testing (optional - remove in production)
-- INSERT INTO sdk_generation_jobs (user_id, language, package_name, options, status, expires_at)
-- VALUES 
--     (gen_random_uuid(), 'javascript', 'my-qr-client', '{"version": "1.0.0", "clientName": "QRClient"}', 'completed', CURRENT_TIMESTAMP + INTERVAL '24 hours'),
--     (gen_random_uuid(), 'python', 'qr-saas-python-client', '{"version": "1.1.0", "clientName": "QRSaaSClient"}', 'pending', CURRENT_TIMESTAMP + INTERVAL '24 hours');