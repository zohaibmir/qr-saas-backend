# Admin Dashboard Service - Implementation Document

## 🎯 **Project Overview**

Create a unified admin dashboard service that provides centralized management for all QR SaaS platform services with role-based access control and dedicated admin user management.

## 🏗️ **Architecture Overview**

```
Admin Dashboard Service (Port 3013)
├── Admin Authentication System
├── Role-Based Access Control (RBAC)
├── Service Aggregation Layer
├── Admin UI Dashboard
├── Admin API Endpoints
└── Admin Database Schema
```

## 📊 **Database Schema Design**

### **New Tables for Admin Management**

#### **1. `admin_users` Table**
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role admin_role_enum NOT NULL DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin role enumeration
CREATE TYPE admin_role_enum AS ENUM (
    'super_admin',      -- Full system access
    'content_admin',    -- Content management only
    'analytics_admin',  -- Analytics and reports
    'user_admin',      -- User management
    'support_admin',   -- Customer support
    'marketing_admin', -- Marketing tools
    'finance_admin'    -- Billing and payments
);
```

#### **2. `admin_sessions` Table**
```sql
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **3. `admin_activity_logs` Table**
```sql
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **4. `admin_permissions` Table**
```sql
CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    service VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **5. `admin_role_permissions` Table**
```sql
CREATE TABLE admin_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role admin_role_enum NOT NULL,
    permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role, permission_id)
);
```

### **Database Indexes**
```sql
-- Performance indexes
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_activity_admin_id ON admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_created_at ON admin_activity_logs(created_at);
```

### **Default Data Setup**
```sql
-- Default permissions
INSERT INTO admin_permissions (name, description, service, resource, action) VALUES
-- Content Service Permissions
('content.posts.create', 'Create blog posts and pages', 'content', 'posts', 'create'),
('content.posts.read', 'View blog posts and pages', 'content', 'posts', 'read'),
('content.posts.update', 'Edit blog posts and pages', 'content', 'posts', 'update'),
('content.posts.delete', 'Delete blog posts and pages', 'content', 'posts', 'delete'),
('content.media.manage', 'Manage media library', 'content', 'media', 'manage'),

-- User Service Permissions
('users.read', 'View user accounts', 'user', 'users', 'read'),
('users.update', 'Edit user accounts', 'user', 'users', 'update'),
('users.delete', 'Delete user accounts', 'user', 'users', 'delete'),
('users.subscriptions.manage', 'Manage user subscriptions', 'user', 'subscriptions', 'manage'),

-- Analytics Permissions
('analytics.read', 'View analytics data', 'analytics', 'reports', 'read'),
('analytics.export', 'Export analytics data', 'analytics', 'reports', 'export'),
('analytics.super_admin', 'View super admin analytics', 'analytics', 'super_admin', 'read'),

-- QR Service Permissions
('qr.read', 'View QR codes', 'qr', 'codes', 'read'),
('qr.manage', 'Manage QR codes', 'qr', 'codes', 'manage'),
('qr.bulk.manage', 'Manage bulk QR operations', 'qr', 'bulk', 'manage'),

-- E-commerce Permissions
('ecommerce.read', 'View e-commerce data', 'ecommerce', 'products', 'read'),
('ecommerce.manage', 'Manage e-commerce integrations', 'ecommerce', 'integrations', 'manage'),

-- Marketing Permissions
('marketing.campaigns.manage', 'Manage marketing campaigns', 'marketing', 'campaigns', 'manage'),
('marketing.analytics.read', 'View marketing analytics', 'marketing', 'analytics', 'read'),

-- System Permissions
('system.settings.manage', 'Manage system settings', 'system', 'settings', 'manage'),
('admin.users.manage', 'Manage admin users', 'admin', 'users', 'manage');

-- Default super admin user (password: Admin@123456)
INSERT INTO admin_users (email, password_hash, full_name, role) VALUES 
('admin@qr-saas.com', '$2b$10$XYZ123...', 'System Administrator', 'super_admin');
```

