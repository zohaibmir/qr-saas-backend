/**
 * Complete Analytics Service API Documentation
 * All analytics endpoints accessible via API Gateway at /api/analytics/*
 */

/**
 * @swagger
 * /api/analytics/track:
 *   post:
 *     summary: Track QR code scan event (Guest-accessible)
 *     tags: [Analytics]
 *     security: []  # Public endpoint
 *     description: |
 *       Track QR code scan events for analytics. This endpoint is accessible without authentication
 *       to support public QR code tracking. All data is anonymized and processed for analytics.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodeId
 *               - timestamp
 *             properties:
 *               qrCodeId:
 *                 type: string
 *                 description: QR code identifier
 *                 example: "qr_abc123"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Scan timestamp
 *               location:
 *                 type: object
 *                 description: Geographic location data
 *                 properties:
 *                   country:
 *                     type: string
 *                     example: "Sweden"
 *                   city:
 *                     type: string
 *                     example: "Stockholm"
 *                   latitude:
 *                     type: number
 *                     example: 59.3293
 *                   longitude:
 *                     type: number
 *                     example: 18.0686
 *               device:
 *                 type: object
 *                 description: Device information
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [mobile, desktop, tablet]
 *                   os:
 *                     type: string
 *                     example: "iOS"
 *                   browser:
 *                     type: string
 *                     example: "Safari"
 *               userAgent:
 *                 type: string
 *                 description: Full user agent string
 *     responses:
 *       201:
 *         description: Scan tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     scanId:
 *                       type: string
 *                       description: Unique scan event ID
 */

/**
 * @swagger
 * /api/analytics/{qrCodeId}:
 *   get:
 *     summary: Get analytics for specific QR code
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Get detailed analytics for a specific QR code. Analytics retention depends on subscription tier:
 *       - Free: 7 days
 *       - Starter: 30 days  
 *       - Pro: 1 year
 *       - Business: 2 years
 *       - Enterprise: 3 years
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR code identifier
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analytics period
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time grouping for data
 *     responses:
 *       200:
 *         description: QR code analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalScans:
 *                       type: number
 *                       example: 1250
 *                     uniqueVisitors:
 *                       type: number
 *                       example: 980
 *                     averageScansPerDay:
 *                       type: number
 *                       example: 25.5
 *                     conversionRate:
 *                       type: number
 *                       example: 78.4
 *                     timeSeries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           scans:
 *                             type: number
 *                     topCountries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           scans:
 *                             type: number
 *                     deviceBreakdown:
 *                       type: object
 *                       properties:
 *                         mobile:
 *                           type: number
 *                         desktop:
 *                           type: number
 *                         tablet:
 *                           type: number
 */

/**
 * @swagger
 * /api/analytics/user:
 *   get:
 *     summary: Get user analytics summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Get aggregated analytics for all user's QR codes. Data filtered based on subscription tier.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analytics period
 *     responses:
 *       200:
 *         description: User analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalQrCodes:
 *                       type: number
 *                       example: 25
 *                     totalScans:
 *                       type: number
 *                       example: 5420
 *                     averageScansPerQr:
 *                       type: number
 *                       example: 216.8
 *                     topPerformingQr:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         scans:
 *                           type: number
 *                     subscriptionInfo:
 *                       type: object
 *                       properties:
 *                         planName:
 *                           type: string
 *                           example: "Pro"
 *                         retentionDays:
 *                           type: number
 *                           example: 365
 *                         features:
 *                           type: array
 *                           items:
 *                             type: string
 */

/**
 * @swagger
 * /api/analytics/heatmap/geographic:
 *   get:
 *     summary: Get geographic heatmap data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: Geographic distribution of QR scans with heatmap visualization data
 *     parameters:
 *       - in: query
 *         name: qrCodeId
 *         schema:
 *           type: string
 *         description: Specific QR code ID (optional, defaults to all user's QR codes)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Geographic heatmap data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     countries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           code:
 *                             type: string
 *                           scans:
 *                             type: number
 *                           intensity:
 *                             type: number
 *                     cities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           city:
 *                             type: string
 *                           country:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           scans:
 *                             type: number
 */

/**
 * @swagger
 * /api/analytics/heatmap/temporal:
 *   get:
 *     summary: Get temporal heatmap data (Starter+)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: Time-based scan patterns and peak hours analysis. Available for Starter tier and above.
 *     parameters:
 *       - in: query
 *         name: qrCodeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly]
 *           default: hourly
 *     responses:
 *       200:
 *         description: Temporal heatmap data
 *       402:
 *         description: Subscription upgrade required
 */

