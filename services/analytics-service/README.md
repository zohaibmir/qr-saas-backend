# Analytics Service

Advanced analytics service with real-time metrics, heatmap generation, conversion tracking, and comprehensive reporting.

## 🎯 Purpose
- **Real-time Analytics**: Live scan tracking and metrics
- **Heatmap Generation**: Geographic and temporal visualization
- **Conversion Tracking**: Goal management and funnel analysis
- **Peak Time Analysis**: Statistical trend analysis
- **Professional Reports**: Excel, PDF, CSV export with charts

## ✅ Features
- ✅ **Real-time Engine**: WebSocket integration with Redis caching
- ✅ **Global Heatmaps**: 50+ countries with accurate coordinates
- ✅ **Peak Time Analysis**: Statistical analysis with trend detection
- ✅ **Conversion Tracking**: Goal management with attribution models
- ✅ **Professional Export**: Excel, PDF, CSV reports with visualizations
- ✅ **Redis Caching**: High-performance real-time metrics caching
- ✅ **Advanced Statistics**: Comprehensive analytics calculations

## 🗺️ Global Coverage
### Nordic Countries
- Sweden, Norway, Denmark, Finland, Iceland

### Gulf States  
- UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman

### Asian Markets
- China, Japan, India, Singapore, South Korea, Thailand
- Malaysia, Philippines, Indonesia, Vietnam, Taiwan, Hong Kong

### Total: 50+ Countries
Complete coordinate mapping for accurate heatmap visualization.

## 📁 Structure
```
src/
├── index.ts            # Service entry point
├── config/
│   └── database.config.ts  # Database and Redis configuration
├── interfaces/         # TypeScript interfaces
├── repositories/       # Data access layer
│   └── analytics.repository.ts
├── services/          # Business logic layer
│   ├── analytics.service.ts
│   ├── heatmap.service.ts
│   ├── peak-time.service.ts
│   ├── conversion.service.ts
│   ├── export.service.ts
│   └── realtime.service.ts
└── utils/             # Utility functions and helpers
```

## 🚀 Analytics Features

### Real-time Metrics
- **Live Scan Tracking**: WebSocket-powered real-time updates
- **Dashboard Updates**: Instant metric refreshing
- **Redis Caching**: Sub-second response times
- **Event Broadcasting**: Real-time notifications

### Heatmap Generation
- **Geographic Heatmaps**: Country-level scan distribution
- **Temporal Heatmaps**: Time-based activity patterns
- **Device Heatmaps**: Platform and browser analytics
- **Canvas Rendering**: High-quality visual generation

### Peak Time Analysis
- **Statistical Analysis**: Advanced mathematical calculations
- **Trend Detection**: Pattern recognition and forecasting
- **Business Insights**: Actionable recommendations
- **Performance Optimization**: Best scanning time identification

### Conversion Tracking
- **Goal Management**: Custom conversion goals
- **Funnel Analysis**: Multi-step conversion tracking  
- **Attribution Models**: Source attribution analysis
- **ROI Calculations**: Return on investment metrics

## 📊 Export & Reporting
```
Professional Reports:
├── Excel Export       # Detailed spreadsheets with charts
├── PDF Reports       # Professional formatted documents
├── CSV Data         # Raw data for external analysis
├── Chart Generation # Visual analytics charts
└── Scheduled Reports # Automated report delivery
```

## 🔧 Development
```bash
# Start in development mode
npm run dev

# Build the service
npm run build

# Run tests (33+ tests)
npm test

# Test specific analytics
npm test -- --testNamePattern="Heatmap"
npm test -- --testNamePattern="Conversion"
```

## 🌐 API Endpoints
### Analytics Data
- `GET /analytics/overview/:qrId` - QR code analytics overview
- `GET /analytics/scans/:qrId` - Detailed scan data
- `GET /analytics/realtime/:qrId` - Real-time metrics
- `POST /analytics/track` - Record scan event

### Heatmaps
- `GET /analytics/heatmap/geographic/:qrId` - Geographic heatmap
- `GET /analytics/heatmap/temporal/:qrId` - Time-based heatmap
- `GET /analytics/heatmap/device/:qrId` - Device distribution

### Peak Time Analysis
- `GET /analytics/peak-times/:qrId` - Peak time analysis
- `GET /analytics/trends/:qrId` - Trend analysis
- `GET /analytics/insights/:qrId` - Business insights

### Conversion Tracking
- `POST /analytics/goals` - Create conversion goal
- `GET /analytics/conversions/:goalId` - Conversion metrics
- `GET /analytics/funnel/:qrId` - Funnel analysis

### Export & Reports
- `GET /analytics/export/excel/:qrId` - Excel report
- `GET /analytics/export/pdf/:qrId` - PDF report
- `GET /analytics/export/csv/:qrId` - CSV export

## 🗄️ Database Schema
```sql
-- Scan Events
scan_events (
  id, qr_id, user_agent, ip_address, country, city,
  device_type, browser, timestamp, conversion_goal_id
)

-- Conversion Goals
conversion_goals (
  id, qr_id, name, target_url, value, created_at
)

-- Analytics Cache
analytics_cache (
  cache_key, data, expires_at, created_at
)

-- Heatmap Data
heatmap_data (
  id, qr_id, country_code, scan_count, last_updated
)
```

## ⚡ Redis Integration
### Caching Strategy
- **Real-time Metrics**: Instant dashboard updates
- **Aggregated Data**: Pre-calculated analytics
- **Session Storage**: User session management
- **Pub/Sub Events**: Real-time notifications

### Cache Keys
```
analytics:qr:{qrId}:scans:today
analytics:qr:{qrId}:countries
analytics:qr:{qrId}:devices
analytics:realtime:active_users
heatmap:geographic:{qrId}
```

## 📝 Configuration
Environment variables:
- `PORT` - Service port (default: 3003)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for caching
- `WEBSOCKET_PORT` - WebSocket server port
- `EXPORT_PATH` - Report export directory
- `CANVAS_SIZE` - Heatmap image dimensions