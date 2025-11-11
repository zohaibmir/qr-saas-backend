/**
 * Marketing Routes Documentation
 * Comprehensive API documentation for QR SaaS Marketing Tools
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MarketingCampaign:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique campaign identifier
 *         userId:
 *           type: string
 *           description: Owner user ID
 *         name:
 *           type: string
 *           description: Campaign name
 *         description:
 *           type: string
 *           description: Campaign description
 *         type:
 *           type: string
 *           enum: [brand_awareness, lead_generation, sales, engagement, remarketing]
 *           description: Campaign type
 *         status:
 *           type: string
 *           enum: [draft, active, paused, archived]
 *           description: Campaign status
 *         budget:
 *           type: number
 *           description: Campaign budget
 *         currency:
 *           type: string
 *           description: Currency code (e.g., USD, EUR)
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         goals:
 *           type: object
 *           description: Campaign goals and KPIs
 *         metadata:
 *           type: object
 *           description: Additional campaign data
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     UTMTracking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique UTM tracking ID
 *         userId:
 *           type: string
 *           description: Owner user ID
 *         qrCodeId:
 *           type: string
 *           description: Associated QR code ID
 *         campaignId:
 *           type: string
 *           description: Associated campaign ID (optional)
 *         originalUrl:
 *           type: string
 *           description: Original URL without UTM parameters
 *         utmSource:
 *           type: string
 *           description: UTM source parameter
 *         utmMedium:
 *           type: string
 *           description: UTM medium parameter
 *         utmCampaign:
 *           type: string
 *           description: UTM campaign parameter
 *         utmTerm:
 *           type: string
 *           description: UTM term parameter (optional)
 *         utmContent:
 *           type: string
 *           description: UTM content parameter (optional)
 *         generatedUrl:
 *           type: string
 *           description: Complete URL with UTM parameters
 *         isActive:
 *           type: boolean
 *           description: Whether UTM tracking is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     RetargetingPixel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique pixel ID
 *         userId:
 *           type: string
 *           description: Owner user ID
 *         qrCodeId:
 *           type: string
 *           description: Associated QR code ID (optional)
 *         campaignId:
 *           type: string
 *           description: Associated campaign ID (optional)
 *         name:
 *           type: string
 *           description: Pixel name
 *         pixelType:
 *           type: string
 *           enum: [facebook, google, linkedin, twitter, custom]
 *           description: Platform type
 *         pixelId:
 *           type: string
 *           description: Platform-specific pixel ID
 *         isActive:
 *           type: boolean
 *           description: Whether pixel is active
 *         configuration:
 *           type: object
 *           description: Platform-specific configuration
 *         triggerEvents:
 *           type: array
 *           items:
 *             type: string
 *           description: Events that trigger the pixel
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     CampaignDashboard:
 *       type: object
 *       properties:
 *         campaign:
 *           $ref: '#/components/schemas/MarketingCampaign'
 *         analytics:
 *           type: object
 *           properties:
 *             totalImpressions:
 *               type: number
 *             totalClicks:
 *               type: number
 *             uniqueVisitors:
 *               type: number
 *             conversions:
 *               type: number
 *             ctr:
 *               type: number
 *               description: Click-through rate
 *             conversionRate:
 *               type: number
 *             costPerClick:
 *               type: number
 *             costPerConversion:
 *               type: number
 *         qrCodes:
 *           type: array
 *           items:
 *             type: object
 *         utmTracking:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UTMTracking'
 *         retargetingPixels:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RetargetingPixel'
 *         recentEvents:
 *           type: array
 *           items:
 *             type: object
 *         performanceMetrics:
 *           type: object
 *           description: Real-time performance data
 * 
 *     UTMAnalytics:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             totalClicks:
 *               type: number
 *             uniqueVisitors:
 *               type: number
 *             conversions:
 *               type: number
 *             conversionRate:
 *               type: number
 *         breakdown:
 *           type: object
 *           properties:
 *             bySource:
 *               type: array
 *               items:
 *                 type: object
 *             byMedium:
 *               type: array
 *               items:
 *                 type: object
 *             byCampaign:
 *               type: array
 *               items:
 *                 type: object
 *         timeline:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               clicks:
 *                 type: number
 *               conversions:
 *                 type: number
 * 
 *     ServiceResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *             statusCode:
 *               type: number
 *         metadata:
 *           type: object
 */