## 🔧 **Service Architecture**

### **Directory Structure**
```
services/admin-dashboard-service/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
├── README.md
├── src/
│   ├── index.ts                    # Main application entry
│   ├── app.ts                      # Express app setup
│   ├── config/
│   │   ├── database.config.ts      # Database configuration
│   │   ├── auth.config.ts          # Authentication settings
│   │   ├── permissions.config.ts   # Permission definitions
│   │   └── services.config.ts      # Service endpoints
│   ├── controllers/
│   │   ├── auth.controller.ts      # Admin authentication
│   │   ├── dashboard.controller.ts # Main dashboard
│   │   ├── content.controller.ts   # Content management
│   │   ├── users.controller.ts     # User management
│   │   ├── analytics.controller.ts # Analytics aggregation
│   │   ├── qr.controller.ts        # QR management
│   │   ├── ecommerce.controller.ts # E-commerce oversight
│   │   └── admin.controller.ts     # Admin user management
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Admin authentication
│   │   ├── rbac.middleware.ts      # Role-based access control
│   │   ├── audit.middleware.ts     # Activity logging
│   │   ├── rate-limit.middleware.ts # Rate limiting
│   │   └── validation.middleware.ts # Input validation
│   ├── services/
│   │   ├── admin-auth.service.ts   # Authentication logic
│   │   ├── rbac.service.ts         # Permission management
│   │   ├── service-aggregator.ts   # Service communication
│   │   ├── dashboard.service.ts    # Dashboard data
│   │   ├── audit.service.ts        # Activity logging
│   │   └── notification.service.ts # Admin notifications
│   ├── repositories/
│   │   ├── admin-user.repository.ts
│   │   ├── admin-session.repository.ts
│   │   ├── admin-activity.repository.ts
│   │   └── admin-permission.repository.ts
│   ├── routes/
│   │   ├── auth.routes.ts          # Authentication routes
│   │   ├── dashboard.routes.ts     # Dashboard routes
│   │   ├── content.routes.ts       # Content management
│   │   ├── users.routes.ts         # User management
│   │   ├── analytics.routes.ts     # Analytics routes
│   │   └── admin.routes.ts         # Admin management
│   ├── interfaces/
│   │   ├── admin.interface.ts      # Admin types
│   │   ├── auth.interface.ts       # Authentication types
│   │   ├── rbac.interface.ts       # Permission types
│   │   └── dashboard.interface.ts  # Dashboard types
│   ├── utils/
│   │   ├── password.util.ts        # Password hashing
│   │   ├── jwt.util.ts             # JWT token management
│   │   ├── validation.util.ts      # Input validation
│   │   └── logger.util.ts          # Logging utilities
│   └── ui/                         # Frontend dashboard
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   │   ├── Layout/
│       │   │   ├── Dashboard/
│       │   │   ├── Content/
│       │   │   ├── Users/
│       │   │   ├── Analytics/
│       │   │   └── Auth/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── utils/
│       ├── package.json
│       └── tsconfig.json
```

## 🔐 **Authentication & Authorization**

### **Authentication Flow**
1. **Admin Login** → Validate credentials against `admin_users`
2. **Session Creation** → Store session in `admin_sessions`
3. **JWT Token** → Issue admin-specific JWT with role/permissions
4. **Request Validation** → Verify token and check permissions
5. **Activity Logging** → Log all admin actions

### **Role-Based Access Control (RBAC)**

#### **Permission System**
```typescript
interface Permission {
  service: string;    // 'content', 'user', 'analytics', etc.
  resource: string;   // 'posts', 'users', 'reports', etc.
  action: string;     // 'create', 'read', 'update', 'delete'
}

interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  customPermissions?: Permission[]; // Override specific permissions
}
```

