# File Service

Comprehensive file upload and storage management service for QR code assets, logos, and generated content.

## 🎯 Purpose
- **File Upload**: Handle file uploads for QR customization
- **Asset Management**: Logo and image storage for QR codes
- **Generated Content**: Store generated QR images and reports
- **File Processing**: Image optimization and validation
- **Storage Management**: Organize and manage file storage

## ✅ Features
- ✅ **Multi-format Support**: Images (PNG, JPG, SVG), documents (PDF)
- ✅ **File Validation**: Size limits, format validation, security checks
- ✅ **Image Processing**: Resize, compress, format conversion
- ✅ **Asset Organization**: Structured storage by user and type
- ✅ **Secure Access**: Authentication and authorization
- ✅ **Storage Optimization**: Automatic cleanup and space management

## 📁 Structure
```
src/
├── app.ts              # Express app configuration
├── index.ts            # Service entry point
├── config/            # Configuration files
├── infrastructure/    # External service integrations
├── interfaces/        # TypeScript interfaces
├── providers/         # Storage provider implementations
├── repositories/      # Data access layer
├── services/          # Business logic layer
└── utils/             # File processing utilities

uploads/               # Local file storage
├── logos/            # QR code logos
├── generated/        # Generated QR images
├── reports/          # Analytics reports
└── temp/             # Temporary files
```

## 📤 File Types Supported
### Images
- **PNG**: Transparent backgrounds, high quality
- **JPG/JPEG**: Compressed images, web optimized
- **SVG**: Vector graphics, scalable logos
- **GIF**: Animated graphics (limited support)

### Documents
- **PDF**: Generated reports and documentation

### Generated Content
- **QR Images**: PNG format QR codes
- **Reports**: Excel, PDF analytics reports
- **Bulk Exports**: ZIP files with multiple QRs

## 🔧 Development
```bash
# Start in development mode
npm run dev

# Build the service
npm run build

# Run tests
npm test
```

## 🌐 API Endpoints
### File Upload
- `POST /files/upload` - Upload single file
- `POST /files/upload/multiple` - Upload multiple files
- `POST /files/upload/logo` - Upload QR code logo

### File Management
- `GET /files/:fileId` - Get file details
- `GET /files/download/:fileId` - Download file
- `DELETE /files/:fileId` - Delete file
- `GET /files/user/:userId` - Get user's files

### Image Processing
- `POST /files/resize` - Resize image
- `POST /files/compress` - Compress image
- `POST /files/convert` - Convert image format

### Storage Management
- `GET /files/storage/usage` - Get storage usage
- `DELETE /files/cleanup/temp` - Cleanup temporary files
- `GET /files/storage/stats` - Storage statistics

## 🛡️ Security Features
### File Validation
- **Size Limits**: Configurable per file type
- **Format Validation**: Strict MIME type checking
- **Virus Scanning**: Optional virus scanning integration
- **Content Inspection**: Validate file contents

### Access Control
- **Authentication**: JWT-based file access
- **User Isolation**: Files isolated by user
- **Permission Checks**: Verify file ownership
- **Secure URLs**: Temporary access URLs

## 📊 Storage Management
### Organization
```
uploads/
├── users/
│   └── {userId}/
│       ├── logos/          # User logos
│       ├── generated/      # Generated QRs
│       └── reports/        # User reports
├── public/                 # Public assets
├── temp/                   # Temporary files
└── system/                 # System files
```

### Cleanup Strategy
- **Temporary Files**: Auto-delete after 24 hours
- **Generated QRs**: Keep for 30 days unless saved
- **Reports**: Keep for 90 days
- **User Uploads**: Keep until user deletion

## 🔧 Image Processing
### Optimization
- **Automatic Compression**: Reduce file sizes
- **Format Conversion**: Convert to optimal formats
- **Thumbnail Generation**: Create preview images
- **Watermarking**: Optional watermark application

### Validation
- **Dimension Limits**: Maximum width/height
- **File Size Limits**: Per-tier storage limits
- **Format Support**: Whitelist approved formats
- **Content Validation**: Ensure valid image data

## 📝 Configuration
Environment variables:
- `PORT` - Service port (default: 3004)
- `UPLOAD_PATH` - Base upload directory
- `MAX_FILE_SIZE` - Maximum file size limit
- `ALLOWED_FORMATS` - Comma-separated allowed formats
- `STORAGE_PROVIDER` - Storage provider (local/cloud)
- `CLEANUP_INTERVAL` - Automatic cleanup interval
- `IMAGE_QUALITY` - Default image compression quality

## 🚀 Future Enhancements
### Cloud Storage
- **AWS S3**: Scalable cloud storage
- **Google Cloud Storage**: Alternative cloud option
- **CDN Integration**: Global content delivery
- **Backup Strategy**: Automated backups

### Advanced Processing
- **Image Recognition**: Automatic tagging
- **AI Enhancement**: Image quality improvement
- **Batch Processing**: Bulk image operations
- **Format Optimization**: Smart format selection