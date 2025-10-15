# QR Service

Advanced QR code generation service with support for multiple types, bulk generation, Swish payments, and comprehensive customization.

## 🎯 Purpose
- **QR Code Generation**: Multiple QR code types with customization
- **Bulk Operations**: CSV-based bulk QR generation
- **Payment Integration**: Swish payment QR codes
- **Customization**: Logo, colors, frames, patterns
- **Validity Management**: Expiration, scan limits, password protection

## ✅ Features
- ✅ **Multiple QR Types**: URL, Text, Email, SMS, Phone, vCard, WiFi, Swish payments
- ✅ **Bulk Generation**: CSV processing with template system
- ✅ **Swish Payments**: Swedish mobile payment integration
- ✅ **Advanced Customization**: Logo overlay, colors, frames, patterns
- ✅ **Validity Controls**: Expiration, scan limits, scheduling, passwords
- ✅ **Subscription Limits**: Feature restrictions based on user tier
- ✅ **High-Quality Output**: Professional QR code generation

## 💳 Swish Payment Integration
- ✅ **Swedish Market Ready**: Full Swish payment protocol support
- ✅ **Phone Validation**: Swedish format (+46XXXXXXXXX)
- ✅ **Amount Limits**: 1-150,000 SEK with validation
- ✅ **Message Support**: Up to 50 characters
- ✅ **URL Generation**: `swish://payment?phone=X&amount=Y&message=Z`

## 📁 Structure
```
src/
├── index.ts            # Service entry point
├── config/            # Configuration files
├── interfaces/        # TypeScript interfaces
├── repositories/      # Data access layer
│   ├── qr.repository.ts
│   └── bulk-qr.repository.ts
├── services/          # Business logic layer
│   ├── qr.service.ts
│   ├── bulk-qr.service.ts
│   ├── customization.service.ts
│   └── validity.service.ts
├── routes/            # API route handlers
├── tests/             # Unit tests (80+ tests)
└── utils/             # Utility functions
```

## 🎨 QR Code Types
### Basic Types
- **URL**: Web links and redirects
- **Text**: Plain text content
- **Email**: Email with subject and body
- **SMS**: Text message with recipient
- **Phone**: Phone number for calling
- **vCard**: Contact information
- **WiFi**: Network credentials

### Advanced Types
- **Swish**: Swedish mobile payments
- **Location**: GPS coordinates
- **Social Media**: Direct social links

## 🎨 Customization Features
- **Logo Integration**: Professional logo overlay with positioning
- **Color Schemes**: Foreground, background, gradient support
- **Frame Designs**: Square, rounded, circular, decorative frames
- **Pattern Styles**: Dot, square, rounded module patterns
- **Eye Patterns**: Custom finder pattern designs
- **Size Options**: Flexible sizing (100-2000px)
- **Transparency**: Background transparency support

## 📊 Bulk Generation
```
Features:
├── CSV Processing      # Parse and validate CSV data
├── Template System     # Pre-built and custom templates
├── Batch Management    # Track bulk operations
├── Progress Monitoring # Real-time status updates
├── Error Handling     # Detailed error reporting
└── Export Options     # ZIP download of generated QRs
```

## 🔧 Development
```bash
# Start in development mode
npm run dev

# Build the service
npm run build

# Run tests (80+ tests)
npm test

# Test specific functionality
npm test -- --testNamePattern="Swish"
npm test -- --testNamePattern="Bulk"
```

## 🌐 API Endpoints
### QR Code Management
- `POST /qr` - Create QR code
- `GET /qr/:id` - Get QR code details
- `PUT /qr/:id` - Update QR code
- `DELETE /qr/:id` - Delete QR code
- `GET /qr/user/:userId` - Get user's QR codes
- `GET /qr/:id/image` - Generate QR image

### Bulk Operations
- `POST /bulk/upload` - Upload CSV for bulk generation
- `GET /bulk/templates` - Get available templates
- `POST /bulk/generate` - Start bulk generation
- `GET /bulk/status/:batchId` - Check batch status
- `GET /bulk/download/:batchId` - Download generated QRs

### Validity Management
- `POST /qr/:id/validity` - Set validity rules
- `GET /qr/:id/scan/:scanId` - Validate scan attempt
- `PUT /qr/:id/password` - Set password protection

## 🗄️ Database Schema
```sql
-- QR Codes
qr_codes (
  id, user_id, short_id, name, type, content, design_config,
  target_url, expires_at, max_scans, current_scans, password_hash,
  valid_schedule, is_active, created_at, updated_at
)

-- Bulk Templates
qr_bulk_templates (
  id, name, description, fields, category, tier_required
)

-- Bulk Batches
qr_bulk_batches (
  id, user_id, template_id, status, total_items, processed_items,
  created_at, completed_at
)
```

## 🔐 Security & Validation
- **Input Sanitization**: All user inputs validated
- **Password Protection**: Bcrypt hashing for QR passwords
- **Rate Limiting**: Bulk generation limits per tier
- **File Validation**: CSV format and size validation
- **Subscription Enforcement**: Feature restrictions by tier

## 📝 Configuration
Environment variables:
- `PORT` - Service port (default: 3002)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for caching
- `UPLOAD_PATH` - File upload directory
- `MAX_BULK_SIZE` - Maximum bulk generation size