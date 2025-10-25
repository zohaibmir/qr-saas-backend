# QR SaaS Database Schema

This directory contains the complete database schema for the QR SaaS platform, organized into modular components for better maintainability and deployment flexibility.

## 📁 Schema Files

### Core Schema
- **`init.sql`** - Core database schema
  - Users, authentication, subscriptions
  - QR codes, categories, scan events
  - File uploads, notifications
  - Basic analytics (daily summaries)
  - Dynamic QR features, bulk generation

### Service-Specific Schemas
- **`landing-pages-schema.sql`** - Landing Pages Service
  - Landing page templates and pages
  - A/B testing framework
  - Form builder and submissions
  - Page analytics and social sharing
  - Custom domain management

- **`advanced-analytics-schema.sql`** - Advanced Analytics Service  
  - Conversion goals and tracking
  - Heatmap data storage
  - Real-time metrics caching
  - Peak time analysis
  - Export jobs and alerting system

## 🚀 Deployment Scripts

### Complete Deployment
```bash
# Deploy all schemas (recommended for new installations)
DOCKER_POSTGRES_CONTAINER=qrgeneration-postgres-1 ./database/deploy.sh
```

### Modular Deployment
```bash
# Core schema only
DOCKER_POSTGRES_CONTAINER=qrgeneration-postgres-1 ./database/deploy-core.sh

# Landing pages service only (requires core)
DOCKER_POSTGRES_CONTAINER=qrgeneration-postgres-1 ./database/deploy-landing-pages.sh

# Advanced analytics only (requires core)
DOCKER_POSTGRES_CONTAINER=qrgeneration-postgres-1 ./database/deploy-analytics.sh
```

### Direct PostgreSQL Connection
```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=qr_user
export DB_NAME=qr_saas

# Deploy full schema
./database/deploy.sh
```

## 📊 Database Structure

### Core Tables (13 tables)
- `users` - User accounts and authentication
- `qr_codes` - QR code definitions and metadata
- `qr_categories` - QR code categorization system
- `scan_events` - Individual scan tracking
- `daily_analytics` - Aggregated daily statistics
- `subscription_plans` - Available subscription tiers
- `user_subscriptions` - User subscription status
- `file_uploads` - File storage management
- `email_messages` - Email notification queue
- `sms_messages` - SMS notification queue
- `notification_templates` - Message templates
- Plus dynamic QR and bulk generation tables

### Landing Pages Tables (8 tables)
- `landing_page_templates` - Page template definitions
- `landing_pages` - User-created landing pages
- `landing_page_ab_tests` - A/B testing campaigns
- `landing_page_forms` - Form builder definitions
- `landing_page_form_submissions` - Form submission data
- `landing_page_social_sharing` - Social sharing configuration
- `landing_page_analytics` - Page analytics events
- `landing_page_domains` - Custom domain management

### Advanced Analytics Tables (9 tables)
- `conversion_goals` - Conversion tracking goals
- `conversion_events` - Conversion event data
- `heatmap_data` - Geographic and temporal heatmaps
- `realtime_metrics_cache` - Real-time dashboard metrics
- `peak_time_analysis` - Peak usage analysis results
- `analytics_export_jobs` - Data export job queue
- `analytics_alerts` - Alert configuration
- `analytics_alert_history` - Alert trigger history
- `realtime_connections` - WebSocket connection tracking

### Materialized Views
- `daily_analytics_summary` - Pre-aggregated daily statistics
- `conversion_funnel_summary` - Conversion funnel metrics

## 🔧 Schema Dependencies

```
Core Schema (init.sql)
├── Landing Pages Schema (landing-pages-schema.sql)
└── Advanced Analytics Schema (advanced-analytics-schema.sql)
```

The core schema must be deployed first as other schemas depend on:
- `users` table for user relationships
- `qr_codes` table for QR code relationships

## 🎯 Features by Schema

### Core Features
- ✅ User management and authentication
- ✅ QR code generation and management
- ✅ Scan tracking and basic analytics
- ✅ Category organization system
- ✅ Subscription management
- ✅ File upload handling
- ✅ Email/SMS notifications
- ✅ Dynamic QR codes
- ✅ Bulk QR generation

### Landing Pages Features  
- ✅ Template system with 6 default templates
- ✅ Drag-and-drop page builder
- ✅ A/B testing with statistical analysis
- ✅ Form builder with validation
- ✅ Social sharing integration
- ✅ Custom domain support
- ✅ Page analytics and visitor tracking
- ✅ SEO optimization tools

### Advanced Analytics Features
- ✅ Multi-step conversion funnels
- ✅ Geographic and temporal heatmaps
- ✅ Real-time dashboard metrics
- ✅ Peak time analysis with AI recommendations
- ✅ Professional report exports (Excel, PDF, CSV, JSON)
- ✅ Intelligent alerting system
- ✅ WebSocket real-time updates
- ✅ Advanced performance optimization

## 📈 Performance Optimizations

- **Indexes**: Comprehensive indexing strategy including GIN indexes for JSONB
- **Materialized Views**: Pre-aggregated data for dashboard performance
- **Partitioning Ready**: Tables designed for future partitioning by date
- **Connection Pooling**: Optimized for connection pooling patterns
- **Query Optimization**: Indexes optimized for common query patterns

## 🔒 Security Features

- **Row Level Security**: Enabled on user-specific tables
- **Data Validation**: CHECK constraints and data type enforcement
- **Audit Trail**: Created/updated timestamps on all tables
- **Soft Deletes**: CASCADE deletes with proper foreign key relationships

## 🛠 Maintenance

### Regular Tasks
```sql
-- Refresh materialized views (run daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY conversion_funnel_summary;

-- Clean up expired data (run weekly)
SELECT cleanup_analytics_data();

-- Update heatmap normalizations (run hourly)
SELECT normalize_heatmap_data(qr_code_id, 'geographic') FROM (
    SELECT DISTINCT qr_code_id FROM heatmap_data WHERE heatmap_type = 'geographic'
) AS qr_codes;
```

### Monitoring Queries
```sql
-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size 
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active real-time connections
SELECT COUNT(*) as active_connections FROM realtime_connections WHERE is_active = true;

-- Recent export jobs
SELECT status, COUNT(*) FROM analytics_export_jobs 
WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY status;
```

## 📝 Version History

- **v1.0** - Core QR code functionality
- **v1.1** - Landing pages service integration
- **v1.2** - Advanced analytics system
- **v1.3** - Modular schema organization

## 🤝 Contributing

When adding new features:
1. Add tables to the appropriate schema file
2. Include proper indexes and constraints
3. Add helper functions if needed
4. Update this README
5. Test with the deployment scripts