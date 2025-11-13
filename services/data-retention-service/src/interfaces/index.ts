import { Moment } from 'moment';
import { Request } from 'express';

// Extended Express Request interface with auth properties
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
  apiKey?: {
    id: string;
    service: string;
    permissions?: string[];
  };
  requestId: string;
  logger: {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  table_name: string;
  retention_period_days: number;
  date_column: string;
  conditions?: any; // JSON conditions for selective retention
  archive_before_delete: boolean;
  archive_location?: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_executed?: Date;
  next_execution?: Date;
  execution_cron?: string;
}

export interface RetentionExecution {
  id: string;
  policy_id: string;
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  records_processed: number;
  records_archived: number;
  records_deleted: number;
  error_message?: string;
  execution_metadata?: any;
}

export interface ArchivedData {
  id: string;
  policy_id: string;
  execution_id: string;
  table_name: string;
  archived_at: Date;
  archive_location: string;
  record_count: number;
  compression_type: string;
  file_size_bytes: number;
  checksum: string;
  metadata?: any;
}

export interface RetentionAuditLog {
  id: string;
  policy_id?: string;
  execution_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  metadata?: any;
}

export interface ComplianceReport {
  id: string;
  report_type: 'retention_summary' | 'gdpr_compliance' | 'data_inventory' | 'policy_audit';
  generated_at: Date;
  period_start: Date;
  period_end: Date;
  file_location: string;
  file_format: 'csv' | 'json' | 'pdf';
  record_count: number;
  metadata?: any;
}

export interface DataSubjectRequest {
  id: string;
  request_type: 'access' | 'portability' | 'erasure' | 'rectification';
  subject_identifier_type: 'email' | 'user_id' | 'phone' | 'other';
  subject_identifier: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'expired';
  requested_at: Date;
  completed_at?: Date;
  requester_email: string;
  description?: string;
  verification_token?: string;
  verified_at?: Date;
  response_location?: string;
  metadata?: any;
}

// Policy Engine Interfaces
export interface PolicyCondition {
  column: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'like' | 'not_like';
  value: any;
}

export interface PolicyRule {
  conditions: PolicyCondition[];
  logic: 'AND' | 'OR';
}

export interface ArchiveOptions {
  location: string;
  compression: 'gzip' | 'zip' | 'none';
  encryption?: boolean;
  partitionBy?: string;
}

// Service Interfaces
export interface RetentionPolicyService {
  createPolicy(policy: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy>;
  updatePolicy(id: string, updates: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy>;
  deletePolicy(id: string): Promise<void>;
  getPolicy(id: string): Promise<DataRetentionPolicy | null>;
  getAllPolicies(enabled?: boolean): Promise<DataRetentionPolicy[]>;
  executePolicy(policyId: string): Promise<RetentionExecution>;
  schedulePolicy(policyId: string, cronExpression: string): Promise<void>;
  unschedulePolicy(policyId: string): Promise<void>;
}

export interface ArchiveService {
  archiveData(
    tableName: string, 
    data: any[], 
    options: ArchiveOptions
  ): Promise<ArchivedData>;
  restoreData(archiveId: string): Promise<any[]>;
  verifyArchive(archiveId: string): Promise<boolean>;
  listArchives(tableName?: string): Promise<ArchivedData[]>;
  deleteArchive(archiveId: string): Promise<void>;
}

export interface ComplianceService {
  generateReport(
    type: ComplianceReport['report_type'],
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport>;
  processDataSubjectRequest(request: Partial<DataSubjectRequest>): Promise<DataSubjectRequest>;
  verifyDataSubjectRequest(token: string): Promise<DataSubjectRequest>;
  generateDataExport(subjectId: string, format: 'csv' | 'json'): Promise<string>;
  processDataErasure(subjectId: string): Promise<RetentionExecution>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: {
    database: 'healthy' | 'unhealthy';
    scheduler: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  metrics: {
    uptime: number;
    activeConnections: number;
    pendingJobs: number;
    lastExecution?: Date;
  };
}

// API Request/Response Types
export interface CreatePolicyRequest {
  name: string;
  description: string;
  table_name: string;
  retention_period_days: number;
  date_column: string;
  conditions?: PolicyRule;
  archive_before_delete: boolean;
  archive_location?: string;
  execution_cron?: string;
}

export interface ExecutePolicyRequest {
  dry_run?: boolean;
  force?: boolean;
}

export interface DataSubjectRequestRequest {
  request_type: DataSubjectRequest['request_type'];
  subject_identifier_type: DataSubjectRequest['subject_identifier_type'];
  subject_identifier: string;
  requester_email: string;
  description?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    records_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Export all types
export * from './index';