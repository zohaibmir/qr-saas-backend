export const contentConfig = {
  // Server Configuration
  port: parseInt(process.env.CONTENT_SERVICE_PORT || '3011'),
  host: process.env.HOST || '0.0.0.0',
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Configuration
  apiPrefix: '/api/v1',
  
  // File Upload Configuration
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    allowedDocumentTypes: ['application/pdf', 'text/plain', 'application/msword'],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    maxFiles: 10,
  },
  
  // Rich Text Editor Configuration
  editor: {
    maxContentLength: 1024 * 1024, // 1MB
    allowedFormats: [
      'bold', 'italic', 'underline', 'strike',
      'header', 'blockquote', 'code-block',
      'list', 'bullet', 'indent',
      'link', 'image', 'video',
      'align', 'color', 'background'
    ],
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  },
  
  // Content Configuration
  content: {
    maxTitleLength: 500,
    maxExcerptLength: 1000,
    maxSlugLength: 500,
    defaultPageSize: 20,
    maxPageSize: 100,
    autoGenerateExcerpt: true,
    excerptLength: 250,
  },
  
  // SEO Configuration
  seo: {
    maxMetaTitleLength: 60,
    maxMetaDescriptionLength: 160,
    maxKeywords: 10,
    generateSitemap: true,
    sitemapUpdateFrequency: 'daily', // daily, weekly, monthly
  },
  
  // Cache Configuration
  cache: {
    enabled: process.env.NODE_ENV === 'production',
    ttl: 300, // 5 minutes
    checkperiod: 120,
  },
  
  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  // AWS S3 Configuration (for file storage)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET || 'qr-saas-content',
  },
  
  // Email Configuration (for notifications)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@qrsaas.com',
  },
  
  // Analytics Configuration
  analytics: {
    trackViews: true,
    trackEngagement: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  },
  
  // Image Processing Configuration
  imageProcessing: {
    quality: 85,
    thumbnailSizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 800, height: 600 },
    ],
    watermark: {
      enabled: false,
      text: 'QR SaaS',
      opacity: 0.5,
      position: 'bottom-right',
    },
  },
  
  // Backup Configuration
  backup: {
    enabled: process.env.NODE_ENV === 'production',
    schedule: '0 2 * * *', // Daily at 2 AM
    retentionDays: 30,
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'combined',
  },
};

export default contentConfig;