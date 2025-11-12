/**
 * @swagger
 * components:
 *   schemas:
 *     CustomDomain:
 *       type: object
 *       required:
 *         - domain
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique domain identifier
 *         userId:
 *           type: string
 *           format: uuid
 *           description: Owner user ID
 *         domain:
 *           type: string
 *           description: Domain name
 *           example: my-custom-domain.com
 *         subdomain:
 *           type: string
 *           nullable: true
 *           description: Optional subdomain
 *           example: qr
 *         status:
 *           type: string
 *           enum: [pending, active, failed, expired]
 *           description: Domain verification status
 *         type:
 *           type: string
 *           enum: [custom, subdomain]
 *           description: Domain type
 *         dnsConfigured:
 *           type: boolean
 *           description: Whether DNS is properly configured
 *         sslEnabled:
 *           type: boolean
 *           description: Whether SSL certificate is active
 *         verificationToken:
 *           type: string
 *           description: Token for domain verification
 *         verificationMethod:
 *           type: string
 *           enum: [dns, http, email]
 *           description: Method used for verification
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When domain was verified
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Domain expiration date
 *         autoRenew:
 *           type: boolean
 *           description: Whether to auto-renew domain
 *         wildcardEnabled:
 *           type: boolean
 *           description: Whether wildcard SSL is enabled
 *         metadata:
 *           type: object
 *           description: Additional domain metadata
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 *     DomainVerification:
 *       type: object
 *       required:
 *         - verificationType
 *         - verificationKey
 *         - verificationValue
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         domainId:
 *           type: string
 *           format: uuid
 *           description: Associated domain ID
 *         verificationType:
 *           type: string
 *           enum: [dns_txt, dns_cname, http_file, email]
 *           description: Type of verification
 *         verificationKey:
 *           type: string
 *           description: DNS record name or file path
 *         verificationValue:
 *           type: string
 *           description: Expected verification value
 *         status:
 *           type: string
 *           enum: [pending, verified, failed, expired]
 *           description: Verification status
 *         attempts:
 *           type: integer
 *           description: Number of verification attempts
 *         lastCheckAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     SSLCertificate:
 *       type: object
 *       required:
 *         - commonName
 *         - expiresAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         domainId:
 *           type: string
 *           format: uuid
 *         provider:
 *           type: string
 *           description: SSL provider (e.g., letsencrypt)
 *         commonName:
 *           type: string
 *           description: Certificate common name
 *         subjectAlternativeNames:
 *           type: array
 *           items:
 *             type: string
 *           description: Additional domain names
 *         issuedBy:
 *           type: string
 *           description: Certificate authority
 *         issuedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         autoRenew:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [pending, issued, expired, revoked, failed]
 *         fingerprint:
 *           type: string
 *           nullable: true
 *         keyAlgorithm:
 *           type: string
 *           description: Key algorithm (e.g., RSA)
 *         keySize:
 *           type: integer
 *           description: Key size in bits
 *
 *     WhiteLabelConfig:
 *       type: object
 *       required:
 *         - configName
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         configName:
 *           type: string
 *           description: Configuration name
 *           example: Corporate Branding
 *         isActive:
 *           type: boolean
 *           description: Whether configuration is active
 *         isDefault:
 *           type: boolean
 *           description: Whether this is the default configuration
 *         logoUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Company logo URL
 *         faviconUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Favicon URL
 *         companyName:
 *           type: string
 *           nullable: true
 *           description: Company name to display
 *         supportEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Support contact email
 *         supportUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Support page URL
 *         privacyPolicyUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         termsOfServiceUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         primaryColor:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Primary brand color
 *         secondaryColor:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Secondary brand color
 *         accentColor:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Accent color
 *         backgroundColor:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Background color
 *         textColor:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Text color
 *         fontFamily:
 *           type: string
 *           description: Font family
 *         customCss:
 *           type: string
 *           nullable: true
 *           description: Custom CSS styles
 *         customJavascript:
 *           type: string
 *           nullable: true
 *           description: Custom JavaScript code
 *         gtagId:
 *           type: string
 *           nullable: true
 *           description: Google Analytics ID
 *         metadata:
 *           type: object
 *           description: Additional configuration data
 *
 *     BrandAsset:
 *       type: object
 *       required:
 *         - assetType
 *         - assetName
 *         - filePath
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         whiteLabelConfigId:
 *           type: string
 *           format: uuid
 *         assetType:
 *           type: string
 *           enum: [logo, favicon, banner, background, watermark, font]
 *           description: Type of brand asset
 *         assetName:
 *           type: string
 *           description: Asset name
 *         filePath:
 *           type: string
 *           description: File storage path
 *         fileUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Public URL for asset
 *         fileSize:
 *           type: integer
 *           description: File size in bytes
 *         mimeType:
 *           type: string
 *           description: MIME type
 *         dimensions:
 *           type: string
 *           nullable: true
 *           description: Image dimensions
 *         altText:
 *           type: string
 *           nullable: true
 *           description: Alt text for accessibility
 *         isActive:
 *           type: boolean
 *         sortOrder:
 *           type: integer
 *           description: Display order
 *
 *     GDPRRequest:
 *       type: object
 *       required:
 *         - requestType
 *         - subjectEmail
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         requestType:
 *           type: string
 *           enum: [access, portability, rectification, erasure, restriction, objection]
 *           description: Type of GDPR request
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, rejected, cancelled]
 *           description: Request processing status
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: Request priority
 *         subjectEmail:
 *           type: string
 *           format: email
 *           description: Email of data subject
 *         requestDetails:
 *           type: string
 *           nullable: true
 *           description: Additional request details
 *         verificationToken:
 *           type: string
 *           nullable: true
 *           description: Email verification token
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         legalBasis:
 *           type: string
 *           nullable: true
 *           description: Legal basis for processing
 *         dataCategories:
 *           type: array
 *           items:
 *             type: string
 *           description: Categories of personal data involved
 *         processingNotes:
 *           type: string
 *           nullable: true
 *           description: Internal processing notes
 *         exportFilePath:
 *           type: string
 *           nullable: true
 *           description: Path to exported data file
 *         exportFormat:
 *           type: string
 *           enum: [json, xml, csv, pdf]
 *           description: Format of data export
 *         deadlineDate:
 *           type: string
 *           format: date-time
 *           description: Legal deadline for response
 *         processingStartedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         processingCompletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         auditTrail:
 *           type: array
 *           items:
 *             type: object
 *           description: Audit trail of actions taken
 *
 *     UserConsent:
 *       type: object
 *       required:
 *         - consentType
 *         - consentCategory
 *         - purposeDescription
 *         - legalBasis
 *         - consentGiven
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         consentType:
 *           type: string
 *           description: Type of consent
 *         consentCategory:
 *           type: string
 *           description: Category of consent
 *         purposeDescription:
 *           type: string
 *           description: Purpose for data processing
 *         legalBasis:
 *           type: string
 *           description: Legal basis for processing
 *         dataCategories:
 *           type: array
 *           items:
 *             type: string
 *           description: Categories of personal data
 *         retentionPeriodDays:
 *           type: integer
 *           nullable: true
 *           description: Data retention period in days
 *         consentGiven:
 *           type: boolean
 *           description: Whether consent was given
 *         consentDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         consentMethod:
 *           type: string
 *           nullable: true
 *           description: How consent was obtained
 *         withdrawalDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         withdrawalMethod:
 *           type: string
 *           nullable: true
 *         version:
 *           type: string
 *           description: Consent version
 *         thirdPartySharing:
 *           type: boolean
 *           description: Whether data is shared with third parties
 *         thirdParties:
 *           type: array
 *           items:
 *             type: object
 *           description: List of third parties data is shared with
 *         automatedProcessing:
 *           type: boolean
 *           description: Whether automated processing is involved
 *         profilingEnabled:
 *           type: boolean
 *           description: Whether profiling is enabled
 *         optOutAvailable:
 *           type: boolean
 *           description: Whether opt-out is available
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         isActive:
 *           type: boolean
 *
 *     UserPrivacySettings:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         analyticsEnabled:
 *           type: boolean
 *           description: Whether analytics tracking is enabled
 *         marketingEmailsEnabled:
 *           type: boolean
 *           description: Whether marketing emails are allowed
 *         productEmailsEnabled:
 *           type: boolean
 *           description: Whether product emails are allowed
 *         smsNotificationsEnabled:
 *           type: boolean
 *           description: Whether SMS notifications are allowed
 *         pushNotificationsEnabled:
 *           type: boolean
 *           description: Whether push notifications are allowed
 *         thirdPartySharingEnabled:
 *           type: boolean
 *           description: Whether third-party sharing is allowed
 *         personalizationEnabled:
 *           type: boolean
 *           description: Whether personalization is enabled
 *         locationTrackingEnabled:
 *           type: boolean
 *           description: Whether location tracking is allowed
 *         cookiePreferences:
 *           type: object
 *           description: Cookie preferences
 *           properties:
 *             necessary:
 *               type: boolean
 *             analytics:
 *               type: boolean
 *             marketing:
 *               type: boolean
 *             preferences:
 *               type: boolean
 *         dataRetentionPreferences:
 *           type: object
 *           description: Data retention preferences
 *         visibilitySettings:
 *           type: object
 *           description: Profile and data visibility settings
 *         downloadFormatPreference:
 *           type: string
 *           enum: [json, xml, csv, pdf]
 *           description: Preferred format for data exports
 *         languagePreference:
 *           type: string
 *           description: Language preference code
 *         timezonePreference:
 *           type: string
 *           description: Timezone preference
 *         securityPreferences:
 *           type: object
 *           description: Security and authentication preferences
 *         exportFrequency:
 *           type: string
 *           enum: [manual, weekly, monthly, quarterly]
 *           description: Automatic data export frequency
 *         autoDeleteEnabled:
 *           type: boolean
 *           description: Whether automatic data deletion is enabled
 *         autoDeletePeriodDays:
 *           type: integer
 *           description: Auto-delete period in days
 *
 *     DataProcessingLog:
 *       type: object
 *       required:
 *         - processingType
 *         - operation
 *         - purpose
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         processingType:
 *           type: string
 *           description: Type of data processing
 *         operation:
 *           type: string
 *           description: Specific operation performed
 *         dataSubjectId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         dataCategories:
 *           type: array
 *           items:
 *             type: string
 *           description: Categories of data processed
 *         legalBasis:
 *           type: string
 *           nullable: true
 *           description: Legal basis for processing
 *         purpose:
 *           type: string
 *           description: Purpose of processing
 *         processorSystem:
 *           type: string
 *           nullable: true
 *           description: System that performed processing
 *         processorUserId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         ipAddress:
 *           type: string
 *           nullable: true
 *         userAgent:
 *           type: string
 *           nullable: true
 *         sessionId:
 *           type: string
 *           nullable: true
 *         dataBefore:
 *           type: object
 *           nullable: true
 *           description: Data state before processing
 *         dataAfter:
 *           type: object
 *           nullable: true
 *           description: Data state after processing
 *         retentionPeriodDays:
 *           type: integer
 *           nullable: true
 *         encryptionUsed:
 *           type: boolean
 *           description: Whether encryption was used
 *         anonymizationApplied:
 *           type: boolean
 *           description: Whether data was anonymized
 *         thirdPartyInvolved:
 *           type: boolean
 *           description: Whether third parties were involved
 *         complianceStatus:
 *           type: string
 *           enum: [compliant, review_required, violation]
 *           description: Compliance status
 *         auditNotes:
 *           type: string
 *           nullable: true
 *         automatedProcess:
 *           type: boolean
 *           description: Whether processing was automated
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           description: Risk level of processing
 *         crossBorderTransfer:
 *           type: boolean
 *           description: Whether data was transferred across borders
 *         transferSafeguards:
 *           type: string
 *           nullable: true
 *           description: Safeguards for international transfers
 *         timestamp:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 * tags:
 *   - name: Custom Domains
 *     description: Custom domain management and SSL configuration
 *   - name: White Label
 *     description: White label branding and customization
 *   - name: GDPR
 *     description: GDPR compliance and data protection
 */