/**
 * @swagger
 * tags:
 *   - name: Marketing Campaigns
 *     description: Campaign management and analytics
 *   - name: UTM Tracking
 *     description: UTM parameter management and event tracking
 *   - name: Retargeting Pixels
 *     description: Retargeting pixel management and analytics
 */

/**
 * @swagger
 * /api/marketing/campaigns:
 *   post:
 *     tags: [Marketing Campaigns]
 *     summary: Create a new marketing campaign
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Summer Sale 2024"
 *               description:
 *                 type: string
 *                 example: "Promotional campaign for summer sale"
 *               type:
 *                 type: string
 *                 enum: [brand_awareness, lead_generation, sales, engagement, remarketing]
 *                 example: "sales"
 *               budget:
 *                 type: number
 *                 example: 5000
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               goals:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MarketingCampaign'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 *   get:
 *     tags: [Marketing Campaigns]
 *     summary: Get user's marketing campaigns
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of campaigns to return
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of campaigns to skip
 *     responses:
 *       200:
 *         description: Campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MarketingCampaign'
 */

/**
 * @swagger
 * /api/marketing/campaigns/{campaignId}:
 *   get:
 *     tags: [Marketing Campaigns]
 *     summary: Get campaign details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MarketingCampaign'
 *       404:
 *         description: Campaign not found
 * 
 *   put:
 *     tags: [Marketing Campaigns]
 *     summary: Update campaign
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
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
 *               budget:
 *                 type: number
 *               goals:
 *                 type: object
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *       404:
 *         description: Campaign not found
 * 
 *   delete:
 *     tags: [Marketing Campaigns]
 *     summary: Delete campaign
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 *       404:
 *         description: Campaign not found
 */

/**
 * @swagger
 * /api/marketing/campaigns/{campaignId}/dashboard:
 *   get:
 *     tags: [Marketing Campaigns]
 *     summary: Get campaign dashboard with analytics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CampaignDashboard'
 */

/**
 * @swagger
 * /api/marketing/campaigns/{campaignId}/qr-codes:
 *   post:
 *     tags: [Marketing Campaigns]
 *     summary: Add QR code to campaign
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodeId
 *             properties:
 *               qrCodeId:
 *                 type: string
 *                 description: QR code ID to associate
 *     responses:
 *       201:
 *         description: QR code added to campaign successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Campaign or QR code not found
 * 
 *   get:
 *     tags: [Marketing Campaigns]
 *     summary: Get campaign QR codes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 */

/**
 * @swagger
 * /api/marketing/utm:
 *   post:
 *     tags: [UTM Tracking]
 *     summary: Create UTM tracking
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodeId
 *               - originalUrl
 *               - utmSource
 *               - utmMedium
 *               - utmCampaign
 *             properties:
 *               qrCodeId:
 *                 type: string
 *               originalUrl:
 *                 type: string
 *                 example: "https://example.com/landing"
 *               utmSource:
 *                 type: string
 *                 example: "qr_code"
 *               utmMedium:
 *                 type: string
 *                 example: "print"
 *               utmCampaign:
 *                 type: string
 *                 example: "summer_sale"
 *               utmTerm:
 *                 type: string
 *               utmContent:
 *                 type: string
 *               campaignId:
 *                 type: string
 *     responses:
 *       201:
 *         description: UTM tracking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UTMTracking'
 */

/**
 * @swagger
 * /api/marketing/utm/generate-url:
 *   post:
 *     tags: [UTM Tracking]
 *     summary: Generate UTM URL
 *     description: Generate a URL with UTM parameters without creating a tracking record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalUrl
 *               - utmSource
 *               - utmMedium
 *               - utmCampaign
 *             properties:
 *               originalUrl:
 *                 type: string
 *                 example: "https://example.com"
 *               utmSource:
 *                 type: string
 *                 example: "qr_code"
 *               utmMedium:
 *                 type: string
 *                 example: "print"
 *               utmCampaign:
 *                 type: string
 *                 example: "summer_sale"
 *               utmTerm:
 *                 type: string
 *               utmContent:
 *                 type: string
 *     responses:
 *       200:
 *         description: UTM URL generated successfully
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
 *                     utmUrl:
 *                       type: string
 *                       example: "https://example.com?utm_source=qr_code&utm_medium=print&utm_campaign=summer_sale"
 */

