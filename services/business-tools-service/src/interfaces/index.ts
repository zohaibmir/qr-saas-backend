/**
 * Business Tools Service Interfaces
 * 
 * TypeScript interfaces for custom domains, white labeling, 
 * and GDPR compliance features following clean architecture principles.
 * 
 * @author AI Agent
 * @date 2024
 */

// ===============================================
// Base Interfaces
// ===============================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  meta?: {
    total?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

// ===============================================
// Custom Domains Interfaces
// ===============================================

export interface CustomDomain {
  id: string;
  userId: string;
  organizationId?: string;
  domain: string;
  subdomain?: string;
  fullDomain: string;
  status: DomainStatus;
  verificationMethod: VerificationMethod;
  verificationToken: string;
  verificationValue?: string;
  verifiedAt?: Date;
  sslStatus: SSLStatus;
  sslCertificateId?: string;
  sslIssuedAt?: Date;
  sslExpiresAt?: Date;
  autoRenewSsl: boolean;
  redirectSettings: Record<string, any>;
  customHeaders: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DomainStatus = 'pending' | 'verifying' | 'active' | 'failed' | 'suspended';
export type VerificationMethod = 'dns' | 'http' | 'email';
export type SSLStatus = 'pending' | 'issued' | 'active' | 'failed' | 'expired';

export interface DomainVerification {
  id: string;
  domainId: string;
  verificationType: 'dns_txt' | 'dns_cname' | 'http_file' | 'email_click';
  recordName?: string;
  recordValue?: string;
  expectedValue?: string;
  actualValue?: string;
  verificationStatus: 'pending' | 'success' | 'failed';
  lastCheckedAt?: Date;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

export interface SSLCertificate {
  id: string;
  domainId: string;
  provider: 'letsencrypt' | 'custom' | 'cloudflare';
  certificateData?: string;
  privateKeyData?: string;
  certificateChain?: string;
  serialNumber?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  autoRenew: boolean;
  renewalAttempts: number;
  lastRenewalAttempt?: Date;
  status: SSLStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainRequest {
  domain: string;
  subdomain?: string;
  verificationMethod?: VerificationMethod;
  sslEnabled?: boolean;
  redirectSettings?: Record<string, any>;
  customHeaders?: Record<string, any>;
}

export interface UpdateDomainRequest {
  redirectSettings?: Record<string, any>;
  customHeaders?: Record<string, any>;
  autoRenewSsl?: boolean;
  isActive?: boolean;
}

// ===============================================
// White Labeling Interfaces
// ===============================================

export interface WhiteLabelConfig {
  id: string;
  userId: string;
  organizationId?: string;
  configName: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
  customCss?: string;
  customJs?: string;
  brandingSettings: Record<string, any>;
  emailSettings: Record<string, any>;
  domainSettings: Record<string, any>;
  featureFlags: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandAsset {
  id: string;
  whiteLabelConfigId: string;
  assetType: 'logo' | 'favicon' | 'background' | 'email_header' | 'custom';
  assetName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  altText?: string;
  usageContext: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateWhiteLabelRequest {
  configName: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
  brandingSettings?: Record<string, any>;
  emailSettings?: Record<string, any>;
  domainSettings?: Record<string, any>;
  featureFlags?: Record<string, any>;
}

export interface UpdateWhiteLabelRequest extends Partial<CreateWhiteLabelRequest> {
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  customCss?: string;
  customJs?: string;
  isActive?: boolean;
}

export interface UploadAssetRequest {
  assetType: BrandAsset['assetType'];
  assetName: string;
  altText?: string;
  usageContext?: Record<string, any>;
}

// ===============================================
// GDPR Compliance Interfaces
// ===============================================

export interface GDPRRequest {
  id: string;
  userId?: string;
  requestType: GDPRRequestType;
  status: GDPRRequestStatus;
  requestDetails: Record<string, any>;
  requestedData: Record<string, any>;
  processedData: Record<string, any>;
  requesterEmail: string;
  requesterIpAddress?: string;
  verificationToken?: string;
  verifiedAt?: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  expiryDate?: Date;
  adminNotes?: string;
  rejectionReason?: string;
  fileExports: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type GDPRRequestType = 'export' | 'delete' | 'rectify' | 'restrict' | 'object' | 'portability';
export type GDPRRequestStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'expired';

export interface UserConsent {
  id: string;
  userId: string;
  consentType: string;
  consentVersion: string;
  consentGiven: boolean;
  consentText?: string;
  legalBasis?: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  consentDate: Date;
  withdrawalDate?: Date;
  isActive: boolean;
}

export interface UserPrivacySettings {
  id: string;
  userId: string;
  analyticsTracking: boolean;
  marketingEmails: boolean;
  thirdPartySharing: boolean;
  dataRetentionDays?: number;
  cookiePreferences: Record<string, any>;
  notificationPreferences: Record<string, any>;
  exportFormat: 'json' | 'csv' | 'pdf';
  lastUpdatedAt: Date;
  updatedBy: 'user' | 'admin' | 'system';
}

export interface DataProcessingLog {
  id: string;
  userId?: string;
  activityType: string;
  dataCategories: string[];
  purpose: string;
  legalBasis: string;
  processor: string;
  processingDetails: Record<string, any>;
  retentionPeriod?: number;
  automatedDecision: boolean;
  thirdPartyTransfers: string[];
  adminUserId?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface CreateGDPRRequest {
  requestType: GDPRRequestType;
  requesterEmail: string;
  requestDetails?: Record<string, any>;
  requestedData?: Record<string, any>;
}

export interface UpdateGDPRRequest {
  status?: GDPRRequestStatus;
  adminNotes?: string;
  rejectionReason?: string;
  processedData?: Record<string, any>;
}

export interface UpdateConsentRequest {
  consentType: string;
  consentGiven: boolean;
  consentVersion?: string;
  legalBasis?: string;
  source?: string;
}

export interface UpdatePrivacySettingsRequest extends Partial<Omit<UserPrivacySettings, 'id' | 'userId' | 'lastUpdatedAt' | 'updatedBy'>> {}

// ===============================================
// Repository Interfaces
// ===============================================

export interface ICustomDomainsRepository {
  create(domain: CustomDomain): Promise<CustomDomain>;
  findById(id: string): Promise<CustomDomain | null>;
  findByFullDomain(fullDomain: string): Promise<CustomDomain | null>;
  findByUserId(userId: string, pagination?: PaginationOptions): Promise<{ domains: CustomDomain[]; total: number }>;
  update(id: string, updates: Partial<CustomDomain>): Promise<CustomDomain | null>;
  delete(id: string): Promise<boolean>;
  findExpiringSslCertificates(daysUntilExpiry: number): Promise<CustomDomain[]>;
}

export interface IDomainVerificationRepository {
  create(verification: DomainVerification): Promise<DomainVerification>;
  findByDomainId(domainId: string): Promise<DomainVerification[]>;
  update(id: string, updates: Partial<DomainVerification>): Promise<DomainVerification | null>;
  delete(id: string): Promise<boolean>;
  findPendingVerifications(): Promise<DomainVerification[]>;
}

export interface ISSLCertificateRepository {
  create(certificate: SSLCertificate): Promise<SSLCertificate>;
  findById(id: string): Promise<SSLCertificate | null>;
  findByDomainId(domainId: string): Promise<SSLCertificate | null>;
  update(id: string, updates: Partial<SSLCertificate>): Promise<SSLCertificate | null>;
  delete(id: string): Promise<boolean>;
  findExpiringCertificates(daysUntilExpiry: number): Promise<SSLCertificate[]>;
}

export interface IWhiteLabelRepository {
  create(config: WhiteLabelConfig): Promise<WhiteLabelConfig>;
  findById(id: string): Promise<WhiteLabelConfig | null>;
  findByUserId(userId: string): Promise<WhiteLabelConfig[]>;
  update(id: string, updates: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig | null>;
  delete(id: string): Promise<boolean>;
  createAsset(asset: BrandAsset): Promise<BrandAsset>;
  findAssetsByConfigId(configId: string): Promise<BrandAsset[]>;
  updateAsset(id: string, updates: Partial<BrandAsset>): Promise<BrandAsset | null>;
  deleteAsset(id: string): Promise<boolean>;
}

export interface IGDPRRepository {
  createRequest(request: GDPRRequest): Promise<GDPRRequest>;
  findRequestById(id: string): Promise<GDPRRequest | null>;
  findRequestsByEmail(email: string): Promise<GDPRRequest[]>;
  updateRequest(id: string, updates: Partial<GDPRRequest>): Promise<GDPRRequest | null>;
  createConsent(consent: UserConsent): Promise<UserConsent>;
  findConsentsByUserId(userId: string): Promise<UserConsent[]>;
  updateConsent(userId: string, consentType: string, updates: Partial<UserConsent>): Promise<UserConsent | null>;
  getPrivacySettings(userId: string): Promise<UserPrivacySettings | null>;
  updatePrivacySettings(userId: string, settings: Partial<UserPrivacySettings>): Promise<UserPrivacySettings>;
  createDataProcessingLog(log: DataProcessingLog): Promise<DataProcessingLog>;
  findDataProcessingLogs(userId: string, pagination?: PaginationOptions): Promise<{ logs: DataProcessingLog[]; total: number }>;
}

// ===============================================
// Service Interfaces
// ===============================================

export interface ICustomDomainsService {
  createDomain(userId: string, request: CreateDomainRequest): Promise<ServiceResponse<CustomDomain>>;
  getDomain(domainId: string, userId: string): Promise<ServiceResponse<CustomDomain>>;
  getUserDomains(userId: string, pagination?: PaginationOptions): Promise<ServiceResponse<CustomDomain[]>>;
  updateDomain(domainId: string, userId: string, updates: UpdateDomainRequest): Promise<ServiceResponse<CustomDomain>>;
  deleteDomain(domainId: string, userId: string): Promise<ServiceResponse<void>>;
  verifyDomain(domainId: string): Promise<ServiceResponse<void>>;
  checkDomainVerification(domainId: string): Promise<ServiceResponse<DomainVerification[]>>;
  provisionSSL(domainId: string): Promise<ServiceResponse<SSLCertificate>>;
  renewSSLCertificate(domainId: string): Promise<ServiceResponse<SSLCertificate>>;
}

export interface IWhiteLabelService {
  createConfig(userId: string, request: CreateWhiteLabelRequest): Promise<ServiceResponse<WhiteLabelConfig>>;
  getConfig(configId: string, userId: string): Promise<ServiceResponse<WhiteLabelConfig>>;
  getUserConfigs(userId: string): Promise<ServiceResponse<WhiteLabelConfig[]>>;
  updateConfig(configId: string, userId: string, updates: UpdateWhiteLabelRequest): Promise<ServiceResponse<WhiteLabelConfig>>;
  deleteConfig(configId: string, userId: string): Promise<ServiceResponse<void>>;
  uploadAsset(configId: string, userId: string, file: Express.Multer.File, request: UploadAssetRequest): Promise<ServiceResponse<BrandAsset>>;
  getAssets(configId: string, userId: string): Promise<ServiceResponse<BrandAsset[]>>;
  deleteAsset(assetId: string, userId: string): Promise<ServiceResponse<void>>;
  previewConfig(configId: string): Promise<ServiceResponse<{ previewHtml: string }>>;
}

export interface IGDPRService {
  createDataRequest(request: CreateGDPRRequest): Promise<ServiceResponse<GDPRRequest>>;
  getDataRequest(requestId: string): Promise<ServiceResponse<GDPRRequest>>;
  processDataRequest(requestId: string, updates: UpdateGDPRRequest): Promise<ServiceResponse<GDPRRequest>>;
  exportUserData(userId: string, format: 'json' | 'csv' | 'pdf'): Promise<ServiceResponse<{ fileUrl: string }>>;
  deleteUserData(userId: string, verificationToken: string): Promise<ServiceResponse<void>>;
  updateConsent(userId: string, request: UpdateConsentRequest): Promise<ServiceResponse<UserConsent>>;
  getUserConsents(userId: string): Promise<ServiceResponse<UserConsent[]>>;
  getPrivacySettings(userId: string): Promise<ServiceResponse<UserPrivacySettings>>;
  updatePrivacySettings(userId: string, settings: UpdatePrivacySettingsRequest): Promise<ServiceResponse<UserPrivacySettings>>;
  logDataProcessing(log: Omit<DataProcessingLog, 'id' | 'createdAt'>): Promise<ServiceResponse<void>>;
  getDataProcessingHistory(userId: string, pagination?: PaginationOptions): Promise<ServiceResponse<DataProcessingLog[]>>;
}

// ===============================================
// Error Classes
// ===============================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}