# Content Management Service

A comprehensive Content Management System (CMS) microservice for the QR Generation SaaS platform. This service handles blog posts, testimonials, static pages, rich content editing, SEO management, and media library functionality.

## 🚀 Features

### Core Functionality
- **Rich Content Editor**: Quill.js integration with Delta format processing
- **Content Types**: Blog posts, testimonials, static pages, help documentation
- **Categories & Tags**: Hierarchical content organization with nested categories
- **SEO Management**: Meta tags, OpenGraph, Twitter Cards, structured data
- **Media Library**: File uploads with automatic thumbnail generation
- **Comment System**: Threaded comments with moderation capabilities
- **Analytics**: Content view tracking and engagement metrics

### Advanced Features
- **Multi-format Content**: Support for rich text, HTML, and Markdown
- **Content Scheduling**: Schedule posts for future publication
- **Search & Filtering**: Full-text search with advanced filtering options
- **Social Sharing**: Pre-configured social media integration
- **Custom Fields**: Flexible metadata for content customization
- **Content Templates**: Reusable content structures

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **PostgreSQL**: Version 13 or higher
- **Redis**: Version 6 or higher (for caching)
- **Docker**: For containerized deployment (optional)

## 🛠️ Installation & Setup

### 1. Clone and Navigate
```bash
cd /path/to/qr-generation/services/content-service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit the configuration file
nano .env
```

### 4. Database Setup
Ensure your PostgreSQL database is running and the content management tables are created:

```sql
-- Tables are automatically created when the main database is initialized
-- Or run the content schema manually if needed
```

### 5. Development Mode
```bash
npm run dev
```

### 6. Production Build
```bash
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables

#### **Server Configuration**
- `NODE_ENV`: Environment (development/production/test)
- `PORT`: Service port (default: 3012)
- `SERVICE_NAME`: Service identifier

#### **Database Configuration**
- `DATABASE_URL`: Full PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Individual DB params
- `DB_MAX_CONNECTIONS`: Maximum pool connections (default: 20)

#### **Security & Authentication**
- `JWT_SECRET`: JWT signing secret (⚠️ Change in production!)
- `BCRYPT_SALT_ROUNDS`: Password hashing rounds (default: 12)
- `RATE_LIMIT_MAX_REQUESTS`: Rate limiting (default: 100/15min)

#### **File Upload Configuration**
- `UPLOAD_MAX_FILE_SIZE`: Max file size in bytes (default: 10MB)
- `UPLOAD_ALLOWED_TYPES`: Comma-separated MIME types
- `UPLOAD_DESTINATION`: Upload directory path

#### **Content Management**
- `DEFAULT_POST_STATUS`: Default status for new posts (draft/published)
- `ALLOW_ANONYMOUS_COMMENTS`: Allow comments without login
- `MAX_COMMENT_LENGTH`: Maximum comment character limit

#### **SEO Configuration**
- `SEO_DEFAULT_TITLE_SUFFIX`: Append to all page titles
- `SEO_DEFAULT_DESCRIPTION`: Default meta description
- `SEO_SITEMAP_ENABLED`: Generate XML sitemap

#### **External Services**
- `SMTP_*`: Email configuration for notifications
- `AWS_*`: AWS S3 configuration for cloud storage
- `GOOGLE_ANALYTICS_ID`: GA tracking ID

## 📚 API Documentation

### Base URL
```
http://localhost:3012/content
```

### Authentication
Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Content Posts Endpoints

#### **GET** `/posts` - List Posts
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Posts per page (default: 10, max: 100)
- `type`: Filter by type (blog/testimonial/page)
- `status`: Filter by status (draft/published/archived)
- `category`: Filter by category slug
- `tag`: Filter by tag slug
- `search`: Search in title and content
- `sortBy`: Sort field (createdAt/publishedAt/viewCount/title)
- `sortOrder`: Sort direction (asc/desc)

#### **POST** `/posts` - Create Post
```json
{
  "title": "How to Create Dynamic QR Codes",
  "content": "Rich text content here...",
  "excerpt": "Short summary",
  "type": "blog",
  "status": "draft",
  "categoryIds": ["uuid1", "uuid2"],
  "tagIds": ["uuid1", "uuid2"],
  "featuredImageUrl": "https://example.com/image.jpg",
  "seo": {
    "title": "Custom SEO title",
    "description": "SEO description",
    "keywords": "qr codes, marketing"
  }
}
```

#### **GET** `/posts/:id` - Get Post by ID
Returns full post details with categories, tags, and comments.

#### **GET** `/posts/slug/:slug` - Get Post by Slug
Public endpoint for retrieving published posts by URL slug.

#### **PUT** `/posts/:id` - Update Post
Partial updates allowed. Same structure as POST.

#### **DELETE** `/posts/:id` - Delete Post
Permanently removes post and associated data.

### Categories & Tags

#### **GET** `/categories` - List Categories
- `includeStats`: Include post count (true/false)
- `parentId`: Filter by parent category

#### **POST** `/categories` - Create Category
```json
{
  "name": "Tutorials",
  "description": "How-to guides",
  "slug": "tutorials",
  "color": "#3B82F6",
  "parentId": "uuid"
}
```

#### **GET** `/tags` - List Tags
- `search`: Search tags by name
- `sortBy`: Sort by name/usageCount/createdAt

#### **POST** `/tags` - Create Tag
```json
{
  "name": "QR Codes",
  "slug": "qr-codes",
  "color": "#10B981"
}
```

### Media Management

#### **POST** `/media` - Upload Media
Multipart form data:
- `file`: Media file
- `alt`: Alt text for accessibility
- `caption`: Media caption

#### **GET** `/media` - List Media Files
- `page`: Page number
- `limit`: Files per page
- `type`: Filter by media type (image/video/document)

### Public Endpoints

#### **GET** `/public/posts` - Published Posts
Public endpoint for blog/testimonial display:
- `type`: Filter by content type
- `category`: Filter by category slug
- `featured`: Show only featured posts

#### **GET** `/public/categories` - Active Categories
Returns only active, published categories.

#### **GET** `/public/tags` - Popular Tags
Returns tags sorted by usage count.

### Health & Monitoring

#### **GET** `/health` - Service Health Check
Returns service status, database connectivity, and performance metrics.

## 🏗️ Architecture

### Directory Structure
```
src/
├── config/           # Configuration management
├── interfaces/       # TypeScript interfaces
├── middleware/       # Express middleware
├── repositories/     # Database access layer
├── routes/          # API route definitions
├── services/        # Business logic layer
├── types/           # Type definitions
└── utils/           # Utility functions
```

### Design Patterns
- **Repository Pattern**: Database abstraction layer
- **Service Layer**: Business logic separation
- **Dependency Injection**: Loose coupling between components
- **Clean Architecture**: Clear separation of concerns

### Database Schema
The service uses 8 main tables:
- `content_posts`: Main content storage
- `content_categories`: Hierarchical content organization
- `content_tags`: Content tagging system
- `content_media`: Media library management
- `content_comments`: Comment system with threading
- `content_seo_settings`: SEO configuration
- `content_views`: Analytics and view tracking
- `content_menu_items`: Navigation management

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Categories
- **Unit Tests**: Service and repository logic
- **Integration Tests**: Database operations
- **API Tests**: Endpoint functionality
- **E2E Tests**: Complete user workflows

## 📊 Monitoring & Logging

### Health Checks
The service provides comprehensive health monitoring:
- Database connection status
- Pool connection metrics
- Service uptime and performance
- External dependency status

### Logging
Structured logging with configurable levels:
- **ERROR**: Application errors and exceptions
- **WARN**: Performance warnings and deprecations
- **INFO**: General application flow
- **DEBUG**: Detailed debugging information

### Metrics
- Request/response times
- Database query performance
- Content view analytics
- Error rates and patterns

## 🔒 Security

### Authentication
- JWT-based authentication
- Configurable token expiration
- Refresh token support

### Authorization
- Role-based access control
- Content ownership validation
- Admin-only operations

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- CORS configuration

## 🚀 Deployment

### Docker Deployment
```dockerfile
# Build production image
docker build -t content-service .

