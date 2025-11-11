"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrAnalyticsIntegration = exports.QRAnalyticsIntegrationService = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Service to handle integration between QR generation and analytics tracking
 */
class QRAnalyticsIntegrationService {
    constructor() {
        this.analyticsServiceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004';
        this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
    }
    /**
     * Track a QR code scan event
     */
    async trackScanEvent(scanData) {
        try {
            console.log(`[QR-Analytics Integration] Tracking scan for QR: ${scanData.qrCodeId}`);
            const response = await axios_1.default.post(`${this.analyticsServiceUrl}/track`, scanData, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.success) {
                console.log(`[QR-Analytics Integration] Scan tracked successfully: ${response.data.data?.id}`);
                return { success: true };
            }
            else {
                console.error(`[QR-Analytics Integration] Failed to track scan: ${response.data.error?.message}`);
                return { success: false, error: response.data.error?.message || 'Unknown error' };
            }
        }
        catch (error) {
            console.error('[QR-Analytics Integration] Error tracking scan:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
    /**
     * Initialize analytics for a new QR code
     */
    async initializeQRCodeAnalytics(qrData) {
        try {
            console.log(`[QR-Analytics Integration] Initializing analytics for QR: ${qrData.qrCodeId}`);
            // For now, we just log the QR creation - analytics will be tracked when scans happen
            // In a more advanced implementation, we might create initial analytics records
            console.log(`[QR-Analytics Integration] Analytics initialized for QR: ${qrData.qrCodeId}, User: ${qrData.userId}, Tier: ${qrData.subscriptionTier}`);
            return { success: true };
        }
        catch (error) {
            console.error('[QR-Analytics Integration] Error initializing QR analytics:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Initialization error'
            };
        }
    }
    /**
     * Get subscription-aware analytics for a QR code
     */
    async getQRAnalytics(qrCodeId, userId, options) {
        try {
            console.log(`[QR-Analytics Integration] Getting analytics for QR: ${qrCodeId}, User: ${userId}`);
            // Build query parameters
            const params = new URLSearchParams();
            if (options?.startDate)
                params.append('startDate', options.startDate.toISOString());
            if (options?.endDate)
                params.append('endDate', options.endDate.toISOString());
            if (options?.groupBy)
                params.append('groupBy', options.groupBy);
            const queryString = params.toString();
            const url = `${this.analyticsServiceUrl}/qr/${qrCodeId}${queryString ? `?${queryString}` : ''}`;
            const response = await axios_1.default.get(url, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId // Pass user ID for subscription validation
                }
            });
            if (response.data.success) {
                console.log(`[QR-Analytics Integration] Analytics retrieved successfully for QR: ${qrCodeId}`);
                return { success: true, data: response.data.data };
            }
            else {
                console.error(`[QR-Analytics Integration] Failed to get analytics: ${response.data.error?.message}`);
                return { success: false, error: response.data.error?.message || 'Unknown error' };
            }
        }
        catch (error) {
            console.error('[QR-Analytics Integration] Error getting QR analytics:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
    /**
     * Get user analytics summary with subscription filtering
     */
    async getUserAnalytics(userId, options) {
        try {
            console.log(`[QR-Analytics Integration] Getting user analytics for User: ${userId}`);
            // Build query parameters
            const params = new URLSearchParams();
            if (options?.startDate)
                params.append('startDate', options.startDate.toISOString());
            if (options?.endDate)
                params.append('endDate', options.endDate.toISOString());
            const queryString = params.toString();
            const url = `${this.analyticsServiceUrl}/user${queryString ? `?${queryString}` : ''}`;
            const response = await axios_1.default.get(url, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId // Pass user ID for subscription validation
                }
            });
            if (response.data.success) {
                console.log(`[QR-Analytics Integration] User analytics retrieved successfully for User: ${userId}`);
                return { success: true, data: response.data.data };
            }
            else {
                console.error(`[QR-Analytics Integration] Failed to get user analytics: ${response.data.error?.message}`);
                return { success: false, error: response.data.error?.message || 'Unknown error' };
            }
        }
        catch (error) {
            console.error('[QR-Analytics Integration] Error getting user analytics:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
    /**
     * Get subscription info and analytics capabilities
     */
    async getAnalyticsSubscriptionInfo(userId) {
        try {
            console.log(`[QR-Analytics Integration] Getting subscription info for User: ${userId}`);
            const response = await axios_1.default.get(`${this.analyticsServiceUrl}/subscription-info`, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId
                }
            });
            if (response.data.success) {
                console.log(`[QR-Analytics Integration] Subscription info retrieved for User: ${userId}, Plan: ${response.data.data?.planName}`);
                return { success: true, data: response.data.data };
            }
            else {
                console.error(`[QR-Analytics Integration] Failed to get subscription info: ${response.data.error?.message}`);
                return { success: false, error: response.data.error?.message || 'Unknown error' };
            }
        }
        catch (error) {
            console.error('[QR-Analytics Integration] Error getting subscription info:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }
    /**
     * Export analytics data
     */
    async exportQRAnalytics(qrCodeId, userId, format, options) {
        try {
            console.log(`[QR-Analytics Integration] Exporting analytics for QR: ${qrCodeId}, User: ${userId}, Format: ${format}`);
            // Build query parameters
            const params = new URLSearchParams();
            params.append('format', format);
            if (options?.startDate)
                params.append('startDate', options.startDate.toISOString());
            if (options?.endDate)
                params.append('endDate', options.endDate.toISOString());
            const queryString = params.toString();
            const url = `${this.analyticsServiceUrl}/qr/${qrCodeId}/export${queryString ? `?${queryString}` : ''}`;
            const response = await axios_1.default.get(url, {
                timeout: 30000, // Longer timeout for exports
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId
                }
            });
            if (response.status === 200 && response.data) {
                console.log(`[QR-Analytics Integration] Analytics exported successfully for QR: ${qrCodeId}`);
                return { success: true, data: response.data };
            }
            else {
                console.error(`[QR-Analytics Integration] Failed to export analytics`);
                return { success: false, error: 'Export failed' };
            }
        }
        catch (error) {
            console.error('[QR-Analytics Integration] Error exporting analytics:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Export error'
            };
        }
    }
    /**
     * Health check for analytics service
     */
    async checkAnalyticsHealth() {
        try {
            const response = await axios_1.default.get(`${this.analyticsServiceUrl}/health`, {
                timeout: 3000
            });
            return {
                success: true,
                status: response.data.data?.status || 'unknown'
            };
        }
        catch (error) {
            console.error('[QR-Analytics Integration] Analytics service health check failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Health check failed'
            };
        }
    }
}
exports.QRAnalyticsIntegrationService = QRAnalyticsIntegrationService;
exports.qrAnalyticsIntegration = new QRAnalyticsIntegrationService();
//# sourceMappingURL=qr-analytics-integration.service.js.map