#### **Role Definitions**
```typescript
enum AdminRole {
  SUPER_ADMIN = 'super_admin',     // All permissions
  CONTENT_ADMIN = 'content_admin', // Content management only
  ANALYTICS_ADMIN = 'analytics_admin', // Analytics and reports
  USER_ADMIN = 'user_admin',       // User management
  SUPPORT_ADMIN = 'support_admin', // Customer support
  MARKETING_ADMIN = 'marketing_admin', // Marketing tools
  FINANCE_ADMIN = 'finance_admin'  // Billing and payments
}
```

## 🎨 **Frontend Dashboard Design**

### **Technology Stack**
- **Framework**: React 18 + TypeScript
- **UI Library**: Ant Design (Enterprise-focused)
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
│ ├ Content  │ │ Dashboard Cards/Charts          │ │
│ ├ Users    │ │                                 │ │
│ ├ QR Codes │ │ Content Management              │ │
│ ├ Analytics│ │ User Management                 │ │
│ ├ E-comm   │ │ Analytics Views                 │ │
│ ├ Marketing│ │ Service Management              │ │
│ ├ Settings │ │                                 │ │
│ └ Admin    │ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### **Key Dashboard Components**

#### **1. Dashboard Overview**
- Service health status
- Key metrics (users, QR codes, revenue)
- Recent activity feed
- System alerts

#### **2. Content Management**
- Create/edit blog posts, pages, testimonials
- Media library with drag & drop upload
- SEO tools and preview
- Publishing calendar
- Content analytics

#### **3. User Management**
- User list with search/filter
- User details and subscription info
- Payment history
- Usage analytics per user
- User support tools

#### **4. QR Code Management**
- System-wide QR analytics
- QR code categories
- Bulk operations management
- Usage patterns and trends

#### **5. Analytics Dashboard**
- Service performance metrics
- Revenue analytics
- Geographic data visualization
- Real-time usage monitoring

#### **6. Admin Management** (Super Admin only)
- Admin user creation/management
- Role and permission assignment
- Activity audit logs
- Security settings

## 🔌 **API Integration Strategy**

### **Service Communication**
```typescript
class ServiceAggregator {
  private services = {
    user: 'http://localhost:3001',
    qr: 'http://localhost:3002',
    analytics: 'http://localhost:3003',
    file: 'http://localhost:3004',
    notification: 'http://localhost:3005',
    api: 'http://localhost:3006',
    ecommerce: 'http://localhost:3007',
    content: 'http://localhost:3012'
  };

  async callService(service: string, endpoint: string, method: string, data?: any) {
    // Handle service communication with error handling and retry logic
  }
}
```

### **API Endpoint Structure**
```
GET    /api/admin/auth/login         # Admin login
POST   /api/admin/auth/logout        # Admin logout
GET    /api/admin/auth/me            # Get current admin user

GET    /api/admin/dashboard          # Dashboard overview
GET    /api/admin/dashboard/metrics  # System metrics

GET    /api/admin/content/posts      # Content management
POST   /api/admin/content/posts      # Create content
PUT    /api/admin/content/posts/:id  # Update content

GET    /api/admin/users              # User management
PUT    /api/admin/users/:id          # Update user
DELETE /api/admin/users/:id          # Delete user

GET    /api/admin/analytics/overview # Analytics overview
GET    /api/admin/analytics/reports  # Generate reports

GET    /api/admin/qr/overview        # QR management
POST   /api/admin/qr/bulk            # Bulk operations

GET    /api/admin/admin-users        # Admin user management
POST   /api/admin/admin-users        # Create admin user
PUT    /api/admin/admin-users/:id    # Update admin user
```

## 🛡️ **Security Considerations**

### **Security Measures**
1. **Separate Admin Authentication** - Isolated from regular users
2. **Strong Password Requirements** - Min 12 chars, complexity rules
3. **Session Management** - Secure tokens with expiration
4. **IP Whitelisting** - Optional IP restriction for super admins
5. **Rate Limiting** - Protect against brute force attacks
6. **Audit Logging** - Track all admin actions
7. **Two-Factor Authentication** - TOTP support for admin accounts
8. **Environment Isolation** - Admin access only in secure environments

