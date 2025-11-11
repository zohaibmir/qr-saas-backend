interface ScanEvent {
    qrCodeId: string;
    ipAddress?: string;
    userAgent?: string;
    location?: {
        country?: string;
        region?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
    };
    platform?: string;
    device?: string;
    referrer?: string;
}
interface QRGenerationEvent {
    qrCodeId: string;
    userId: string;
    createdAt: Date;
    title: string;
    url: string;
    subscriptionTier: string;
}
/**
 * Service to handle integration between QR generation and analytics tracking
 */
export declare class QRAnalyticsIntegrationService {
    private analyticsServiceUrl;
    private userServiceUrl;
    constructor();
    /**
     * Track a QR code scan event
     */
    trackScanEvent(scanData: ScanEvent): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Initialize analytics for a new QR code
     */
    initializeQRCodeAnalytics(qrData: QRGenerationEvent): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get subscription-aware analytics for a QR code
     */
    getQRAnalytics(qrCodeId: string, userId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        groupBy?: 'day' | 'week' | 'month';
    }): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    /**
     * Get user analytics summary with subscription filtering
     */
    getUserAnalytics(userId: string, options?: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    /**
     * Get subscription info and analytics capabilities
     */
    getAnalyticsSubscriptionInfo(userId: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    /**
     * Export analytics data
     */
    exportQRAnalytics(qrCodeId: string, userId: string, format: 'csv' | 'json', options?: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        success: boolean;
        data?: string;
        error?: string;
    }>;
    /**
     * Health check for analytics service
     */
    checkAnalyticsHealth(): Promise<{
        success: boolean;
        status?: string;
        error?: string;
    }>;
}
export declare const qrAnalyticsIntegration: QRAnalyticsIntegrationService;
export {};
//# sourceMappingURL=qr-analytics-integration.service.d.ts.map