# Run container
docker run -p 3012:3012 --env-file .env content-service
```

### Environment Setup
1. **Development**: Local database, file storage
2. **Staging**: Shared database, S3 storage
3. **Production**: Clustered database, CDN, monitoring

### Scaling Considerations
- Stateless service design for horizontal scaling
- Database connection pooling
- Redis caching for performance
- CDN integration for media delivery

## 🔄 Integration

### API Gateway Integration
The service is automatically registered with the API Gateway:
- Routes: `/api/content/*` → `content-service:3012/content/*`
- Authentication: Handled by API Gateway middleware
- Documentation: Auto-generated Swagger specs

### External Services
- **File Service**: Media upload and processing
- **User Service**: Authentication and user management
- **Analytics Service**: Advanced content analytics
- **Notification Service**: Comment and publishing notifications

## 📖 Development Guide

### Adding New Features
1. **Create Interface**: Define TypeScript interfaces
2. **Repository Layer**: Add database operations
3. **Service Layer**: Implement business logic
4. **Route Layer**: Create API endpoints
5. **Tests**: Add comprehensive test coverage
6. **Documentation**: Update API documentation

### Code Style
- **ESLint**: Automated code linting
- **Prettier**: Code formatting
- **TypeScript**: Strong typing throughout
- **Conventional Commits**: Structured commit messages

### Best Practices
- **Error Handling**: Comprehensive error catching and logging
- **Validation**: Input validation at all entry points
- **Performance**: Efficient database queries and caching
- **Security**: Regular security audits and updates

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Implement** your changes with tests
4. **Run** the full test suite
5. **Submit** a pull request with detailed description

## 📞 Support

- **Issues**: GitHub issue tracker
- **Documentation**: In-code comments and README
- **Monitoring**: Health check endpoints
- **Logs**: Structured logging for debugging

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**QR Generation SaaS** - Content Management Service
Built with ❤️ using Node.js, TypeScript, and PostgreSQL