### **Permission Validation**
```typescript
// Middleware to check permissions
export const requirePermission = (service: string, resource: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const hasPermission = await rbacService.checkPermission(
      req.adminUser.id,
      service,
      resource,
      action
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

## 📋 **Implementation Phases**

### **Phase 1: Foundation (Week 1)**
- ✅ Database schema creation
- ✅ Admin service structure setup
- ✅ Basic authentication system
- ✅ RBAC implementation
- ✅ API Gateway integration

### **Phase 2: Core Dashboard (Week 2)**
- ✅ Dashboard UI framework
- ✅ Service aggregation layer
- ✅ Admin authentication frontend
- ✅ Basic dashboard overview
- ✅ Service health monitoring

### **Phase 3: Content Management (Week 3)**
- ✅ Content creation/editing UI
- ✅ Media library integration
- ✅ SEO tools and preview
- ✅ Publishing workflows
- ✅ Content analytics

### **Phase 4: User & Service Management (Week 4)**
- ✅ User management interface
- ✅ QR code management tools
- ✅ Analytics dashboard integration
- ✅ E-commerce oversight tools
- ✅ Marketing tools integration

### **Phase 5: Advanced Features (Week 5)**
- ✅ Advanced analytics
- ✅ Audit logging interface
- ✅ Admin user management
- ✅ Two-factor authentication
- ✅ System settings management

## 🚀 **Development Environment Setup**

### **Required Environment Variables**
```bash
# Admin Dashboard Service (.env)
PORT=3013
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qr_saas
DB_USER=qr_user
DB_PASSWORD=qr_password

# JWT Configuration
ADMIN_JWT_SECRET=super-secure-admin-jwt-secret
ADMIN_JWT_EXPIRY=8h
ADMIN_REFRESH_TOKEN_EXPIRY=7d

# Service URLs
USER_SERVICE_URL=http://localhost:3001
QR_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003
FILE_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
CONTENT_SERVICE_URL=http://localhost:3012
ECOMMERCE_SERVICE_URL=http://localhost:3007

# Security
ADMIN_SESSION_SECRET=admin-session-secret
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15 # minutes

# Optional Security
ADMIN_IP_WHITELIST=192.168.1.1,127.0.0.1
ENABLE_2FA=true
```

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc && npm run build:ui",
    "build:ui": "cd ui && npm run build",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "db:migrate": "npm run db:create-tables && npm run db:seed",
    "db:create-tables": "psql -d qr_saas -f database/admin-schema.sql",
    "db:seed": "psql -d qr_saas -f database/admin-seed.sql"
  }
}
```

## 📈 **Success Metrics**

### **Technical Metrics**
- ✅ All services accessible through admin dashboard
- ✅ Sub-1 second response times for dashboard loads
- ✅ 99.9% admin service uptime
- ✅ Zero authentication vulnerabilities
- ✅ Complete audit trail for all admin actions

### **Business Metrics**
- ✅ Reduced admin task completion time by 80%
- ✅ Increased content publishing frequency
- ✅ Improved user support response times
- ✅ Better system monitoring and issue detection
- ✅ Enhanced security and compliance

## 🔄 **Future Enhancements**

### **Advanced Features**
- **AI-Powered Insights** - Automated recommendations and anomaly detection
- **Mobile Admin App** - Native mobile administration
- **Advanced Reporting** - Custom report builder with scheduling
- **Workflow Automation** - Automated admin tasks and approvals
- **Multi-tenancy Support** - Support for multiple organizations
- **API Rate Limiting** - Advanced rate limiting and throttling
- **Advanced Security** - Behavioral analysis and threat detection

---

## ✅ **Ready to Implement**

This implementation document provides a complete roadmap for building a comprehensive, secure, and scalable admin dashboard service. The design separates admin users from regular users, implements proper role-based access control, and provides a unified interface for managing all QR SaaS platform services.

**Next Steps:**
1. Review and approve this implementation plan
2. Create database schema
3. Build Phase 1 (Foundation)
4. Iterate through phases based on priority

Would you like me to start implementing Phase 1, or would you like to modify any aspects of this design?