/**
 * @swagger
 * /api/domains:
 *   get:
 *     tags: [Custom Domains]
 *     summary: List user's custom domains
 *     description: Retrieve all custom domains for the authenticated user with their verification and SSL status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter by domain status
 *         schema:
 *           type: string
 *           enum: [pending, active, failed, expired]
 *       - name: type
 *         in: query
 *         description: Filter by domain type
 *         schema:
 *           type: string
 *           enum: [custom, subdomain]
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Number of items per page
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Domains retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomDomain'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *   post:
 *     tags: [Custom Domains]
 *     summary: Add a new custom domain
 *     description: Register a new custom domain for the user and initiate verification process
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - type
 *             properties:
 *               domain:
 *                 type: string
 *                 description: Domain name to add
 *                 example: my-custom-domain.com
 *               subdomain:
 *                 type: string
 *                 description: Optional subdomain prefix
 *                 example: qr
 *               type:
 *                 type: string
 *                 enum: [custom, subdomain]
 *                 description: Type of domain
 *               verificationMethod:
 *                 type: string
 *                 enum: [dns, http, email]
 *                 default: dns
 *                 description: Preferred verification method
 *               autoRenew:
 *                 type: boolean
 *                 default: true
 *                 description: Enable automatic renewal
 *               wildcardEnabled:
 *                 type: boolean
 *                 default: false
 *                 description: Enable wildcard SSL certificate
 *     responses:
 *       201:
 *         description: Domain added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CustomDomain'
 *       409:
 *         description: Domain already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/domains/{id}:
 *   get:
 *     tags: [Custom Domains]
 *     summary: Get domain details
 *     description: Retrieve detailed information about a specific custom domain
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Domain ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Domain details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CustomDomain'
 *   put:
 *     tags: [Custom Domains]
 *     summary: Update domain configuration
 *     description: Update domain settings and configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoRenew:
 *                 type: boolean
 *               wildcardEnabled:
 *                 type: boolean
 *               redirectType:
 *                 type: string
 *                 enum: ['301', '302']
 *               wwwRedirect:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Domain updated successfully
 *   delete:
 *     tags: [Custom Domains]
 *     summary: Remove custom domain
 *     description: Delete a custom domain and revoke SSL certificates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Domain deleted successfully
 *
 * /api/domains/{id}/verify:
 *   post:
 *     tags: [Custom Domains]
 *     summary: Verify domain ownership
 *     description: Initiate or check domain verification status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Verification status checked
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
 *                     verified:
 *                       type: boolean
 *                     verificationRecords:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DomainVerification'
 *
 * /api/domains/{id}/ssl:
 *   get:
 *     tags: [Custom Domains]
 *     summary: Get SSL certificate status
 *     description: Retrieve SSL certificate information for domain
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: SSL certificate information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SSLCertificate'
 *   post:
 *     tags: [Custom Domains]
 *     summary: Issue SSL certificate
 *     description: Request a new SSL certificate for the domain
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 default: letsencrypt
 *               validationMethod:
 *                 type: string
 *                 enum: [http, dns, email]
 *                 default: http
 *               includeWildcard:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: SSL certificate request initiated
 *
 * /api/white-label:
 *   get:
 *     tags: [White Label]
 *     summary: List white label configurations
 *     description: Retrieve all white label configurations for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: active
 *         in: query
 *         description: Filter by active status
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Configurations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WhiteLabelConfig'
 *   post:
 *     tags: [White Label]
 *     summary: Create white label configuration
 *     description: Create a new white label branding configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configName
 *             properties:
 *               configName:
 *                 type: string
 *                 description: Configuration name
 *               companyName:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *               primaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               secondaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               supportEmail:
 *                 type: string
 *                 format: email
 *               customCss:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Configuration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WhiteLabelConfig'
 *
 * /api/white-label/{id}:
 *   get:
 *     tags: [White Label]
 *     summary: Get white label configuration
 *     description: Retrieve a specific white label configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WhiteLabelConfig'
 *   put:
 *     tags: [White Label]
 *     summary: Update white label configuration
 *     description: Update an existing white label configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               configName:
 *                 type: string
 *               companyName:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *               primaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               secondaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               customCss:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *   delete:
 *     tags: [White Label]
 *     summary: Delete white label configuration
 *     description: Remove a white label configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Configuration deleted successfully
 *
 * /api/white-label/{id}/assets:
 *   get:
 *     tags: [White Label]
 *     summary: List brand assets
 *     description: Retrieve brand assets for a white label configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: type
 *         in: query
 *         description: Filter by asset type
 *         schema:
 *           type: string
 *           enum: [logo, favicon, banner, background, watermark, font]
 *     responses:
 *       200:
 *         description: Brand assets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BrandAsset'
 *   post:
 *     tags: [White Label]
 *     summary: Upload brand asset
 *     description: Upload a new brand asset
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - assetType
 *               - assetName
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               assetType:
 *                 type: string
 *                 enum: [logo, favicon, banner, background, watermark, font]
 *               assetName:
 *                 type: string
 *               altText:
 *                 type: string
 *               usageContext:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset uploaded successfully
 *
 * /api/white-label/{id}/preview:
 *   get:
 *     tags: [White Label]
 *     summary: Preview white label design
 *     description: Generate a preview of the white label configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: template
 *         in: query
 *         description: Preview template type
 *         schema:
 *           type: string
 *           enum: [dashboard, qr_page, landing_page]
 *           default: dashboard
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     previewUrl:
 *                       type: string
 *                     cssVariables:
 *                       type: object
 *
 * /api/gdpr/requests:
 *   get:
 *     tags: [GDPR]
 *     summary: List GDPR requests
 *     description: Retrieve GDPR requests with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter by request status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, rejected, cancelled]
 *       - name: type
 *         in: query
 *         description: Filter by request type
 *         schema:
 *           type: string
 *           enum: [access, portability, rectification, erasure, restriction, objection]
 *       - name: priority
 *         in: query
 *         description: Filter by priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: GDPR requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GDPRRequest'
 *                 pagination:
 *                   type: object
 *   post:
 *     tags: [GDPR]
 *     summary: Create GDPR request
 *     description: Submit a new GDPR data request
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestType
 *               - subjectEmail
 *             properties:
 *               requestType:
 *                 type: string
 *                 enum: [access, portability, rectification, erasure, restriction, objection]
 *               subjectEmail:
 *                 type: string
 *                 format: email
 *               requestDetails:
 *                 type: string
 *                 description: Additional details about the request
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *               dataCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Categories of data involved
 *               legalBasis:
 *                 type: string
 *                 description: Legal basis for the request
 *     responses:
 *       201:
 *         description: GDPR request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GDPRRequest'
 *
 * /api/gdpr/requests/{id}:
 *   get:
 *     tags: [GDPR]
 *     summary: Get GDPR request details
 *     description: Retrieve detailed information about a GDPR request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: GDPR request details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GDPRRequest'
 *   put:
 *     tags: [GDPR]
 *     summary: Update GDPR request
 *     description: Update GDPR request status and processing information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, rejected, cancelled]
 *               processingNotes:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *     responses:
 *       200:
 *         description: GDPR request updated successfully
 *
 * /api/gdpr/requests/{id}/verify:
 *   post:
 *     tags: [GDPR]
 *     summary: Verify GDPR request
 *     description: Verify the identity for a GDPR request using verification token
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verificationToken
 *             properties:
 *               verificationToken:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       200:
 *         description: GDPR request verified successfully
 *
 * /api/gdpr/requests/{id}/export:
 *   get:
 *     tags: [GDPR]
 *     summary: Download data export
 *     description: Download the exported data for a completed GDPR request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: format
 *         in: query
 *         description: Export format
 *         schema:
 *           type: string
 *           enum: [json, xml, csv, pdf]
 *           default: json
 *     responses:
 *       200:
 *         description: Data export file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           application/xml:
 *             schema:
 *               type: string
 *           text/csv:
 *             schema:
 *               type: string
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /api/gdpr/consents:
 *   get:
 *     tags: [GDPR]
 *     summary: List user consents
 *     description: Retrieve user consent records with filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: consentType
 *         in: query
 *         description: Filter by consent type
 *         schema:
 *           type: string
 *       - name: consentCategory
 *         in: query
 *         description: Filter by consent category
 *         schema:
 *           type: string
 *       - name: consentGiven
 *         in: query
 *         description: Filter by consent status
 *         schema:
 *           type: boolean
 *       - name: isActive
 *         in: query
 *         description: Filter by active status
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: User consents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserConsent'
 *   post:
 *     tags: [GDPR]
 *     summary: Record user consent
 *     description: Record or update user consent for data processing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consentType
 *               - consentCategory
 *               - purposeDescription
 *               - legalBasis
 *               - consentGiven
 *             properties:
 *               consentType:
 *                 type: string
 *               consentCategory:
 *                 type: string
 *               purposeDescription:
 *                 type: string
 *               legalBasis:
 *                 type: string
 *               consentGiven:
 *                 type: boolean
 *               dataCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *               retentionPeriodDays:
 *                 type: integer
 *               thirdPartySharing:
 *                 type: boolean
 *               automatedProcessing:
 *                 type: boolean
 *               profilingEnabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Consent recorded successfully
 *
 * /api/gdpr/privacy-settings:
 *   get:
 *     tags: [GDPR]
 *     summary: Get user privacy settings
 *     description: Retrieve current privacy settings for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Privacy settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserPrivacySettings'
 *   put:
 *     tags: [GDPR]
 *     summary: Update privacy settings
 *     description: Update user privacy preferences and settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               analyticsEnabled:
 *                 type: boolean
 *               marketingEmailsEnabled:
 *                 type: boolean
 *               productEmailsEnabled:
 *                 type: boolean
 *               smsNotificationsEnabled:
 *                 type: boolean
 *               thirdPartySharingEnabled:
 *                 type: boolean
 *               personalizationEnabled:
 *                 type: boolean
 *               locationTrackingEnabled:
 *                 type: boolean
 *               cookiePreferences:
 *                 type: object
 *               dataRetentionPreferences:
 *                 type: object
 *               visibilitySettings:
 *                 type: object
 *               downloadFormatPreference:
 *                 type: string
 *                 enum: [json, xml, csv, pdf]
 *               languagePreference:
 *                 type: string
 *               timezonePreference:
 *                 type: string
 *               autoDeleteEnabled:
 *                 type: boolean
 *               autoDeletePeriodDays:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Privacy settings updated successfully
 *
 * /api/gdpr/processing-logs:
 *   get:
 *     tags: [GDPR]
 *     summary: Get data processing logs
 *     description: Retrieve data processing audit logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: processingType
 *         in: query
 *         description: Filter by processing type
 *         schema:
 *           type: string
 *       - name: operation
 *         in: query
 *         description: Filter by operation
 *         schema:
 *           type: string
 *       - name: complianceStatus
 *         in: query
 *         description: Filter by compliance status
 *         schema:
 *           type: string
 *           enum: [compliant, review_required, violation]
 *       - name: startDate
 *         in: query
 *         description: Start date for filtering
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         description: End date for filtering
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Processing logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DataProcessingLog'
 *                 pagination:
 *                   type: object
 *
 * /api/gdpr/compliance-report:
 *   get:
 *     tags: [GDPR]
 *     summary: Generate compliance report
 *     description: Generate a comprehensive GDPR compliance report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         required: true
 *         description: Report start date
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         required: true
 *         description: Report end date
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: format
 *         in: query
 *         description: Report format
 *         schema:
 *           type: string
 *           enum: [json, pdf, xlsx]
 *           default: json
 *       - name: includePersonalData
 *         in: query
 *         description: Whether to include personal data details
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Compliance report generated successfully
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
 *                     reportId:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     period:
 *                       type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRequests:
 *                           type: integer
 *                         completedRequests:
 *                           type: integer
 *                         pendingRequests:
 *                           type: integer
 *                         averageResponseTime:
 *                           type: number
 *                         complianceScore:
 *                           type: number
 *                     requestsByType:
 *                       type: object
 *                     processingActivities:
 *                       type: array
 *                     complianceIssues:
 *                       type: array
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

// Export business tools schemas for inclusion in main swagger config
export const businessToolsSchemas = {
  CustomDomain: {
    type: 'object',
    // Schema definition included in swagger comments above
  },
  WhiteLabelConfig: {
    type: 'object',
    // Schema definition included in swagger comments above
  },
  GDPRRequest: {
    type: 'object',
    // Schema definition included in swagger comments above
  },
  UserConsent: {
    type: 'object',
    // Schema definition included in swagger comments above
  },
  UserPrivacySettings: {
    type: 'object',
    // Schema definition included in swagger comments above
  },
  DataProcessingLog: {
    type: 'object',
    // Schema definition included in swagger comments above
  }
};