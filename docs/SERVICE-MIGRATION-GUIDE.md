# 🔄 Service Migration Guide: Clean Architecture Authentication

This guide provides step-by-step instructions for migrating existing microservices to use the new Clean Architecture authentication system.

## 📋 Migration Checklist

### Pre-Migration Setup
- [ ] Ensure shared package v1.0.0+ is installed
- [ ] API Gateway v2.0 is running with new auth middleware
- [ ] Test JWT tokens are available for testing

### Per-Service Migration
- [ ] Install updated dependencies
- [ ] Replace old auth extraction code
- [ ] Update middleware setup
- [ ] Update route handlers
- [ ] Add subscription tier checks
- [ ] Update error responses
- [ ] Test all endpoints
- [ ] Update integration tests

## 🛠️ Step-by-Step Migration

### Step 1: Update Package Dependencies

```bash
# Update shared package
cd services/your-service
npm install @qr-saas/shared@latest

# Verify installation
npm list @qr-saas/shared
```

### Step 2: Remove Old Authentication Code

**Before (Old Code):**
```typescript
// ❌ Remove this old pattern
private extractUserId(req: express.Request): string {
  const userId = req.headers['x-user-id'] || 
                 req.headers['X-User-Id'] || 
                 req.headers['user-id'] || 
                 req.query?.userId || 
                 req.body?.userId;
  
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  return userId as string;
}

// ❌ Remove manual JWT validation in services
const jwt = require('jsonwebtoken');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

**After (New Code):**
```typescript
// ✅ Use the new shared authentication
import { serviceAuth, AuthUser } from '@qr-saas/shared';

// No manual extraction needed - handled by middleware
```

### Step 3: Update Service Middleware Setup

**Before:**
```typescript
// ❌ Old manual middleware
app.use((req, res, next) => {
  try {
    const userId = extractUserId(req);
    req.userId = userId;
    next();
  } catch (error) {
    res.status(400).json({ error: 'User ID required' });
  }
});
```

**After:**
```typescript
// ✅ New Clean Architecture middleware
import { serviceAuth } from '@qr-saas/shared';

// Extract auth context from gateway headers
app.use(serviceAuth.extractAuth);

