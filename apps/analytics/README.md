# Analytics App - Backend Integration

This analytics application follows the same patterns as the QR generator app, providing comprehensive analytics services with backend integration capabilities.

## 🚀 Features

- **Real-time Analytics**: WebSocket-based live metrics and updates
- **Comprehensive Tracking**: Scan tracking, conversion analytics, heatmaps
- **Backend Integration**: Ready-to-connect service layer following QR patterns
- **Type-safe API**: Full TypeScript support with shared type definitions
- **Configurable**: Environment-based configuration management
- **React Hooks**: Pre-built hooks for easy React integration

## 📁 Project Structure

```
apps/analytics/
├── src/
│   ├── services/
│   │   ├── analytics.service.ts          # Main analytics service
│   │   ├── real-time-websocket.service.ts # WebSocket service
│   │   └── analytics.service.examples.ts  # Usage examples
│   ├── hooks/
│   │   └── useRealTimeAnalytics.ts       # React hooks
│   ├── config/
│   │   └── analytics.config.ts           # Configuration management
│   └── index.ts                          # Main exports
├── package.json
├── .env.example                          # Environment variables template
└── README.md
```

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Build the application
npm run build

# Start development mode
npm run dev
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_ANALYTICS_API_BASE_URL=http://localhost:3001/api

# WebSocket Configuration
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001/ws

# Features
ENABLE_REAL_TIME_ANALYTICS=true
ENABLE_GEOGRAPHIC_TRACKING=true
ENABLE_CONVERSION_TRACKING=true
ENABLE_EXPORT_FEATURES=true
```

### Configuration Management

```typescript
import { config, isFeatureEnabled, getApiUrl } from '@qr-saas/analytics-app';

// Check if feature is enabled
if (isFeatureEnabled('realTimeAnalytics')) {
  // Initialize real-time features
}

// Get API endpoint URL
const endpoint = getApiUrl('/analytics/qr-codes');
```

## 📊 Usage Examples

### Basic Analytics Service

```typescript
import { analyticsService } from '@qr-saas/analytics-app';

// Get analytics for a QR code
const analytics = await analyticsService.getQRAnalytics('qr_123');
if (analytics.success) {
  console.log('Total scans:', analytics.data.totalScans);
  console.log('Geographic data:', analytics.data.geographicData);
}

// Get user's all analytics
const userAnalytics = await analyticsService.getUserAnalytics();
if (userAnalytics.success) {
  console.log(`Found ${userAnalytics.data.length} QR codes`);
}

// Export analytics
const exportResult = await analyticsService.exportAnalytics('csv');
if (exportResult.success) {
  window.open(exportResult.data.download_url, '_blank');
}
```

### Real-time Analytics with React Hooks

```typescript
import { useRealTimeAnalytics, useDashboardMetrics } from '@qr-saas/analytics-app';

function AnalyticsDashboard() {
  const qrCodeIds = ['qr_1', 'qr_2', 'qr_3'];
  
  // Real-time metrics for multiple QR codes
  const {
    connectionState,
    metrics,
    error,
    connect,
    disconnect
  } = useRealTimeAnalytics(qrCodeIds, {
    autoConnect: true,
    onMetricsUpdate: (update) => {
      console.log(`Updated metrics for ${update.qrCodeId}:`, update.metrics);
    }
  });

  // Dashboard-level aggregated metrics
  const {
    aggregateMetrics,
    isLoading,
    lastUpdated
  } = useDashboardMetrics(qrCodeIds);

  return (
    <div>
      <h2>Analytics Dashboard</h2>
      <p>Connection: {connectionState}</p>
      <p>Total Active Users: {aggregateMetrics.totalViewers}</p>
      <p>Total QR Codes: {aggregateMetrics.totalQRCodes}</p>
      <p>Last Updated: {lastUpdated?.toLocaleTimeString()}</p>
      
      {Object.entries(metrics).map(([qrId, qrMetrics]) => (
        <div key={qrId}>
          <h3>QR Code: {qrId}</h3>
          <p>Active Users: {qrMetrics.currentViewers}</p>
          <p>Scans/Second: {qrMetrics.scansPerSecond}</p>
        </div>
      ))}
    </div>
  );
}
```

### Advanced Analytics Features

```typescript
import { analyticsService } from '@qr-saas/analytics-app';

// Heatmap data
const heatmapData = await analyticsService.getHeatmapData('qr_123', 'geographic');
if (heatmapData.success) {
  console.log('Geographic heatmap:', heatmapData.data);
}

// Peak time analysis
const peakTimes = await analyticsService.getPeakTimeAnalysis('qr_123');
if (peakTimes.success) {
  console.log('Peak hours:', peakTimes.data.peakHours);
  console.log('Peak days:', peakTimes.data.peakDays);
}

