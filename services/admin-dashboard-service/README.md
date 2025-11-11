# Admin Dashboard Service

A comprehensive admin dashboard service for the QR SaaS Platform providing centralized management for all microservices with role-based access control.

## 🎯 **Overview**

This service provides a unified admin interface to manage:
- **Content Management** - Blog posts, pages, testimonials, media library
- **User Management** - Customer accounts, subscriptions, support tools  
- **QR Management** - System-wide QR analytics and operations
- **Analytics Dashboard** - Cross-service performance metrics
- **System Administration** - Service health, settings, admin users

## 🏗️ **Architecture**

```
Admin Dashboard Service (Port 3013)
├── Admin Authentication & RBAC
├── Service Aggregation Layer  
├── REST API Endpoints
├── React Dashboard UI
└── Admin Database Tables
```

### **Key Features**
- ✅ **Role-Based Access Control** - Super admin and content admin roles
- ✅ **Separate Admin Authentication** - Isolated from customer users
- ✅ **Service Aggregation** - Unified interface for all microservices
- ✅ **Audit Logging** - Complete admin activity tracking
- ✅ **Responsive UI** - React + TypeScript + Ant Design
- ✅ **Security First** - JWT tokens, session management, rate limiting

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- PostgreSQL with QR SaaS database
- Redis (optional, for sessions)
- All other QR SaaS services running

### **Installation**
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure environment variables (see Configuration section)
# Edit .env file with your settings

# Run database migrations (admin tables)
npm run db:migrate

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

### **UI Development**
```bash
# Install UI dependencies
cd ui && npm install

# Start UI development server (with backend proxy)
npm run dev

# Build UI for production
npm run build
```

## ⚙️ **Configuration**

### **Environment Variables**

#### **Service Settings**
```bash
PORT=3013                           # Admin dashboard port
NODE_ENV=development                # Environment mode
SERVICE_NAME=admin-dashboard-service
```

#### **Database Configuration**
```bash
DB_HOST=localhost                   # PostgreSQL host
DB_PORT=5432                       # PostgreSQL port
DB_NAME=qr_saas                    # Database name (existing)
DB_USER=postgres                   # Database user
DB_PASSWORD=password               # Database password
```

#### **Authentication & Security**
```bash
ADMIN_JWT_SECRET=your-secret       # JWT secret for admin tokens
ADMIN_JWT_EXPIRY=8h               # Admin token expiry
BCRYPT_ROUNDS=12                  # Password hashing rounds
MAX_LOGIN_ATTEMPTS=5              # Max failed login attempts
LOCKOUT_DURATION=15               # Lockout duration (minutes)
```

#### **Service URLs**
```bash
USER_SERVICE_URL=http://localhost:3001
QR_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003
FILE_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
CONTENT_SERVICE_URL=http://localhost:3012
ECOMMERCE_SERVICE_URL=http://localhost:3007
```

## 🔐 **Authentication & Authorization**

### **Admin Roles**
- **`super_admin`** - Full system access, manage all services and admin users
- **`content_admin`** - Content management only (blogs, pages, media)
- **`analytics_admin`** - Analytics and reporting access
- **`user_admin`** - User management and support tools
- **`support_admin`** - Customer support capabilities
- **`marketing_admin`** - Marketing tools and campaign management

### **Default Admin Users**
```bash
# Super Admin
Email: admin@qr-saas.com
Password: Admin@123456

# Content Admin  
Email: content@qr-saas.com
Password: Content@123456
```

### **Permission System**
Granular permissions based on service.resource.action pattern:
- `content.posts.create` - Create blog posts
- `users.subscriptions.manage` - Manage user subscriptions
- `analytics.super_admin.read` - View system analytics
- `admin.users.manage` - Manage admin accounts

## 📊 **API Endpoints**

### **Authentication**
```bash
POST   /auth/login                 # Admin login
POST   /auth/logout                # Admin logout  
GET    /auth/me                    # Get current admin user
POST   /auth/refresh               # Refresh JWT token
```