/**
 * @swagger
 * /api/analytics/dashboards:
 *   get:
 *     summary: Get user dashboards (Starter+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     description: Get all custom dashboards for the authenticated user. Starter tier allows up to 3 dashboards.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [marketing, analytics, performance, executive]
 *     responses:
 *       200:
 *         description: List of user dashboards
 *       402:
 *         description: Subscription upgrade required (Starter tier needed)
 *   post:
 *     summary: Create new dashboard (Starter+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new custom analytics dashboard. Tier limits apply.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Marketing Performance Dashboard"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Track marketing campaign effectiveness"
 *               category:
 *                 type: string
 *                 enum: [marketing, analytics, performance, executive]
 *               layout:
 *                 type: object
 *                 description: Dashboard layout configuration
 *               widgets:
 *                 type: array
 *                 description: Initial widgets configuration
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Dashboard created successfully
 *       402:
 *         description: Subscription upgrade required or tier limit exceeded
 */

/**
 * @swagger
 * /api/analytics/dashboards/{dashboardId}:
 *   get:
 *     summary: Get dashboard by ID (Starter+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard data
 *       404:
 *         description: Dashboard not found
 *   put:
 *     summary: Update dashboard (Starter+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               layout:
 *                 type: object
 *               widgets:
 *                 type: array
 *     responses:
 *       200:
 *         description: Dashboard updated successfully
 *   delete:
 *     summary: Delete dashboard (Starter+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard deleted successfully
 */

/**
 * @swagger
 * /api/analytics/dashboards/templates:
 *   get:
 *     summary: Get dashboard templates (Pro+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     description: Get available dashboard templates for quick setup. Available for Pro tier and above.
 *     responses:
 *       200:
 *         description: List of dashboard templates
 *       402:
 *         description: Subscription upgrade required (Pro tier needed)
 */

/**
 * @swagger
 * /api/analytics/dashboards/widget-templates:
 *   get:
 *     summary: Get widget templates (Pro+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     description: Get available widget templates. Available for Pro tier and above.
 *     responses:
 *       200:
 *         description: List of widget templates
 *       402:
 *         description: Pro subscription required
 */

/**
 * @swagger
 * /api/analytics/dashboards/widgets/{widgetId}/data:
 *   get:
 *     summary: Get widget data (Pro+)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Widget data
 *       402:
 *         description: Pro subscription required
 */

/**
 * @swagger
 * /api/analytics/dashboards/{dashboardId}/duplicate:
 *   post:
 *     summary: Duplicate dashboard (Enterprise)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     description: Create a copy of an existing dashboard. Enterprise feature.
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the duplicated dashboard
 *     responses:
 *       201:
 *         description: Dashboard duplicated successfully
 *       402:
 *         description: Enterprise subscription required
 */

/**
 * @swagger
 * /api/analytics/dashboards/{dashboardId}/export:
 *   get:
 *     summary: Export dashboard (Enterprise)
 *     tags: [Custom Dashboards]
 *     security:
 *       - bearerAuth: []
 *     description: Export dashboard configuration and data. Enterprise feature.
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, pdf]
 *           default: json
 *     responses:
 *       200:
 *         description: Dashboard exported successfully
 *       402:
 *         description: Enterprise subscription required
 */

/**
 * @swagger
 * /api/analytics/campaigns:
 *   get:
 *     summary: Get marketing campaigns
 *     tags: [Marketing Tools]
 *     security:
 *       - bearerAuth: []
 *     description: Get all marketing campaigns for the authenticated user
 *     responses:
 *       200:
 *         description: List of campaigns
 *   post:
 *     summary: Create marketing campaign
 *     tags: [Marketing Tools]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new marketing campaign
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Summer Sale 2024"
 *               description:
 *                 type: string
 *                 example: "Summer promotional campaign"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               budget:
 *                 type: number
 *                 example: 5000.00
 *               goals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [scans, conversions, revenue]
 *                     target:
 *                       type: number
 *     responses:
 *       201:
 *         description: Campaign created successfully
 */

/**
 * @swagger
 * /api/analytics/utm:
 *   post:
 *     summary: Generate UTM parameters
 *     tags: [Marketing Tools]
 *     security:
 *       - bearerAuth: []
 *     description: Generate UTM tracking parameters for campaigns
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source
 *               - medium
 *               - campaign
 *             properties:
 *               source:
 *                 type: string
 *                 example: "facebook"
 *               medium:
 *                 type: string
 *                 example: "social"
 *               campaign:
 *                 type: string
 *                 example: "summer_sale_2024"
 *               term:
 *                 type: string
 *                 example: "discount"
 *               content:
 *                 type: string
 *                 example: "banner_ad"
 *     responses:
 *       201:
 *         description: UTM parameters generated
 */

/**
 * @swagger
 * /api/analytics/utm/analytics:
 *   get:
 *     summary: Get UTM analytics
 *     tags: [Marketing Tools]
 *     security:
 *       - bearerAuth: []
 *     description: Get analytics data for UTM campaigns
 *     parameters:
 *       - in: query
 *         name: campaign
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: medium
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: UTM analytics data
 */

