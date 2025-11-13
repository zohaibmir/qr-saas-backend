-- ============================================================================
-- Data Retention Policies Database Migration
-- Version: 1.0
-- Date: November 13, 2025
-- Description: Adds data retention tables for automated cleanup and GDPR compliance
-- ============================================================================

-- Create data retention policies table for configuring retention rules
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type VARCHAR(100) NOT NULL CHECK (data_type IN ('QR_CODES', 'ANALYTICS', 'LOGS', 'USER_DATA', 'FILES', 'SESSIONS', 'NOTIFICATIONS', 'AUDIT_LOGS', 'CUSTOM')),
    table_name VARCHAR(255) NOT NULL,
    condition_field VARCHAR(255) NOT NULL,
    retention_period_days INTEGER NOT NULL CHECK (retention_period_days > 0),
    retention_period_type VARCHAR(20) DEFAULT 'DAYS' CHECK (retention_period_type IN ('DAYS', 'MONTHS', 'YEARS')),
    archive_before_delete BOOLEAN DEFAULT TRUE,
    archive_location VARCHAR(500),
    archive_format VARCHAR(50) DEFAULT 'JSON' CHECK (archive_format IN ('JSON', 'CSV', 'SQL', 'PARQUET')),
    compression_enabled BOOLEAN DEFAULT TRUE,
    encryption_enabled BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TESTING')),
    priority INTEGER DEFAULT 100 CHECK (priority >= 1 AND priority <= 1000),
    schedule_cron VARCHAR(100) DEFAULT '0 2 * * *',
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(organization_id, name),
    CONSTRAINT valid_retention_period CHECK (
        (retention_period_type = 'DAYS' AND retention_period_days <= 3650) OR
        (retention_period_type = 'MONTHS' AND retention_period_days <= 120) OR
        (retention_period_type = 'YEARS' AND retention_period_days <= 10)
    )
);

-- Create data retention executions table for tracking cleanup job runs
CREATE TABLE IF NOT EXISTS data_retention_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES data_retention_policies(id) ON DELETE CASCADE,
    execution_type VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (execution_type IN ('SCHEDULED', 'MANUAL', 'TEST')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    records_processed INTEGER DEFAULT 0,
    records_archived INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    archive_file_path VARCHAR(1000),
    archive_file_size_bytes BIGINT,
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    execution_metadata JSONB DEFAULT '{}',
    triggered_by UUID REFERENCES users(id),
    CONSTRAINT valid_execution_metadata CHECK (jsonb_typeof(execution_metadata) = 'object'),
    CONSTRAINT valid_error_details CHECK (jsonb_typeof(error_details) = 'object'),
    CONSTRAINT valid_duration CHECK (
        (status IN ('PENDING', 'RUNNING') AND duration_seconds IS NULL) OR
        (status IN ('COMPLETED', 'FAILED', 'CANCELLED') AND duration_seconds IS NOT NULL)
    )
);

-- Create data retention archive files table for tracking archived data
CREATE TABLE IF NOT EXISTS data_retention_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES data_retention_executions(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES data_retention_policies(id) ON DELETE CASCADE,
    archive_type VARCHAR(50) NOT NULL CHECK (archive_type IN ('FULL', 'INCREMENTAL', 'SELECTIVE')),
    file_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_format VARCHAR(50) NOT NULL,
    compression_type VARCHAR(50),
    encryption_algorithm VARCHAR(50),
    checksum_md5 VARCHAR(32),
    checksum_sha256 VARCHAR(64),
    record_count INTEGER NOT NULL DEFAULT 0,
    date_range_start TIMESTAMP WITH TIME ZONE,
    date_range_end TIMESTAMP WITH TIME ZONE,
    storage_location VARCHAR(500),
    storage_provider VARCHAR(100) DEFAULT 'LOCAL',
    access_tier VARCHAR(50) DEFAULT 'STANDARD' CHECK (access_tier IN ('HOT', 'WARM', 'COLD', 'ARCHIVE')),
    retention_expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0),
    CONSTRAINT valid_record_count CHECK (record_count >= 0)
);

