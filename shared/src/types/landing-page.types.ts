export interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  templateType: 'business' | 'personal' | 'event' | 'marketing' | 'ecommerce' | 'portfolio';
  layoutConfig: LandingPageLayout;
  defaultStyles: LandingPageStyles;
  componentConfig: LandingPageComponents;
  isPremium: boolean;
  isActive: boolean;
  previewImageUrl?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageLayout {
  layout: 'single_column' | 'multi_column' | 'full_width' | 'centered' | 'masonry' | 'product_layout';
  sections: string[];
  gridColumns?: number;
  spacing?: 'tight' | 'normal' | 'loose';
  maxWidth?: string;
}

export interface LandingPageStyles {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
  fontSize?: string;
  borderRadius?: string;
  shadows?: boolean;
  animations?: boolean;
  customCSS?: string;
}

export interface LandingPageComponents {
  header?: {
    logo?: boolean;
    navigation?: boolean;
    minimal?: boolean;
    fixed?: boolean;
  };
  hero?: {
    headline?: boolean;
    subheadline?: boolean;
    media?: boolean;
    video?: boolean;
    gallery?: boolean;
    countdown?: boolean;
  };
  content?: {
    description?: boolean;
    features?: boolean;
    benefits?: boolean;
    testimonials?: boolean;
  };
  form?: {
    enabled?: boolean;
    multiStep?: boolean;
    validation?: boolean;
    fields?: string[];
  };
  social?: {
    sharing?: boolean;
    links?: boolean;
    proof?: boolean;
  };
  footer?: {
    simple?: boolean;
    links?: boolean;
    contact?: boolean;
  };
}

export interface LandingPage {
  id: string;
  userId: string;
  qrCodeId?: string;
  templateId?: string;
  slug: string;
  title: string;
  description?: string;
  content: LandingPageContent;
  styles: LandingPageStyles;
  seoConfig: SEOConfig;
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

export interface LandingPageContent {
  sections: LandingPageSection[];
  globalSettings?: {
    favicon?: string;
    customScripts?: string[];
    analytics?: {
      googleAnalytics?: string;
      facebookPixel?: string;
      customTracking?: string;
    };
  };
}

export interface LandingPageSection {
  id: string;
  type: 'hero' | 'content' | 'form' | 'testimonials' | 'gallery' | 'pricing' | 'contact' | 'custom';
  title?: string;
  content?: any;
  styles?: Partial<LandingPageStyles>;
  visible: boolean;
  order: number;
}

export interface SEOConfig {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
}

export interface LandingPageForm {
  id: string;
  landingPageId: string;
  formName: string;
  formType: 'contact' | 'newsletter' | 'lead' | 'survey' | 'feedback' | 'custom';
  fieldsConfig: FormField[];
  validationRules?: Record<string, any>;
  notificationSettings?: NotificationSettings;
  integrationConfig?: IntegrationConfig;
  autoResponderConfig?: AutoResponderConfig;
  redirectAfterSubmit?: string;
  isActive: boolean;
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
  };
  options?: string[]; // For select, radio, checkbox
  order: number;
}

export interface NotificationSettings {
  email?: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    template?: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
  };
}

export interface IntegrationConfig {
  zapier?: {
    enabled: boolean;
    webhookUrl: string;
  };
  mailchimp?: {
    enabled: boolean;
    apiKey: string;
    listId: string;
  };
  hubspot?: {
    enabled: boolean;
    apiKey: string;
    formId: string;
  };
  custom?: {
    enabled: boolean;
    apiEndpoint: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    mapping?: Record<string, string>;
  };
}

export interface AutoResponderConfig {
  enabled: boolean;
  subject: string;
  message: string;
  fromName?: string;
  fromEmail?: string;
  delay?: number; // Minutes delay before sending
}

export interface LandingPageFormSubmission {
  id: string;
  formId: string;
  landingPageId: string;
  visitorId?: string;
  submissionData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  referrerUrl?: string;
  deviceInfo?: DeviceInfo;
  geoLocation?: GeoLocation;
  submissionSource?: string;
  isProcessed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screenResolution?: string;
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface LandingPageABTest {
  id: string;
  userId: string;
  testName: string;
  description?: string;
  variantAPageId: string;
  variantBPageId: string;
  trafficSplit: number; // 0-100 percentage for variant A
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'paused' | 'completed';
  winnerVariant?: 'A' | 'B';
  confidenceLevel: number;
  statisticalSignificance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageAnalytics {
  id: string;
  landingPageId: string;
  abTestId?: string;
  variant?: 'A' | 'B';
  eventType: 'view' | 'form_submission' | 'social_share' | 'conversion' | 'bounce' | 'scroll' | 'click';
  eventData?: Record<string, any>;
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
  platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'telegram' | 'email' | 'copy_link';
  isEnabled: boolean;
  customMessage?: string;
  trackingParameters?: Record<string, string>;
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
  status: 'pending' | 'active' | 'failed' | 'suspended';
  errorMessage?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response Types
export interface CreateLandingPageRequest {
  templateId?: string;
  title: string;
  description?: string;
  qrCodeId?: string;
  content?: Partial<LandingPageContent>;
  styles?: Partial<LandingPageStyles>;
  seoConfig?: Partial<SEOConfig>;
}

export interface UpdateLandingPageRequest {
  title?: string;
  description?: string;
  content?: Partial<LandingPageContent>;
  styles?: Partial<LandingPageStyles>;
  seoConfig?: Partial<SEOConfig>;
  isPublished?: boolean;
  passwordProtected?: boolean;
  password?: string;
  expiresAt?: Date;
}

export interface CreateFormRequest {
  formName: string;
  formType: 'contact' | 'newsletter' | 'lead' | 'survey' | 'feedback' | 'custom';
  fieldsConfig: Omit<FormField, 'id'>[];
  notificationSettings?: NotificationSettings;
  integrationConfig?: IntegrationConfig;
  autoResponderConfig?: AutoResponderConfig;
  redirectAfterSubmit?: string;
}

export interface CreateABTestRequest {
  testName: string;
  description?: string;
  variantBContent: LandingPageContent;
  variantBStyles?: Partial<LandingPageStyles>;
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
    winnerVariant?: 'A' | 'B';
    confidenceLevel: number;
  };
}