/**
 * @swagger
 * /api/analytics/peak-time:
 *   get:
 *     summary: Get peak time analysis
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: Get peak scanning times and patterns analysis
 *     parameters:
 *       - in: query
 *         name: qrCodeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Peak time analysis data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     peakHours:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hour:
 *                             type: number
 *                           scans:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                     peakDays:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day:
 *                             type: string
 *                           scans:
 *                             type: number
 *                     businessHoursPerformance:
 *                       type: object
 *                       properties:
 *                         businessHours:
 *                           type: number
 *                         afterHours:
 *                           type: number
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 */

/**
 * @swagger
 * /api/analytics/cross-campaign:
 *   get:
 *     summary: Cross-campaign analysis
 *     tags: [Cross-Campaign Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: Compare performance across multiple campaigns
 *     parameters:
 *       - in: query
 *         name: campaigns
 *         schema:
 *           type: string
 *         description: Comma-separated campaign IDs
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: string
 *           enum: [scans, conversions, engagement, revenue]
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *     responses:
 *       200:
 *         description: Cross-campaign comparison data
 */

/**
 * @swagger
 * /api/analytics/predictions:
 *   get:
 *     summary: Get predictive models
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: Get available predictive analytics models for the user
 *     responses:
 *       200:
 *         description: List of predictive models
 *   post:
 *     summary: Train new predictive model
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: Train a new predictive model for scan forecasting
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - modelType
 *               - qrCodeIds
 *             properties:
 *               modelType:
 *                 type: string
 *                 enum: [arima, lstm, prophet]
 *               qrCodeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               trainingPeriod:
 *                 type: number
 *                 description: Training period in days
 *                 example: 90
 *               forecastHorizon:
 *                 type: number
 *                 description: Forecast horizon in days
 *                 example: 30
 *     responses:
 *       202:
 *         description: Model training started
 */

/**
 * @swagger
 * /api/analytics/alerts:
 *   get:
 *     summary: Get alert rules
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     description: Get all alert rules for the authenticated user
 *     responses:
 *       200:
 *         description: List of alert rules
 *   post:
 *     summary: Create alert rule
 *     tags: [Real-time Alerts]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new alert rule for monitoring QR performance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - condition
 *               - threshold
 *               - notifications
 *             properties:
 *               name:
 *                 type: string
 *                 example: "High Scan Volume Alert"
 *               condition:
 *                 type: string
 *                 enum: [above, below, equals, percentage_change]
 *               threshold:
 *                 type: number
 *                 example: 1000
 *               metric:
 *                 type: string
 *                 enum: [scans, unique_visitors, conversion_rate]
 *               timeWindow:
 *                 type: string
 *                 enum: [5m, 15m, 1h, 24h]
 *               notifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [email, sms, webhook]
 *                     target:
 *                       type: string
 *                       description: Email, phone number, or webhook URL
 *     responses:
 *       201:
 *         description: Alert rule created successfully
 */

/**
 * @swagger
 * /api/analytics/super-admin:
 *   get:
 *     summary: Super admin analytics (Enterprise)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Get system-wide analytics for super admin users. Includes:
 *       - Global QR code statistics
 *       - User activity metrics
 *       - Revenue analytics
 *       - Top performing QR codes and users
 *       
 *       **Requires Super Admin privileges (Enterprise tier)**
 *     responses:
 *       200:
 *         description: Super admin analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     globalSummary:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                         totalQrCodes:
 *                           type: number
 *                         totalScans:
 *                           type: number
 *                         revenue:
 *                           type: number
 *                     topUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           email:
 *                             type: string
 *                           qrCodes:
 *                             type: number
 *                           scans:
 *                             type: number
 *                           subscriptionTier:
 *                             type: string
 *                     planBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           plan:
 *                             type: string
 *                           users:
 *                             type: number
 *                           revenue:
 *                             type: number
 *                     geographicBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           users:
 *                             type: number
 *                           scans:
 *                             type: number
 *       403:
 *         description: Forbidden - Super admin access required
 *       402:
 *         description: Enterprise subscription required
 */

/**
 * @swagger
 * /api/analytics/{qrCodeId}/export:
 *   get:
 *     summary: Export QR analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Export QR code analytics data in various formats.
 *       Export capabilities by subscription tier:
 *       - Free: CSV only, basic data
 *       - Starter/Pro/Business: CSV and JSON, detailed data
 *       - Enterprise: All formats including PDF reports
 *     parameters:
 *       - in: path
 *         name: qrCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR code identifier
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json, pdf]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: includeRawData
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include raw scan events (Enterprise only)
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       402:
 *         description: Subscription upgrade required for requested format
 */