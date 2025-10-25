# Landing Page Service

A comprehensive microservice for managing QR code landing pages with A/B testing, form management, and analytics integration.

## 🚀 Features

### ✅ Landing Page Management
- **Template System**: Pre-built and custom landing page templates
- **Page Builder**: Create and customize landing pages for QR codes
- **Content Management**: Rich text content, images, and media support
- **Responsive Design**: Mobile-first, responsive landing pages

### ✅ A/B Testing
- **Split Testing**: Create and manage A/B tests for landing pages
- **Performance Tracking**: Track conversion rates and user engagement
- **Statistical Analysis**: Built-in statistical significance testing
- **Winner Selection**: Automatic winner selection based on performance

### ✅ Form Management
- **Form Builder**: Create custom forms for lead capture
- **Field Validation**: Built-in validation for form fields
- **Submission Tracking**: Track and manage form submissions
- **Integration Ready**: Ready for CRM and email marketing integrations

### ✅ Analytics Integration
- **Page Analytics**: Track page views, bounce rates, and engagement
- **Conversion Tracking**: Monitor form submissions and goal completions
- **User Behavior**: Track user interactions and behavior patterns
- **Real-time Metrics**: Live analytics dashboard integration

### ✅ Social Media Integration
- **Social Sharing**: Built-in social media sharing capabilities
- **Open Graph**: Automatic Open Graph meta tag generation
- **Social Analytics**: Track social media referrals and engagement

### ✅ Custom Domains
- **Domain Management**: Support for custom domains and subdomains
- **SSL Support**: Automatic SSL certificate management
- **Domain Verification**: Built-in domain verification system

## 🏗️ Architecture

This service follows Clean Architecture principles with SOLID design patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                 Landing Page Service                        │
├─────────────────────────────────────────────────────────────┤
│  Controllers │  Services   │  Repositories │  Infrastructure │
│  ────────────┼─────────────┼───────────────┼─────────────────│
│  • Pages     │  • Template │  • Page Repo  │  • Database     │
│  • Templates │  • A/B Test │  • Form Repo  │  • File System  │
│  • Forms     │  • Analytics│  • Analytics  │  • External APIs│
│  • Analytics │  • Domain   │  • Domain     │  • Cache        │
│  • Domains   │  • Social   │  • Social     │  • Validation   │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with Clean Architecture
- **Database**: PostgreSQL with optimized schema
- **Caching**: Redis for performance optimization
- **Security**: Helmet, CORS, Rate limiting
- **Validation**: Built-in request validation
- **Testing**: Jest with comprehensive test coverage
- **Logging**: Winston for structured logging

## 📊 Database Schema

### Core Tables

```sql
-- Landing Page Templates
landing_page_templates (
  id, name, description, template_type, content, 
  styles, settings, is_system_template, is_active,
  usage_count, created_at, updated_at
)

-- Landing Pages
landing_pages (
  id, user_id, qr_code_id, template_id, name, slug,
  title, description, content, styles, settings,
  custom_domain_id, is_published, published_at,
  seo_title, seo_description, social_image_id,
  created_at, updated_at
)

-- A/B Testing
landing_page_ab_tests (
  id, page_id, name, description, variant_a_content,
  variant_b_content, traffic_split, status,
  start_date, end_date, winner_variant, confidence_level,
  created_at, updated_at
)

-- Form Management
landing_page_forms (
  id, page_id, name, fields, validation_rules,
  submit_url, success_message, error_message,
  is_active, created_at, updated_at
)

-- Form Submissions
landing_page_form_submissions (
  id, form_id, page_id, submission_data, ip_address,
  user_agent, referrer, submitted_at
)

-- Custom Domains
landing_page_custom_domains (
  id, user_id, domain, subdomain, is_verified,
  verification_token, ssl_status, dns_records,
  created_at, updated_at
)

-- Analytics
landing_page_analytics (
  id, page_id, event_type, event_data, ip_address,
  user_agent, referrer, session_id, created_at
)

-- Social Media
landing_page_social_shares (
  id, page_id, platform, share_count, last_updated
)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation
```bash
# Navigate to service directory
cd services/landing-page-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations (if available)
npm run migrate

# Start development server
npm run dev
```

### Environment Variables
```bash
# Server Configuration
PORT=3010
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://qr_user:qr_password@localhost:5432/qr_saas
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=qr_saas
DATABASE_USER=qr_user
DATABASE_PASSWORD=qr_password

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp

# Security
JWT_SECRET=your-jwt-secret-key
BCRYPT_ROUNDS=12

