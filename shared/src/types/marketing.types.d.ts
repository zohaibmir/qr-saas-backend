export interface MarketingCampaign {
    id: string;
    userId: string;
    name: string;
    description?: string;
    campaignType: 'awareness' | 'acquisition' | 'conversion' | 'retention' | 'referral';
    status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
    targetAudience?: string;
    geographicTargets?: string[];
    deviceTargets?: string[];
    startDate?: Date;
    endDate?: Date;
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
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CampaignQRCode {
    id: string;
    campaignId: string;
    qrCodeId: string;
    addedAt: Date;
    scansCount: number;
    conversionsCount: number;
    lastScanAt?: Date;
    isActive: boolean;
}
export interface UTMTracking {
    id: string;
    qrCodeId: string;
    campaignId?: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmTerm?: string;
    utmContent?: string;
    originalUrl: string;
    utmUrl: string;
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
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    eventType: 'click' | 'view' | 'conversion' | 'bounce';
    referrerUrl?: string;
    landingPageUrl?: string;
    userAgent?: string;
    ipAddress?: string;
    attributionType: string;
    attributionValue?: number;
    country?: string;
    region?: string;
    city?: string;
    timestamp: Date;
}
export interface RetargetingPixel {
    id: string;
    userId: string;
    campaignId?: string;
    name: string;
    pixelType: 'facebook' | 'google' | 'linkedin' | 'twitter' | 'custom';
    pixelId: string;
    pixelCode: string;
    triggerEvents: string[];
    targetQrCodes?: string[];
    targetCampaigns?: string[];
    isTestMode: boolean;
    customParameters?: Record<string, any>;
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
    eventType: string;
    eventValue?: number;
    eventCurrency?: string;
    sessionId?: string;
    userFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
    referrerUrl?: string;
    pageUrl?: string;
    platformEventId?: string;
    platformResponse?: Record<string, any>;
    country?: string;
    region?: string;
    city?: string;
    firedAt: Date;
}
export interface CampaignAnalytics {
    id: string;
    campaignId: string;
    analyticsDate: Date;
    impressions: number;
    clicks: number;
    uniqueClicks: number;
    scans: number;
    uniqueScans: number;
    conversions: number;
    conversionValue: number;
    clickThroughRate: number;
    conversionRate: number;
    costPerClick: number;
    costPerConversion: number;
    returnOnAdSpend: number;
    topUtmSource?: string;
    topUtmMedium?: string;
    topUtmContent?: string;
    topCountry?: string;
    topRegion?: string;
    topDeviceType?: string;
    mobilePercentage: number;
    peakHour?: number;
    peakDayOfWeek?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CampaignConversionAttribution {
    id: string;
    campaignId: string;
    conversionEventId: string;
    qrCodeId: string;
    utmTrackingId?: string;
    attributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';
    attributionWeight: number;
    touchTimestamp: Date;
    conversionTimestamp: Date;
    timeToConversion?: string;
    attributedValue?: number;
    attributedCurrency?: string;
    touchPoint?: string;
    conversionPath?: string[];
    createdAt: Date;
}
export interface CreateCampaignRequest {
    name: string;
    description?: string;
    campaignType: MarketingCampaign['campaignType'];
    targetAudience?: string;
    geographicTargets?: string[];
    deviceTargets?: string[];
    startDate?: string;
    endDate?: string;
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
export interface GetCampaignAnalyticsRequest {
    campaignId: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    metrics?: string[];
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
export interface CampaignDashboardData {
    campaign: MarketingCampaign;
    analytics: CampaignAnalytics;
    performance: {
        totalScans: number;
        totalConversions: number;
        conversionRate: number;
        averageTimeToConversion: string;
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
//# sourceMappingURL=marketing.types.d.ts.map