// For endpoints that require authentication
app.use('/protected-routes/*', serviceAuth.requireAuth);
```

### Step 4: Update Route Handlers

**Before:**
```typescript
// ❌ Old pattern
app.post('/qr', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const subscriptionTier = req.headers['x-subscription-tier'] as string || 'free';
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Manual subscription check
    if (subscriptionTier === 'free' && someFeature) {
      return res.status(402).json({ error: 'Upgrade required' });
    }
    
    // Business logic
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

**After:**
```typescript
// ✅ New Clean Architecture pattern
app.post('/qr', 
  serviceAuth.requireAuth,                    // Ensure authenticated
  serviceAuth.requireSubscription('pro'),     // Ensure subscription level
  async (req, res) => {
    try {
      const user = req.auth as AuthUser;      // Type-safe user context
      
      // Business logic with clean user access
      console.log(`Creating QR for user: ${user.email}`);
      console.log(`Subscription tier: ${user.subscriptionTier}`);
      
      // Check feature access
      if (user.hasFeatureAccess('custom_design')) {
        // Allow custom styling
      }
      
      // Get usage limits
      const limits = user.getUsageLimits();
      
      // Your business logic here
      
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: {
          code: 'QR_CREATION_ERROR',
          message: 'Failed to create QR code'
        }
      });
    }
  }
);
```

### Step 5: Update Different Route Types

#### Public Routes (No Auth Required)
```typescript
// ✅ Public routes - no middleware needed
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/public/templates', (req, res) => {
  // Public data, no auth required
});
```

#### Optional Auth Routes (Better with Auth)
```typescript
// ✅ Optional auth - works with or without user
app.get('/templates', 
  serviceAuth.extractAuth,                    // Extract if available
  (req, res) => {
    if (req.auth) {
      // Return personalized templates
      const userTemplates = getTemplatesForUser(req.auth.userId);
      res.json(userTemplates);
    } else {
      // Return public templates
      const publicTemplates = getPublicTemplates();
      res.json(publicTemplates);
    }
  }
);
```

#### Protected Routes with Permissions
```typescript
// ✅ Admin-only endpoints
app.delete('/admin/users/:id',
  serviceAuth.requireAuth,
  serviceAuth.requirePermission('admin_delete'),
  async (req, res) => {
    const user = req.auth as AuthUser;
    
    // Audit log the admin action
    console.log(`Admin ${user.email} deleting user ${req.params.id}`);
    
    // Business logic
  }
);
```

#### Organization-Scoped Routes
```typescript
// ✅ Organization-specific resources
app.get('/organizations/:orgId/data',
  serviceAuth.requireAuth,
  serviceAuth.requireOrganizationAccess,
  async (req, res) => {
    const user = req.auth as AuthUser;
    const orgId = req.params.orgId;
    
    // User access already validated by middleware
    const data = await getOrganizationData(orgId);
    res.json(data);
  }
);
```

#### Subscription-Based Features
```typescript
// ✅ Different features for different tiers
app.post('/analytics/advanced',
  serviceAuth.requireAuth,
  serviceAuth.requireSubscription('business'),
  async (req, res) => {
    // Only business+ users can access
  }
);

app.post('/white-label/settings',
  serviceAuth.requireAuth,
  serviceAuth.requireSubscription('enterprise'),
  async (req, res) => {
    // Only enterprise users can access
  }
);
```

### Step 6: Update Error Responses

**Before:**
```typescript
// ❌ Inconsistent error formats
res.status(401).json({ error: 'Unauthorized' });
res.status(400).json({ message: 'Bad request' });
res.status(500).json({ error: 'Server error' });
```

**After:**
```typescript
// ✅ Standardized error format (automatically handled by middleware)
// Authentication errors:
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "This endpoint requires authentication",
    "timestamp": "2024-11-16T10:30:00Z"
  }
}

// Authorization errors:
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_UPGRADE_REQUIRED", 
    "message": "This feature requires pro subscription or higher",
    "currentTier": "free",
    "requiredTier": "pro",
    "timestamp": "2024-11-16T10:30:00Z"
  }
}
```

### Step 7: Add Usage Limit Checks

```typescript
// ✅ Check usage limits
app.post('/qr',
  serviceAuth.requireAuth,
  serviceAuth.checkUsageLimits('qrCodes'),
  async (req, res) => {
    const user = req.auth as AuthUser;
    const usageInfo = req.usageLimit; // Set by middleware
    
    if (!usageInfo.unlimited) {
      // Check actual usage against limit
      const currentUsage = await getUserQrCount(user.userId);
      if (currentUsage >= usageInfo.limit) {
        return res.status(402).json({
          success: false,
          error: {
            code: 'USAGE_LIMIT_EXCEEDED',
            message: `QR code limit exceeded (${currentUsage}/${usageInfo.limit})`,
            currentUsage,
            limit: usageInfo.limit
          }
        });
      }
    }
    
    // Create QR code
  }
);
```

### Step 8: Update Integration Tests

**Before:**
```typescript
// ❌ Old test pattern
const response = await request(app)
  .post('/qr')
  .set('x-user-id', 'test-user')
  .set('x-subscription-tier', 'pro')
  .send(qrData);
```

**After:**
```typescript
// ✅ New test pattern
import { generateTestJWT } from '../test-utils';

const token = generateTestJWT({
  userId: 'test-user',
  email: 'test@example.com',
  subscription: 'pro'
});

const response = await request(app)
  .post('/qr')
  .set('Authorization', `Bearer ${token}`)
  .send(qrData);
```

### Step 9: Service-Specific Examples

#### User Service Migration
```typescript
// ✅ User service doesn't need auth on most endpoints
// (they're for authentication itself)

// But profile endpoints need it:
app.get('/users/profile', 
  serviceAuth.requireAuth,
  (req, res) => {
    const user = req.auth as AuthUser;
    // Return profile for authenticated user
    res.json({
      id: user.userId,
      email: user.email,
      subscription: user.subscriptionTier
    });
  }
);
```

#### QR Service Migration
```typescript
// ✅ QR service migration
app.post('/qr',
  serviceAuth.requireAuth,
  async (req, res) => {
    const user = req.auth as AuthUser;
    
    // Create QR with user context
    const qrCode = await createQR({
      userId: user.userId,
      subscriptionTier: user.subscriptionTier,
      ...req.body
    });
    
    res.json({ success: true, data: qrCode });
  }
);

app.get('/qr',
  serviceAuth.requireAuth,
  async (req, res) => {
    const user = req.auth as AuthUser;
    
    // Get user's QR codes
    const qrCodes = await getUserQRCodes(user.userId);
    res.json({ success: true, data: qrCodes });
  }
);
```

#### Analytics Service Migration
```typescript
// ✅ Analytics service migration
app.get('/analytics/dashboard',
  serviceAuth.requireAuth,
  serviceAuth.requireSubscription('pro'),    // Analytics requires Pro+
  async (req, res) => {
    const user = req.auth as AuthUser;
    
    const analytics = await getAnalytics(user.userId);
    res.json({ success: true, data: analytics });
  }
);
```

## 🧪 Testing Your Migration

### Test Checklist
- [ ] **Public routes work without authentication**
  ```bash
  curl -X GET http://localhost:3001/health
  # Should return 200
  ```

- [ ] **Protected routes reject unauthenticated requests**
  ```bash
  curl -X GET http://localhost:3001/qr
  # Should return 401
  ```

- [ ] **Protected routes accept valid tokens**
  ```bash
  curl -X GET http://localhost:3001/qr \
    -H "Authorization: Bearer $VALID_JWT"
  # Should return 200 with data
  ```

- [ ] **Subscription checks work correctly**
  ```bash
  curl -X POST http://localhost:3001/teams \
    -H "Authorization: Bearer $FREE_USER_JWT"
  # Should return 402 (upgrade required)
  ```

### Test Utilities
```typescript
// test-utils.ts
import { AuthenticationModuleFactory } from '@qr-saas/shared';

const authModule = AuthenticationModuleFactory.create({
  jwtSecret: 'test-secret'
});

export const generateTestJWT = (userData: any) => {
  return authModule.jwtTokenService.generateTestToken(userData);
};

export const createTestUser = (overrides = {}) => {
  return {
    userId: 'test-user-123',
    email: 'test@example.com',
    username: 'testuser',
    subscription: 'free',
    isEmailVerified: true,
    ...overrides
  };
};
```

## ⚠️ Common Migration Issues

### Issue 1: TypeScript Errors
```typescript
// ❌ Property 'auth' does not exist on type 'Request'
const user = req.auth;

// ✅ Import and use proper typing
import { AuthUser } from '@qr-saas/shared';
const user = req.auth as AuthUser;
```

### Issue 2: Missing Auth Context
```typescript
// ❌ req.auth is undefined
if (!req.auth) {
  // This should be handled by middleware
}

// ✅ Use requireAuth middleware
app.use('/protected/*', serviceAuth.requireAuth);
```

### Issue 3: Inconsistent Error Handling
```typescript
// ❌ Manual error responses
if (!userId) {
  return res.status(401).json({ error: 'No user' });
}

// ✅ Let middleware handle authentication errors
// Use serviceAuth.requireAuth instead
```

## 📊 Migration Progress Tracking

### Service Status
- [ ] User Service - In Progress
- [ ] QR Service - Not Started  
- [ ] Analytics Service - Not Started
- [ ] File Service - Not Started
- [ ] Team Service - Not Started
- [ ] Payment Service - Not Started
- [ ] Admin Dashboard Service - Not Started
- [ ] Business Tools Service - Not Started

### Migration Metrics
- **Lines of code removed**: Track old auth code elimination
- **Test coverage**: Ensure all auth scenarios are tested  
- **Performance**: Measure auth processing time improvements
- **Error rates**: Monitor authentication failure rates

## 🚀 Post-Migration Validation

### 1. Integration Testing
```bash
# Test the complete flow
npm run test:integration
```

### 2. Load Testing
```bash
# Test authentication performance
npm run test:load
```

### 3. Security Audit
```bash
# Verify no auth bypasses
npm run audit:security
```

### 4. Monitoring Setup
- Set up authentication metrics dashboards
- Configure alerts for auth failures
- Monitor performance impact

---

**Next Steps**: Start with migrating the User Service as it's the foundation, then QR Service, then Analytics Service. Each migration should be tested thoroughly before moving to the next service.

This migration will eliminate all the current authentication issues and provide a solid, scalable foundation for future growth.