### **Dashboard**
```bash
GET    /dashboard                  # Dashboard overview
GET    /dashboard/metrics          # System metrics
GET    /dashboard/health           # Service health status
```

### **Content Management** (Priority)
```bash
GET    /content/posts              # List posts with filtering
POST   /content/posts              # Create new post
GET    /content/posts/:id          # Get post details
PUT    /content/posts/:id          # Update post
DELETE /content/posts/:id          # Delete post
POST   /content/posts/:id/publish  # Publish/unpublish post

GET    /content/media              # Media library
POST   /content/media              # Upload media
DELETE /content/media/:id          # Delete media

GET    /content/categories         # List categories
POST   /content/categories         # Create category
PUT    /content/categories/:id     # Update category

GET    /content/comments           # List comments
PUT    /content/comments/:id       # Moderate comment
DELETE /content/comments/:id       # Delete comment
```

### **User Management**
```bash
GET    /users                      # List users with filtering
GET    /users/:id                  # Get user details
PUT    /users/:id                  # Update user
DELETE /users/:id                  # Delete user
PUT    /users/:id/subscription     # Update subscription
GET    /users/:id/qr-codes         # Get user's QR codes
GET    /users/:id/activity         # User activity log
```

### **Analytics**
```bash
GET    /analytics/overview         # System overview
GET    /analytics/users            # User analytics
GET    /analytics/qr-codes         # QR code analytics  
GET    /analytics/content          # Content analytics
GET    /analytics/revenue          # Revenue analytics
POST   /analytics/export           # Export analytics data
```

### **System Administration**
```bash
GET    /admin/users                # List admin users
POST   /admin/users                # Create admin user
PUT    /admin/users/:id            # Update admin user
DELETE /admin/users/:id            # Delete admin user
GET    /admin/activity             # Admin activity logs
GET    /admin/services             # Service health status
```

## 🎨 **UI Framework**

### **Technology Stack**
- **Framework**: React 18 + TypeScript
- **UI Library**: Ant Design (enterprise admin focused)
- **State Management**: React Query + Zustand  
- **Routing**: React Router 6
- **Charts**: Recharts + Chart.js
- **Forms**: React Hook Form + Yup validation
- **HTTP Client**: Axios with interceptors

### **Dashboard Layout**
```
┌─────────────────────────────────────────────────┐
│ Header: QR SaaS Admin | User Profile | Logout   │
├─────────────────────────────────────────────────┤
│ Sidebar    │ Main Content Area                   │
│ ├ Dashboard│ ┌─────────────────────────────────┐ │
│ ├ Content  │ │ Dashboard Overview              │ │
│ ├ Users    │ │ Service Health Status           │ │
│ ├ QR Codes │ │ Key Metrics & Charts            │ │
│ ├ Analytics│ │ Recent Activity Feed            │ │
│ ├ Settings │ │                                 │ │
│ └ Admin    │ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### **Key Components**
- **Dashboard Overview** - Service health, key metrics, recent activity
- **Content Management** - WYSIWYG editor, media library, SEO tools
- **User Management** - User search, subscription management, support tools
- **Analytics Dashboard** - Charts, reports, data export
- **Admin Management** - Admin user creation, role assignment, audit logs

## 🔧 **Development**

### **Project Structure**
```
src/
├── index.ts                    # Main application entry
├── app.ts                      # Express app setup
├── config/                     # Configuration files
├── controllers/                # Route controllers
├── middleware/                 # Custom middleware
├── services/                   # Business logic
├── repositories/               # Database access
├── routes/                     # API routes
├── interfaces/                 # TypeScript interfaces
├── utils/                      # Utility functions
└── ui/                         # React frontend
    ├── src/
    │   ├── components/         # React components
    │   ├── pages/              # Page components
    │   ├── hooks/              # Custom React hooks
    │   ├── services/           # API services
    │   └── utils/              # UI utilities
    └── package.json