# External Services
EMAIL_SERVICE_URL=http://localhost:3005
FILE_SERVICE_URL=http://localhost:3004
ANALYTICS_SERVICE_URL=http://localhost:3003
```

## 📡 API Endpoints

### Landing Pages
```bash
GET    /pages                    # Get user's landing pages
POST   /pages                    # Create new landing page
GET    /pages/:id                # Get specific landing page
PUT    /pages/:id                # Update landing page
DELETE /pages/:id                # Delete landing page
PUT    /pages/:id/publish        # Publish/unpublish page
```

### Templates
```bash
GET    /templates                # Get available templates
GET    /templates/:id            # Get specific template
```

### Forms
```bash
POST   /pages/:pageId/forms      # Create form for page
POST   /forms/:formId/submit     # Submit form data
GET    /forms/:formId/submissions # Get form submissions
```

### A/B Testing
```bash
POST   /pages/:pageId/ab-tests   # Create A/B test
PUT    /ab-tests/:testId/:action # Start/stop/declare winner
```

### Analytics
```bash
GET    /pages/:pageId/analytics  # Get page analytics
POST   /pages/:pageId/track      # Track page event
```

### Social Media
```bash
GET    /pages/:pageId/social     # Get social media metrics
PUT    /pages/:pageId/social     # Update social settings
```

### Custom Domains
```bash
POST   /domains                  # Add custom domain
POST   /domains/:domainId/verify # Verify domain ownership
```

### Public Endpoints
```bash
GET    /p/:slug                  # View published landing page
GET    /preview/:pageId          # Preview landing page
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Test with database
npm run test:db
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:3010/health

# Test landing page creation
curl -X POST http://localhost:3010/pages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Landing Page",
    "title": "Welcome to Our QR Campaign",
    "content": "<h1>Hello World</h1>",
    "templateId": "basic-template"
  }'

# Test public page view
curl http://localhost:3010/p/your-page-slug
```

## 🐳 Docker Support

### Development
```bash
# Build image
docker build -t landing-page-service .

# Run container
docker run -p 3010:3010 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  landing-page-service
```

### Docker Compose Integration
The service is included in the main `docker-compose.yml`:

```yaml
landing-page-service:
  build: ./services/landing-page-service
  ports:
    - "3010:3010"
  environment:
    - DATABASE_URL=postgresql://qr_user:qr_password@postgres:5432/qr_saas
    - REDIS_URL=redis://redis:6379
  depends_on:
    - postgres
    - redis
```

## 🔧 Configuration

### Template Configuration
```javascript
// Template settings
{
  "templateType": "marketing",
  "responsive": true,
  "customCSS": true,
  "components": ["header", "hero", "form", "footer"],
  "styles": {
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "fontFamily": "Inter, sans-serif"
  }
}
```

### A/B Test Configuration
```javascript
// A/B test settings
{
  "trafficSplit": 50,
  "minSampleSize": 100,
  "confidenceLevel": 0.95,
  "metrics": ["conversion_rate", "bounce_rate"],
  "duration": "7d"
}
```

## 📊 Monitoring & Logging

### Health Checks
```bash
# Service health
GET /health

# Database health
GET /health/database

# Redis health
GET /health/redis
```

### Metrics
- **Page Views**: Track landing page visits
- **Conversion Rate**: Monitor form submissions
- **Bounce Rate**: Track user engagement
- **Load Time**: Monitor page performance
- **A/B Test Results**: Track test performance

### Logging
All activities are logged with structured format:
```json
{
  "timestamp": "2025-10-26T10:30:00Z",
  "level": "info",
  "service": "landing-page-service",
  "action": "page_viewed",
  "pageId": "page_123",
  "userId": "user_456",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "duration": 245
}
```

## 🚀 Performance Optimization

### Caching Strategy
- **Page Content**: Cache rendered pages in Redis
- **Templates**: Cache template data for faster rendering
- **Analytics**: Cache frequent analytics queries
- **Static Assets**: CDN-ready static asset serving

### Database Optimization
- **Indexes**: Optimized indexes for common queries
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized queries for large datasets
- **Partitioning**: Table partitioning for analytics data

## 🔒 Security Features

### Authentication & Authorization
- **JWT Validation**: Secure token-based authentication
- **Role-Based Access**: Different access levels for users
- **API Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Comprehensive request validation

### Data Protection
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Content sanitization
- **CSRF Protection**: Cross-site request forgery prevention
- **Secure Headers**: Security headers with Helmet.js

## 🔧 Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check dependencies
npm install

# Check environment variables
cat .env

# Check database connection
npm run test:db
```

**Database connection issues:**
```bash
# Test PostgreSQL connection
pg_isready -h localhost -p 5432

# Check database logs
docker-compose logs postgres
```

**Redis connection issues:**
```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
docker-compose logs redis
```

## 📈 Roadmap

### Phase 1 - Core Features ✅
- [x] Landing page CRUD operations
- [x] Template system
- [x] Form management
- [x] Basic analytics

### Phase 2 - Advanced Features ✅
- [x] A/B testing functionality
- [x] Social media integration
- [x] Custom domain support
- [x] Advanced analytics

### Phase 3 - Enhancements (Planned)
- [ ] Drag-and-drop page builder
- [ ] Advanced template editor
- [ ] Email marketing integration
- [ ] CRM integrations
- [ ] Advanced reporting dashboard

### Phase 4 - Scale & Performance (Planned)
- [ ] CDN integration
- [ ] Advanced caching strategies
- [ ] Microservice splitting
- [ ] Real-time collaboration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use Clean Architecture principles
- Write comprehensive tests
- Follow existing code style
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

**Built with ❤️ using Node.js, TypeScript, PostgreSQL, and Clean Architecture**