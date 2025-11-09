/**
 * Analytics App - Main Export File
 * Following QR Generator App Patterns for Backend Integration
 */

// Services
export { analyticsService } from './services/analytics.service';
export { default as RealTimeWebSocketService } from './services/real-time-websocket.service';

// Service Types
export type {
  TrackScanRequest,
  GetAnalyticsRequest,
  AnalyticsListParams,
} from './services/analytics.service';

export type {
  WebSocketMessage,
  SubscriptionRequest,
  MetricsUpdate,
  ConnectionState,
  WebSocketConfig,
  MetricsUpdateCallback,
  SnapshotUpdateCallback,
  ConnectionStateCallback,
  ErrorCallback,
} from './services/real-time-websocket.service';

// Configuration
export { default as configManager } from './config/analytics.config';
export {
  config,
  apiConfig,
  websocketConfig,
  features,
  storage,
  rateLimits,
  isProduction,
  isDevelopment,
  isTest,
  isFeatureEnabled,
  getApiUrl,
  getWebSocketUrl,
} from './config/analytics.config';

export type { AnalyticsConfig } from './config/analytics.config';

// React Hooks
export {
  useRealTimeAnalytics,
  useWebSocketConnection,
  useQRCodeMetrics,
  useDashboardMetrics,
  useRealTimeAlerts,
} from './hooks/useRealTimeAnalytics';

// Utility Functions
export {
  formatAnalyticsNumber,
  formatAnalyticsPercentage,
  formatAnalyticsDate,
  formatAnalyticsTime,
  getAnalyticsTimeRange,
  validateAnalyticsRequest,
  getHeatmapColorScale,
} from './services/analytics.service';

// Example Usage (for documentation/testing)
export * as AnalyticsExamples from './services/analytics.service.examples';

// Re-export shared types that are commonly used
export type {
  ApiResponse,
  AnalyticsData,
  RealTimeMetrics,
  AnalyticsSnapshot,
  PeakTimeAnalysis,
  ConversionGoal,
  ConversionEvent,
  ConversionFunnel,
  HeatmapData,
  GeographicHeatmap,
  TemporalHeatmap,
  ExportConfiguration,
  ExportResult,
  AnalyticsAlert,
  DashboardWidget,
  AnalyticsDashboard,
  AdvancedAnalyticsRequest,
  AdvancedAnalyticsResponse,
} from '@qr-saas/shared';

// Default Export - Analytics Service Instance
export { analyticsService as default } from './services/analytics.service';