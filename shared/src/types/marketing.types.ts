// Marketing Campaign Types
export interface MarketingCampaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  campaignType: 'awareness' | 'acquisition' | 'conversion' | 'retention' | 'referral';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  
  // Campaign targeting
  targetAudience?: string;
  geographicTargets?: string[];
  deviceTargets?: string[];
  
  // Campaign dates
  startDate?: Date;
  endDate?: Date;
  
  // Budget and goals
  budgetAmount?: number;
  budgetCurrency?: string;
  targetConversions?: number;
  targetCpa?: number; // Cost per acquisition
  
  // UTM parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, any>;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignQRCode {
  id: string;
  campaignId: string;
  qrCodeId: string;
  addedAt: Date;
  
  // Performance tracking
  scansCount: number;
  conversionsCount: number;
  lastScanAt?: Date;
  
  isActive: boolean;
}

// UTM Tracking Types
export interface UTMTracking {
  id: string;
  qrCodeId: string;
  campaignId?: string;
  
  // UTM Parameters
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Generated URLs
  originalUrl: string;
  utmUrl: string;
  
  // Tracking data
  clicksCount: number;
  uniqueClicksCount: number;
  conversionsCount: number;
  firstClickAt?: Date;
  lastClickAt?: Date;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UTMEvent {
  id: string;
  utmTrackingId: string;
  qrCodeId: string;
  sessionId?: string;
  
  // UTM parameters at time of click
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Event details
  eventType: 'click' | 'view' | 'conversion' | 'bounce';
  referrerUrl?: string;
  landingPageUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  
  // Attribution
  attributionType: string;
  attributionValue?: number;
  
  // Geolocation
  country?: string;
  region?: string;
  city?: string;
  
  timestamp: Date;
}

// Retargeting Pixel Types
export interface RetargetingPixel {
  id: string;
  userId: string;
  campaignId?: string;
  
  name: string;
  pixelType: 'facebook' | 'google' | 'linkedin' | 'twitter' | 'custom';
  pixelId: string; // Platform-specific pixel ID
  
  // Pixel configuration
  pixelCode: string; // HTML/JavaScript pixel code
  triggerEvents: string[]; // Array of events that trigger pixel
  
  // Targeting settings
  targetQrCodes?: string[]; // Array of QR code IDs to track
  targetCampaigns?: string[]; // Array of campaign IDs to track
  
  // Pixel settings
  isTestMode: boolean;
  customParameters?: Record<string, any>;
  
  // Activity tracking
  firesCount: number;
  lastFiredAt?: Date;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetargetingPixelEvent {
  id: string;
  pixelId: string;
  qrCodeId?: string;
  campaignId?: string;
  
  // Event details
  eventType: string;
  eventValue?: number;
  eventCurrency?: string;
  
  // User context
  sessionId?: string;
  userFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  referrerUrl?: string;
  pageUrl?: string;
  
  // Platform data
  platformEventId?: string; // Event ID from platform (Facebook, Google, etc.)
  platformResponse?: Record<string, any>; // Response from platform API
  
  // Geolocation
  country?: string;
  region?: string;
  city?: string;
  
  firedAt: Date;
}

// Campaign Analytics Types
export interface CampaignAnalytics {
  id: string;
  campaignId: string;
  analyticsDate: Date;
  
  // Basic metrics
  impressions: number;
  clicks: number;
  uniqueClicks: number;
  scans: number;
  uniqueScans: number;
  
  // Conversion metrics
  conversions: number;
  conversionValue: number;
  
  // Campaign performance
  clickThroughRate: number; // CTR
  conversionRate: number; // CVR
  costPerClick: number; // CPC
  costPerConversion: number; // CPA
  returnOnAdSpend: number; // ROAS
  
  // UTM performance
  topUtmSource?: string;
  topUtmMedium?: string;
  topUtmContent?: string;
  
  // Geographic performance
  topCountry?: string;
  topRegion?: string;
  
  // Device performance
  topDeviceType?: string;
  mobilePercentage: number;
  