/**
 * @swagger
 * /api/marketing/utm/events:
 *   post:
 *     tags: [UTM Tracking]
 *     summary: Track UTM event
 *     description: Record a UTM tracking event (click, conversion, etc.)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - utmTrackingId
 *               - eventType
 *             properties:
 *               utmTrackingId:
 *                 type: string
 *               eventType:
 *                 type: string
 *                 enum: [click, page_view, conversion, form_submit]
 *                 example: "click"
 *               metadata:
 *                 type: object
 *               sessionId:
 *                 type: string
 *               userAgent:
 *                 type: string
 *               ipAddress:
 *                 type: string
 *               referrer:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event tracked successfully
 */

/**
 * @swagger
 * /api/marketing/utm/{utmTrackingId}/analytics:
 *   get:
 *     tags: [UTM Tracking]
 *     summary: Get UTM analytics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: utmTrackingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UTMAnalytics'
 */

/**
 * @swagger
 * /api/marketing/pixels:
 *   post:
 *     tags: [Retargeting Pixels]
 *     summary: Create retargeting pixel
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pixelType
 *               - pixelId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Facebook Conversion Pixel"
 *               pixelType:
 *                 type: string
 *                 enum: [facebook, google, linkedin, twitter, custom]
 *                 example: "facebook"
 *               pixelId:
 *                 type: string
 *                 example: "123456789"
 *               qrCodeId:
 *                 type: string
 *               campaignId:
 *                 type: string
 *               configuration:
 *                 type: object
 *               triggerEvents:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["page_view", "purchase"]
 *     responses:
 *       201:
 *         description: Pixel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RetargetingPixel'
 * 
 *   get:
 *     tags: [Retargeting Pixels]
 *     summary: Get user's retargeting pixels
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Pixels retrieved successfully
 */

/**
 * @swagger
 * /api/marketing/pixels/generate-code:
 *   post:
 *     tags: [Retargeting Pixels]
 *     summary: Generate pixel code
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pixelType
 *               - pixelId
 *             properties:
 *               pixelType:
 *                 type: string
 *                 enum: [facebook, google, linkedin, twitter, custom]
 *                 example: "facebook"
 *               pixelId:
 *                 type: string
 *                 example: "123456789"
 *               customParameters:
 *                 type: object
 *                 description: Platform-specific parameters
 *     responses:
 *       200:
 *         description: Pixel code generated successfully
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
 *                     pixelCode:
 *                       type: string
 *                       description: Generated pixel tracking code
 *                     instructions:
 *                       type: string
 *                       description: Implementation instructions
 *                     testUrl:
 *                       type: string
 *                       description: URL to test pixel firing
 */

/**
 * @swagger
 * /api/marketing/pixels/fire:
 *   post:
 *     tags: [Retargeting Pixels]
 *     summary: Fire retargeting pixel event
 *     description: Record a pixel fire event for tracking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pixelId
 *               - eventType
 *             properties:
 *               pixelId:
 *                 type: string
 *               eventType:
 *                 type: string
 *                 example: "page_view"
 *               eventData:
 *                 type: object
 *               sessionId:
 *                 type: string
 *               userAgent:
 *                 type: string
 *               ipAddress:
 *                 type: string
 *               referrer:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pixel event recorded successfully
 */

/**
 * @swagger
 * /api/marketing/pixels/{pixelId}/analytics:
 *   get:
 *     tags: [Retargeting Pixels]
 *     summary: Get pixel analytics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: pixelId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                         eventBreakdown:
 *                           type: object
 *                         timeline:
 *                           type: array
 *                         performance:
 *                           type: object
 */

/**
 * @swagger
 * /api/marketing/overview:
 *   get:
 *     tags: [Marketing Campaigns]
 *     summary: Get marketing overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ServiceResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalCampaigns:
 *                               type: number
 *                             activeCampaigns:
 *                               type: number
 *                             totalBudget:
 *                               type: number
 *                             totalSpent:
 *                               type: number
 *                             totalImpressions:
 *                               type: number
 *                             totalClicks:
 *                               type: number
 *                             totalConversions:
 *                               type: number
 *                             overallCTR:
 *                               type: number
 *                             overallConversionRate:
 *                               type: number
 *                         campaigns:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MarketingCampaign'
 *                         recentActivity:
 *                           type: array
 *                           items:
 *                             type: object
 *                         performanceTrends:
 *                           type: object
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */