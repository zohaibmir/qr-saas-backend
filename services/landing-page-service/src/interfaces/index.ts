// Temporarily define types here until shared package is rebuilt
export interface LandingPage {
  id: string;
  userId: string;
  qrCodeId?: string;
  templateId?: string;
  slug: string;
  title: string;
  description?: string;
  content: any;
  styles: any;
  seoConfig: any;
  customDomain?: string;
  isPublished: boolean;
  isMobileOptimized: boolean;
  passwordProtected: boolean;
  viewCount: number;
  conversionCount: number;
  lastViewedAt?: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  templateType: string;
  layoutConfig: any;
  defaultStyles: any;
  componentConfig: any;
  isPremium: boolean;
  isActive: boolean;
  previewImageUrl?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageForm {
  id: string;
  landingPageId: string;
  formName: string;
  formType: string;
  fieldsConfig: any[];
  validationRules?: any;
  notificationSettings?: any;
  integrationConfig?: any;
  autoResponderConfig?: any;
  redirectAfterSubmit?: string;
  isActive: boolean;
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageFormSubmission {
  id: string;
  formId: string;
  landingPageId: string;
  visitorId?: string;
  submissionData: any;
  ipAddress?: string;
  userAgent?: string;
  referrerUrl?: string;
  deviceInfo?: any;
  geoLocation?: any;
  submissionSource?: string;
  isProcessed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

export interface LandingPageABTest {
  id: string;
  userId: string;
  testName: string;
  description?: string;
  variantAPageId: string;
  variantBPageId: string;
  trafficSplit: number;
  startDate: Date;
  endDate?: Date;
  status: string;
  winnerVariant?: string;
  confidenceLevel: number;
  statisticalSignificance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageAnalytics {
  id: string;
  landingPageId: string;
  abTestId?: string;
  variant?: string;
  eventType: string;
  eventData?: any;
  visitorId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
  referrerUrl?: string;
  pageUrl?: string;
  scrollDepth?: number;
  timeOnPage?: number;
  conversionValue?: number;
  timestamp: Date;
}

export interface SocialSharingConfig {
  id: string;
  landingPageId: string;
  platform: string;
  isEnabled: boolean;
  customMessage?: string;
  trackingParameters?: any;
  clickCount: number;
  conversionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomDomain {
  id: string;
  userId: string;
  domain: string;
  sslEnabled: boolean;
  sslCertificate?: string;
  dnsVerified: boolean;
  dnsVerificationToken?: string;
  status: string;
  errorMessage?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLandingPageRequest {
  templateId?: string;
  title: string;
  description?: string;
  qrCodeId?: string;
  content?: any;
  styles?: any;
  seoConfig?: any;
}

export interface UpdateLandingPageRequest {
  title?: string;
  description?: string;
  content?: any;
  styles?: any;
  seoConfig?: any;
  isPublished?: boolean;
  passwordProtected?: boolean;
  password?: string;
  expiresAt?: Date;
}

export interface CreateFormRequest {
  formName: string;
  formType: string;
  fieldsConfig: any[];
  notificationSettings?: any;
  integrationConfig?: any;
  autoResponderConfig?: any;
  redirectAfterSubmit?: string;
}

export interface CreateABTestRequest {
  testName: string;
  description?: string;
  variantBContent: any;
  variantBStyles?: any;
  trafficSplit?: number;
  startDate: Date;
  endDate?: Date;
}

export interface LandingPageAnalyticsResponse {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    totalConversions: number;
    conversionRate: number;
    avgTimeOnPage: number;
    bounceRate: number;
  };
  topReferrers: Array<{ referrer: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
  timeline: Array<{ date: string; views: number; conversions: number }>;
  abTestResults?: {
    variantA: { views: number; conversions: number; conversionRate: number };
    variantB: { views: number; conversions: number; conversionRate: number };
    winnerVariant?: string;
    confidenceLevel: number;
  };
}

// Core interfaces following clean architecture principles
export interface ILogger {
  info(message: string, metadata?: any): void;
  error(message: string, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  debug(message: string, metadata?: any): void;
}

// Landing Page Service Interfaces
export interface ILandingPageService {
  // Template Management
  getTemplates(): Promise<ServiceResponse<LandingPageTemplate[]>>;
  getTemplateById(templateId: string): Promise<ServiceResponse<LandingPageTemplate>>;
  
  // Landing Page Management
  createLandingPage(userId: string, pageData: CreateLandingPageRequest): Promise<ServiceResponse<LandingPage>>;
  getLandingPageById(pageId: string): Promise<ServiceResponse<LandingPage>>;
  getLandingPageBySlug(slug: string): Promise<ServiceResponse<LandingPage>>;
  getUserLandingPages(userId: string, pagination?: PaginationOptions): Promise<ServiceResponse<LandingPage[]>>;
  updateLandingPage(pageId: string, pageData: UpdateLandingPageRequest): Promise<ServiceResponse<LandingPage>>;
  deleteLandingPage(pageId: string): Promise<ServiceResponse<boolean>>;
  publishLandingPage(pageId: string): Promise<ServiceResponse<LandingPage>>;
  unpublishLandingPage(pageId: string): Promise<ServiceResponse<LandingPage>>;
  
  // Form Management
  createForm(landingPageId: string, formData: CreateFormRequest): Promise<ServiceResponse<LandingPageForm>>;
  getFormsByLandingPage(landingPageId: string): Promise<ServiceResponse<LandingPageForm[]>>;
  updateForm(formId: string, formData: Partial<CreateFormRequest>): Promise<ServiceResponse<LandingPageForm>>;
  deleteForm(formId: string): Promise<ServiceResponse<boolean>>;
  submitForm(formId: string, submissionData: any, visitorInfo?: any): Promise<ServiceResponse<LandingPageFormSubmission>>;
  getFormSubmissions(formId: string, pagination?: PaginationOptions): Promise<ServiceResponse<LandingPageFormSubmission[]>>;
  
  // A/B Testing
  createABTest(landingPageId: string, testData: CreateABTestRequest): Promise<ServiceResponse<LandingPageABTest>>;
  getABTests(landingPageId: string): Promise<ServiceResponse<LandingPageABTest[]>>;
  startABTest(testId: string): Promise<ServiceResponse<LandingPageABTest>>;
  stopABTest(testId: string, winnerVariant?: 'A' | 'B'): Promise<ServiceResponse<LandingPageABTest>>;
  
  // Analytics
  trackEvent(landingPageId: string, eventType: string, eventData?: any, visitorInfo?: any): Promise<ServiceResponse<LandingPageAnalytics>>;
  getAnalytics(landingPageId: string, dateRange?: DateRange): Promise<ServiceResponse<LandingPageAnalyticsResponse>>;
  
  // Social Sharing
  getSocialSharing(landingPageId: string): Promise<ServiceResponse<SocialSharingConfig[]>>;
  updateSocialSharing(landingPageId: string, platforms: Partial<SocialSharingConfig>[]): Promise<ServiceResponse<SocialSharingConfig[]>>;
  
  // Custom Domains
  addCustomDomain(userId: string, domain: string): Promise<ServiceResponse<CustomDomain>>;
  verifyCustomDomain(domainId: string): Promise<ServiceResponse<CustomDomain>>;
  getUserDomains(userId: string): Promise<ServiceResponse<CustomDomain[]>>;
}

// Repository Interfaces
export interface ILandingPageRepository {
  // Templates
  findAllTemplates(): Promise<LandingPageTemplate[]>;
  findTemplateById(templateId: string): Promise<LandingPageTemplate | null>;
  findTemplatesByType(templateType: string): Promise<LandingPageTemplate[]>;
  
  // Landing Pages
  create(pageData: any): Promise<LandingPage>;
  findById(pageId: string): Promise<LandingPage | null>;
  findBySlug(slug: string): Promise<LandingPage | null>;
  findByUserId(userId: string, options?: QueryOptions): Promise<LandingPage[]>;
  findByQRCodeId(qrCodeId: string): Promise<LandingPage[]>;
  update(pageId: string, pageData: any): Promise<LandingPage>;
  delete(pageId: string): Promise<boolean>;
  incrementViewCount(pageId: string): Promise<void>;
  incrementConversionCount(pageId: string): Promise<void>;
}

export interface ILandingPageFormRepository {
  create(formData: any): Promise<LandingPageForm>;
  findById(formId: string): Promise<LandingPageForm | null>;
  findByLandingPageId(landingPageId: string): Promise<LandingPageForm[]>;
  update(formId: string, formData: any): Promise<LandingPageForm>;
  delete(formId: string): Promise<boolean>;
  incrementSubmissionCount(formId: string): Promise<void>;
}

export interface ILandingPageFormSubmissionRepository {
  create(submissionData: any): Promise<LandingPageFormSubmission>;
  findById(submissionId: string): Promise<LandingPageFormSubmission | null>;
  findByFormId(formId: string, options?: QueryOptions): Promise<LandingPageFormSubmission[]>;
  findByLandingPageId(landingPageId: string, options?: QueryOptions): Promise<LandingPageFormSubmission[]>;
  update(submissionId: string, submissionData: any): Promise<LandingPageFormSubmission>;
  delete(submissionId: string): Promise<boolean>;
}

export interface ILandingPageABTestRepository {
  create(testData: any): Promise<LandingPageABTest>;
  findById(testId: string): Promise<LandingPageABTest | null>;
  findByLandingPageId(landingPageId: string): Promise<LandingPageABTest[]>;
  findByUserId(userId: string): Promise<LandingPageABTest[]>;
  update(testId: string, testData: any): Promise<LandingPageABTest>;
  delete(testId: string): Promise<boolean>;
}

export interface ILandingPageAnalyticsRepository {
  create(analyticsData: any): Promise<LandingPageAnalytics>;
  findByLandingPageId(landingPageId: string, options?: AnalyticsQueryOptions): Promise<LandingPageAnalytics[]>;
  findByABTestId(abTestId: string): Promise<LandingPageAnalytics[]>;
  getAnalyticsSummary(landingPageId: string, dateRange?: DateRange): Promise<any>;
  getTopReferrers(landingPageId: string, limit?: number): Promise<Array<{ referrer: string; count: number }>>;
  getDeviceBreakdown(landingPageId: string): Promise<Array<{ device: string; count: number; percentage: number }>>;
  getConversionFunnel(landingPageId: string): Promise<Array<{ step: string; count: number }>>;
}

export interface ISocialSharingRepository {
  findByLandingPageId(landingPageId: string): Promise<SocialSharingConfig[]>;
  upsert(sharingData: any): Promise<SocialSharingConfig>;
  incrementClickCount(landingPageId: string, platform: string): Promise<void>;
  incrementConversionCount(landingPageId: string, platform: string): Promise<void>;
}

export interface ICustomDomainRepository {
  create(domainData: any): Promise<CustomDomain>;
  findById(domainId: string): Promise<CustomDomain | null>;
  findByDomain(domain: string): Promise<CustomDomain | null>;
  findByUserId(userId: string): Promise<CustomDomain[]>;
  update(domainId: string, domainData: any): Promise<CustomDomain>;
  delete(domainId: string): Promise<boolean>;
}

// Utility Interfaces
export interface ISlugGenerator {
  generate(title: string, userId: string): Promise<string>;
  validate(slug: string): boolean;
  sanitize(title: string): string;
}

export interface IPageRenderer {
  renderHTML(landingPage: LandingPage): Promise<string>;
  renderPreview(landingPage: LandingPage): Promise<string>;
  generateCSS(styles: any): string;
  minifyHTML(html: string): string;
  inlineCSS(html: string, css: string): Promise<string>;
}

export interface IFormProcessor {
  validateSubmission(form: LandingPageForm, submissionData: any): ValidationResult;
  processSubmission(form: LandingPageForm, submission: LandingPageFormSubmission): Promise<void>;
  sendNotifications(form: LandingPageForm, submission: LandingPageFormSubmission): Promise<void>;
  processIntegrations(form: LandingPageForm, submission: LandingPageFormSubmission): Promise<void>;
  sendAutoResponder(form: LandingPageForm, submission: LandingPageFormSubmission): Promise<void>;
}

export interface IABTestManager {
  determineVariant(test: LandingPageABTest, visitorId: string): 'A' | 'B';
  calculateStatistics(test: LandingPageABTest): ABTestStatistics;
  determineWinner(test: LandingPageABTest): 'A' | 'B' | null;
  isStatisticallySignificant(test: LandingPageABTest): boolean;
}

export interface IAnalyticsTracker {
  trackPageView(landingPageId: string, visitorInfo: VisitorInfo): Promise<void>;
  trackFormSubmission(landingPageId: string, formId: string, visitorInfo: VisitorInfo): Promise<void>;
  trackConversion(landingPageId: string, conversionValue?: number, visitorInfo?: VisitorInfo): Promise<void>;
  trackSocialShare(landingPageId: string, platform: string, visitorInfo: VisitorInfo): Promise<void>;
  trackCustomEvent(landingPageId: string, eventType: string, eventData: any, visitorInfo: VisitorInfo): Promise<void>;
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
  checkDatabaseHealth(): Promise<boolean>;
  checkRenderingHealth(): Promise<boolean>;
}

// Supporting Types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface AnalyticsQueryOptions {
  dateRange?: DateRange;
  eventTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface VisitorInfo {
  visitorId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrerUrl?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ABTestStatistics {
  variantA: {
    views: number;
    conversions: number;
    conversionRate: number;
  };
  variantB: {
    views: number;
    conversions: number;
    conversionRate: number;
  };
  confidenceLevel: number;
  statisticalSignificance: number;
  winnerVariant?: 'A' | 'B';
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ServiceError;
  metadata?: {
    requestId?: string;
    timestamp?: string;
    total?: number;
    pagination?: {
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    };
  };
}

export interface ServiceError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  timestamp: string;
  dependencies?: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
}

// Error classes
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', details);
    this.name = 'BusinessLogicError';
  }
}