  // Temporal patterns
  peakHour?: number; // Hour with most activity
  peakDayOfWeek?: number; // Day with most activity
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignConversionAttribution {
  id: string;
  campaignId: string;
  conversionEventId: string;
  qrCodeId: string;
  utmTrackingId?: string;
  
  // Attribution model
  attributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';
  attributionWeight: number; // Weight for multi-touch attribution
  
  // Attribution timing
  touchTimestamp: Date;
  conversionTimestamp: Date;
  timeToConversion?: string; // Interval as string
  
  // Attribution value
  attributedValue?: number;
  attributedCurrency?: string;
  
  // Context
  touchPoint?: string; // Source of the touch (UTM source, QR code, etc.)
  conversionPath?: string[]; // Array of touch points leading to conversion
  
  createdAt: Date;
}

// Request/Response Types for API
export interface CreateCampaignRequest {
  name: string;
  description?: string;
  campaignType: MarketingCampaign['campaignType'];
  targetAudience?: string;
  geographicTargets?: string[];
  deviceTargets?: string[];
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  budgetAmount?: number;
  budgetCurrency?: string;
  targetConversions?: number;
  targetCpa?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  status?: MarketingCampaign['status'];
}

export interface CreateUTMTrackingRequest {
  qrCodeId: string;
  campaignId?: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
  originalUrl: string;
}

export interface CreateRetargetingPixelRequest {
  campaignId?: string;
  name: string;
  pixelType: RetargetingPixel['pixelType'];
  pixelId: string;
  pixelCode: string;
  triggerEvents?: string[];
  targetQrCodes?: string[];
  targetCampaigns?: string[];
  isTestMode?: boolean;
  customParameters?: Record<string, any>;
}

export interface TrackUTMEventRequest {
  utmTrackingId: string;
  qrCodeId: string;
  sessionId?: string;
  
  // UTM parameters at time of click (for tracking changes)
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  eventType: UTMEvent['eventType'];
  referrerUrl?: string;
  landingPageUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  attributionType?: string;
  attributionValue?: number;
  country?: string;
  region?: string;
  city?: string;
}

export interface FireRetargetingPixelRequest {
  pixelId: string;
  qrCodeId?: string;
  campaignId?: string;
  eventType: string;
  eventValue?: number;
  eventCurrency?: string;
  sessionId?: string;
  userFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  referrerUrl?: string;
  pageUrl?: string;
  country?: string;
  region?: string;
  city?: string;
}

// Analytics Request Types
export interface GetCampaignAnalyticsRequest {
  campaignId: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  groupBy?: 'day' | 'week' | 'month';
  metrics?: string[]; // Array of metric names to include
}

export interface GetCampaignPerformanceRequest {
  campaignIds?: string[];
  startDate?: string;
  endDate?: string;
  compareWith?: 'previous_period' | 'previous_year';
  includeConversions?: boolean;
  includeUTM?: boolean;
  includeRetargeting?: boolean;
}

// Marketing Dashboard Types
export interface CampaignDashboardData {
  campaign: MarketingCampaign;
  analytics: CampaignAnalytics;
  performance: {
    totalScans: number;
    totalConversions: number;
    conversionRate: number;
    averageTimeToConversion: string; // Formatted interval
    topPerformingQrCodes: Array<{
      qrCodeId: string;
      qrCodeName: string;
      scans: number;
      conversions: number;
    }>;
    utmPerformance: {
      bestSource: string;
      bestMedium: string;
      bestContent: string;
    };
    geographicPerformance: Array<{
      country: string;
      scans: number;
      conversions: number;
    }>;
    temporalPerformance: Array<{
      hour: number;
      scans: number;
      conversions: number;
    }>;
  };
  retargetingPixels: RetargetingPixel[];
  recentActivity: Array<{
    timestamp: Date;
    type: 'scan' | 'conversion' | 'utm_click' | 'pixel_fire';
    data: Record<string, any>;
  }>;
}

export interface MarketingOverviewData {
  totalCampaigns: number;
  activeCampaigns: number;
  totalScans: number;
  totalConversions: number;
  averageConversionRate: number;
  topPerformingCampaign: MarketingCampaign;
  recentCampaigns: MarketingCampaign[];
  campaignsByType: Array<{
    type: MarketingCampaign['campaignType'];
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    campaigns: number;
    scans: number;
    conversions: number;
  }>;
}