// Conversion tracking
const conversions = await analyticsService.getConversionTracking('qr_123');
if (conversions.success) {
  console.log('Conversion rate:', conversions.data.conversionRate);
  console.log('Conversions by goal:', conversions.data.conversionsByGoal);
}
```

### Scan Tracking

```typescript
import { analyticsService } from '@qr-saas/analytics-app';

// Track a QR code scan
const trackResult = await analyticsService.trackScan({
  qrCodeId: 'qr_123',
  ipAddress: '192.168.1.1',
  userAgent: navigator.userAgent,
  location: {
    country: 'United States',
    city: 'New York'
  },
  platform: 'web',
  device: 'mobile',
  referrer: document.referrer
});

if (trackResult.success) {
  console.log('Scan tracked:', trackResult.data.eventId);
}
```

## 🔄 Backend Integration

### Connecting to Backend Services

The analytics service is designed to seamlessly connect to backend APIs:

```typescript
// The service automatically uses configured endpoints
const analytics = await analyticsService.getQRAnalytics('qr_123');

// This will make a request to:
// GET ${NEXT_PUBLIC_ANALYTICS_API_BASE_URL}/analytics/qr_123
```

### WebSocket Connection

```typescript
import { RealTimeWebSocketService } from '@qr-saas/analytics-app';

const wsService = new RealTimeWebSocketService({
  authToken: 'your-jwt-token'
});

await wsService.connect();
wsService.subscribeToMetrics(['qr_1', 'qr_2']);

wsService.onMetricsUpdate((update) => {
  console.log('Real-time update:', update);
});
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check
```

## �️ Database Integration

This analytics service integrates with your existing database schema at `/private/var/www/qrgeneration/database/init.sql`.

### Key Database Tables Used:
- **`scan_events`** - Individual QR code scan tracking
- **`daily_analytics`** - Daily summary statistics  
- **`qr_codes`** - QR code metadata and counters
- **`users`** - User information for analytics context
- **`qr_categories`** - QR code categorization

### Dummy Data Setup:
See `/private/var/www/qrgeneration/ANALYTICS_DUMMY_DATA.md` for comprehensive test data including:
- 10 sample QR codes across 3 users
- ~50,000 realistic scan events over 30 days
- Geographic distribution across 15 countries
- Platform/device breakdown
- Daily analytics summaries

### Database Queries:
The service uses optimized queries with proper indexing:
```sql
-- Example: Get QR analytics with geographic data
SELECT 
    qr.short_id, qr.name, qr.current_scans,
    COUNT(se.id) as total_events,
    COUNT(DISTINCT se.ip_address) as unique_visitors,
    se.country, se.city, se.platform, se.device
FROM qr_codes qr
LEFT JOIN scan_events se ON qr.short_id = se.qr_code_id
WHERE qr.user_id = $1 AND se.timestamp >= $2
GROUP BY qr.id, se.country, se.city, se.platform, se.device;
```

## �🔗 Integration with Frontend

This analytics app can be used with the frontend analytics dashboard:

```typescript
// In your frontend application
import { analyticsService, useRealTimeAnalytics } from '@qr-saas/analytics-app';

// Use in React components
function MyAnalyticsComponent() {
  const { metrics, connectionState } = useRealTimeAnalytics(['DEMO001', 'DEMO002']);
  
  return (
    <div>
      {/* Your analytics UI using real database IDs */}
    </div>
  );
}
```

## 📦 API Reference

### Analytics Service Methods

- `getQRAnalytics(qrId: string)` - Get analytics for specific QR code
- `getUserAnalytics()` - Get all user's QR analytics
- `getDashboardSummary(timeRange?: string)` - Get dashboard summary
- `getHeatmapData(qrId: string, type: 'geographic' | 'temporal')` - Get heatmap data
- `getRealtimeAnalytics(qrId?: string)` - Get real-time metrics
- `getPeakTimeAnalysis(qrId?: string)` - Get peak time analysis
- `getConversionTracking(qrId: string)` - Get conversion data
- `getPerformanceMetrics(qrId: string, timeRange?: string)` - Get performance metrics
- `exportAnalytics(format: 'csv' | 'excel' | 'pdf')` - Export analytics data
- `trackScan(data: TrackScanRequest)` - Track a QR code scan

### React Hooks

- `useRealTimeAnalytics()` - Main real-time analytics hook
- `useWebSocketConnection()` - WebSocket connection management
- `useQRCodeMetrics()` - Individual QR code metrics
- `useDashboardMetrics()` - Dashboard-level aggregated metrics
- `useRealTimeAlerts()` - Real-time alerts and notifications

## 🚀 Deployment

The analytics app is ready for production deployment with:

- Environment-based configuration
- Production optimization
- Error handling and logging
- Rate limiting support
- Monitoring integration

## 📄 License

MIT License - see LICENSE file for details