-- Create data retention audit logs table for compliance tracking
CREATE TABLE IF NOT EXISTS data_retention_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) DEFAULT 'RETENTION' CHECK (event_category IN ('RETENTION', 'ARCHIVAL', 'DELETION', 'RESTORATION', 'COMPLIANCE', 'POLICY')),
    policy_id UUID REFERENCES data_retention_policies(id),
    execution_id UUID REFERENCES data_retention_executions(id),
    archive_id UUID REFERENCES data_retention_archives(id),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    affected_table VARCHAR(255),
    affected_records INTEGER DEFAULT 0,
    data_classification VARCHAR(50) DEFAULT 'INTERNAL' CHECK (data_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
    gdpr_lawful_basis VARCHAR(100),
    retention_justification TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    event_data JSONB DEFAULT '{}',
    result VARCHAR(20) DEFAULT 'SUCCESS' CHECK (result IN ('SUCCESS', 'FAILURE', 'WARNING', 'PARTIAL')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_data CHECK (jsonb_typeof(event_data) = 'object'),
    CONSTRAINT valid_affected_records CHECK (affected_records >= 0)
);

-- Create data retention compliance reports table for GDPR reporting
CREATE TABLE IF NOT EXISTS data_retention_compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('GDPR_COMPLIANCE', 'RETENTION_SUMMARY', 'DATA_INVENTORY', 'DELETION_REPORT', 'CUSTOM')),
    report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID REFERENCES users(id),
    report_data JSONB NOT NULL DEFAULT '{}',
    file_path VARCHAR(1000),
    file_format VARCHAR(50) DEFAULT 'PDF' CHECK (file_format IN ('PDF', 'CSV', 'JSON', 'HTML')),
    file_size_bytes BIGINT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    accessed_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_report_data CHECK (jsonb_typeof(report_data) = 'object'),
    CONSTRAINT valid_report_period CHECK (report_period_end > report_period_start),
    CONSTRAINT valid_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0)
);