```

### **Database Schema**
The service uses 5 additional tables in the existing QR SaaS database:
- `admin_users` - Admin user accounts
- `admin_sessions` - Session management
- `admin_activity_logs` - Audit trail
- `admin_permissions` - Permission definitions
- `admin_role_permissions` - Role-permission mapping

### **Service Communication**
The admin service aggregates data from all microservices:
- Direct HTTP calls to service endpoints
- JWT token forwarding for authentication
- Error handling and retry logic
- Response caching for performance

## 🛡️ **Security**

### **Security Features**
- ✅ **Separate Admin Authentication** - Isolated from customer users
- ✅ **JWT Token Security** - Secure token generation and validation
- ✅ **Password Security** - bcrypt hashing with configurable rounds
- ✅ **Session Management** - Secure session tokens with expiration
- ✅ **Rate Limiting** - Protect against brute force attacks
- ✅ **Audit Logging** - Track all admin actions with details
- ✅ **Role-Based Permissions** - Granular access control
- ✅ **IP Whitelisting** - Optional IP restrictions (configurable)

### **Best Practices**
- Strong password requirements (12+ characters, complexity)
- Failed login attempt tracking and account lockout
- Secure HTTP headers with Helmet.js
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS prevention with output encoding

## 📈 **Monitoring & Logging**

### **Health Checks**
```bash
GET /health                     # Service health status
GET /health/services           # All service health status
GET /health/database           # Database connection status
```

### **Metrics**
- Admin user activity and login frequency
- Service response times and availability  
- Content creation and publishing rates
- User management operations
- System resource usage

### **Audit Logging**
All admin actions are logged with:
- Admin user ID and details
- Action type and resource affected
- IP address and user agent
- Timestamp and request details
- Success/failure status

## 🚀 **Deployment**

### **Production Setup**
```bash
# Build application
npm run build:all

# Set production environment
export NODE_ENV=production

# Start with PM2
pm2 start dist/index.js --name admin-dashboard

# Or with Docker
docker build -t admin-dashboard-service .
docker run -p 3013:3013 admin-dashboard-service
```

### **Environment Variables**
Ensure production environment has:
- Strong JWT secrets
- Secure database credentials
- Proper service URLs
- Redis configuration for sessions
- SSL/TLS certificates

### **Scaling Considerations**
- Horizontal scaling with load balancer
- Session storage in Redis for multi-instance deployment
- Database connection pooling
- CDN for static UI assets
- Service mesh for microservice communication

## 📚 **API Documentation**

Interactive API documentation available at:
- **Development**: `http://localhost:3013/api-docs`
- **Swagger JSON**: `http://localhost:3013/api-docs.json`

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Database Connection Error**
   ```bash
   # Check database configuration
   psql -h localhost -U postgres -d qr_saas
   ```

2. **Service Communication Error**
   ```bash
   # Verify service URLs in .env
   curl http://localhost:3012/health  # Content service
   curl http://localhost:3001/health  # User service
   ```

3. **Authentication Issues**
   ```bash
   # Check JWT secret configuration
   # Verify admin user exists in database
   SELECT * FROM admin_users WHERE email = 'admin@qr-saas.com';
   ```

4. **Permission Denied**
   ```bash
   # Check user role and permissions
   SELECT au.role, ap.name FROM admin_users au
   JOIN admin_role_permissions arp ON au.role = arp.role
   JOIN admin_permissions ap ON arp.permission_id = ap.id
   WHERE au.email = 'user@example.com';
   ```

### **Debug Mode**
```bash
export LOG_LEVEL=debug
npm run dev
```

## 📄 **License**

MIT License - see LICENSE file for details.

---

## ✅ **Status**

- ✅ **Database Schema** - Admin tables created with roles and permissions
- ✅ **Service Structure** - Basic Express app with TypeScript
- 🚧 **Authentication System** - In development
- 🚧 **UI Framework** - In development  
- 🚧 **Content Management** - In development
- ⏳ **User Management** - Planned
- ⏳ **Analytics Integration** - Planned

**Current Version**: 1.0.0  
**Service Port**: 3013  
**API Prefix**: `/api/admin`