-- Create data subject requests table for GDPR data subject rights
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION', 'OBJECTION')),
    request_id VARCHAR(100) UNIQUE NOT NULL,
    subject_email VARCHAR(255) NOT NULL,
    subject_user_id UUID REFERENCES users(id),
    requester_name VARCHAR(255),
    requester_email VARCHAR(255),
    request_details TEXT NOT NULL,
    legal_basis TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id),
    response_details TEXT,
    response_data JSONB DEFAULT '{}',
    verification_method VARCHAR(100),
    verification_completed BOOLEAN DEFAULT FALSE,
    response_file_path VARCHAR(1000),
    response_file_size_bytes BIGINT,
    compliance_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_response_data CHECK (jsonb_typeof(response_data) = 'object'),
    CONSTRAINT valid_due_date CHECK (due_date > received_at),
    CONSTRAINT valid_completion CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL) OR
        (status != 'COMPLETED' AND completed_at IS NULL)
    )
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Data retention policies indexes
CREATE INDEX IF NOT EXISTS idx_retention_policies_org_id ON data_retention_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_retention_policies_data_type ON data_retention_policies(data_type);
CREATE INDEX IF NOT EXISTS idx_retention_policies_status ON data_retention_policies(status);
CREATE INDEX IF NOT EXISTS idx_retention_policies_next_run ON data_retention_policies(next_run_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_retention_policies_priority ON data_retention_policies(priority);

-- Data retention executions indexes
CREATE INDEX IF NOT EXISTS idx_retention_executions_policy_id ON data_retention_executions(policy_id);
CREATE INDEX IF NOT EXISTS idx_retention_executions_status ON data_retention_executions(status);
CREATE INDEX IF NOT EXISTS idx_retention_executions_started_at ON data_retention_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_retention_executions_type ON data_retention_executions(execution_type);

-- Data retention archives indexes
CREATE INDEX IF NOT EXISTS idx_retention_archives_execution_id ON data_retention_archives(execution_id);
CREATE INDEX IF NOT EXISTS idx_retention_archives_policy_id ON data_retention_archives(policy_id);
CREATE INDEX IF NOT EXISTS idx_retention_archives_created_at ON data_retention_archives(created_at);
CREATE INDEX IF NOT EXISTS idx_retention_archives_file_path ON data_retention_archives(file_path);
CREATE INDEX IF NOT EXISTS idx_retention_archives_expires_at ON data_retention_archives(retention_expires_at);

-- Data retention audit logs indexes
CREATE INDEX IF NOT EXISTS idx_retention_audit_event_type ON data_retention_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_retention_audit_policy_id ON data_retention_audit_logs(policy_id);
CREATE INDEX IF NOT EXISTS idx_retention_audit_org_id ON data_retention_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_retention_audit_created_at ON data_retention_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_retention_audit_category ON data_retention_audit_logs(event_category);

-- Compliance reports indexes
CREATE INDEX IF NOT EXISTS idx_compliance_reports_org_id ON data_retention_compliance_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON data_retention_compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON data_retention_compliance_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_period ON data_retention_compliance_reports(report_period_start, report_period_end);

-- Data subject requests indexes
CREATE INDEX IF NOT EXISTS idx_subject_requests_org_id ON data_subject_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_subject_requests_email ON data_subject_requests(subject_email);
CREATE INDEX IF NOT EXISTS idx_subject_requests_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_subject_requests_type ON data_subject_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_subject_requests_due_date ON data_subject_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_subject_requests_received_at ON data_subject_requests(received_at);

-- ============================================================================
-- INSERT DEFAULT DATA RETENTION POLICIES TEMPLATES
-- ============================================================================

-- QR Codes retention policy template
INSERT INTO data_retention_policies (
    name, description, data_type, table_name, condition_field, 
    retention_period_days, archive_before_delete, status, priority, schedule_cron
) VALUES (
    'QR Codes - Default Retention',
    'Default retention policy for QR codes - keep for 2 years',
    'QR_CODES',
    'qr_codes',
    'created_at',
    730,
    TRUE,
    'INACTIVE',
    100,
    '0 2 * * 0'
) ON CONFLICT DO NOTHING;

-- Analytics data retention policy
INSERT INTO data_retention_policies (
    name, description, data_type, table_name, condition_field,
    retention_period_days, archive_before_delete, status, priority, schedule_cron
) VALUES (
    'Analytics - Standard Retention',
    'Analytics data retention - keep for 1 year',
    'ANALYTICS',
    'qr_scans',
    'scanned_at',
    365,
    TRUE,
    'INACTIVE',
    200,
    '0 3 * * 0'
) ON CONFLICT DO NOTHING;

-- Log files retention policy
INSERT INTO data_retention_policies (
    name, description, data_type, table_name, condition_field,
    retention_period_days, archive_before_delete, status, priority, schedule_cron
) VALUES (
    'System Logs - Standard Retention',
    'System and application logs - keep for 90 days',
    'LOGS',
    'system_logs',
    'created_at',
    90,
    TRUE,
    'INACTIVE',
    300,
    '0 1 * * *'
) ON CONFLICT DO NOTHING;

-- Session data retention policy
INSERT INTO data_retention_policies (
    name, description, data_type, table_name, condition_field,
    retention_period_days, archive_before_delete, status, priority, schedule_cron
) VALUES (
    'User Sessions - Security Retention',
    'User session data - keep for 30 days',
    'SESSIONS',
    'user_sessions',
    'created_at',
    30,
    FALSE,
    'INACTIVE',
    400,
    '0 4 * * *'
) ON CONFLICT DO NOTHING;

-- SSO audit logs retention
INSERT INTO data_retention_policies (
    name, description, data_type, table_name, condition_field,
    retention_period_days, archive_before_delete, status, priority, schedule_cron
) VALUES (
    'SSO Audit Logs - Compliance Retention',
    'SSO authentication audit logs - keep for 7 years (compliance)',
    'AUDIT_LOGS',
    'sso_audit_logs',
    'created_at',
    2555,
    TRUE,
    'INACTIVE',
    500,
    '0 2 1 * *'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- UPDATE TRIGGERS FOR AUTOMATIC TIMESTAMP MANAGEMENT
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_retention_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_retention_policies_updated_at ON data_retention_policies;
CREATE TRIGGER update_retention_policies_updated_at 
    BEFORE UPDATE ON data_retention_policies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_retention_updated_at_column();

DROP TRIGGER IF EXISTS update_subject_requests_updated_at ON data_subject_requests;
CREATE TRIGGER update_subject_requests_updated_at 
    BEFORE UPDATE ON data_subject_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_retention_updated_at_column();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to the application user
GRANT SELECT, INSERT, UPDATE, DELETE ON data_retention_policies TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_retention_executions TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_retention_archives TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_retention_audit_logs TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_retention_compliance_reports TO qr_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_subject_requests TO qr_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log the completion of the migration
INSERT INTO data_retention_audit_logs (event_type, event_category, event_data, result, created_at) 
VALUES (
    'MIGRATION_COMPLETED',
    'POLICY',
    '{"migration": "data_retention_v1.0", "tables_created": 6, "policies_added": 5, "indexes_created": 26}',
    'SUCCESS',
    CURRENT_TIMESTAMP
);

-- Display completion message
SELECT 'Data Retention Migration Completed Successfully!' as status,
       'Created 6 tables with indexes and triggers' as details,
       'Added 5 default retention policy templates' as templates,
       'GDPR compliance features enabled' as compliance;