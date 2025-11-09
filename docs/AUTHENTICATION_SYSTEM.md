# 🔐 Authentication System Documentation

## Overview
Complete authentication system for QR SaaS platform with JWT tokens, password hashing, refresh tokens, and secure token management.

## 🏗️ Architecture Overview

```
Frontend (3 Apps)            API Gateway (3000)          User Service (3001)
├── QR Generator App         ┌─────────────────┐         ┌─────────────────────┐
├── Analytics App            │   /api/auth/*   │────────▶│   AuthService       │
└── Shell App                │   Proxy Routes  │         │   PasswordHasher    │
                             │   Rate Limiting │         │   TokenGenerator    │
                             │   CORS & Helmet │         │   UserRepository    │
                             └─────────────────┘         │   TokenRepository   │
                                                         └─────────────────────┘
```

## 🔑 Core Components

### 1. **AuthService** (`services/user-service/src/services/auth.service.ts`)
Primary authentication business logic:

```typescript
interface IAuthService {
  login(credentials: LoginRequest): Promise<ServiceResponse<AuthUser>>;
  register(userData: CreateUserRequest): Promise<ServiceResponse<AuthUser>>;
  refreshToken(refreshToken: string): Promise<ServiceResponse<AuthTokens>>;
  logout(userId: string, refreshToken: string): Promise<ServiceResponse<void>>;
  forgotPassword(email: string): Promise<ServiceResponse<void>>;
  resetPassword(token: string, newPassword: string): Promise<ServiceResponse<void>>;
  verifyEmailToken(token: string): Promise<ServiceResponse<User>>;
}
```

#### Key Methods:
- **`login()`**: Email/password validation → JWT generation → Token storage
- **`register()`**: User creation → Password hashing → Token generation
- **`refreshToken()`**: Token validation → New token generation
- **`logout()`**: Token revocation → Session cleanup

### 2. **PasswordHasher** (`services/user-service/src/utils/password-hasher.ts`)
Secure password handling with bcrypt:

```typescript
export class PasswordHasher implements IPasswordHasher {
  private readonly saltRounds: number = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
```

**Features:**
- BCrypt with 12 salt rounds for security
- Timing-safe password comparison
- Empty password validation

### 3. **TokenGenerator** (`services/user-service/src/utils/token-generator.ts`)
JWT and crypto token generation:

```typescript
export class TokenGenerator implements ITokenGenerator {
  generateAccessToken(user: User): string {
    return jwt.sign({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscription: user.subscription,
      isEmailVerified: user.isEmailVerified
    }, secret, {
      expiresIn: '15m',
      issuer: 'qr-saas-user-service',
      subject: user.id
    });
  }
  
  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }
}
```

**Token Types:**
- **Access Token**: 15-minute JWT with user claims
- **Refresh Token**: 7-day crypto random hex string
- **Email Verification**: 32-byte verification token
- **Password Reset**: 32-byte reset token

### 4. **UserRepository** (`services/user-service/src/repositories/user.repository.ts`)
Database operations with security considerations:

```typescript
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<(User & { password: string }) | null>;
  create(userData: CreateUserRequest): Promise<User>;
  update(id: string, updates: UpdateUserRequest): Promise<User>;
}
```

**Security Features:**
- `mapRowToUser()` excludes password hash from standard queries
- `findByEmailWithPassword()` specifically for authentication
- SQL injection protection with parameterized queries
- Unique constraint handling for email/username

### 5. **TokenRepository** (`services/user-service/src/repositories/token.repository.ts`)
Refresh token management:

```typescript
interface ITokenRepository {
  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  validateRefreshToken(token: string): Promise<{ userId: string; isValid: boolean }>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
```

## 🔄 Authentication Flow

### Login Flow
```
1. POST /api/auth/login { email, password }
   ↓
2. API Gateway → User Service /auth/login
   ↓
3. AuthService.login()
   ↓
4. UserRepository.findByEmailWithPassword(email)
   ↓
5. PasswordHasher.compare(password, hash)
   ↓
6. TokenGenerator.generateAccessToken() + generateRefreshToken()
   ↓
7. TokenRepository.saveRefreshToken()
   ↓
8. Return { user, tokens: { accessToken, refreshToken, expiresAt } }
```

### Registration Flow
```
1. POST /api/auth/register { email, username, password }
   ↓
2. Check existing user (email uniqueness)
   ↓
3. PasswordHasher.hash(password)
   ↓
4. UserRepository.create()
   ↓
5. TokenGenerator.generateTokens()
   ↓
6. Return { user, tokens }
```

### Token Refresh Flow
```
1. POST /api/auth/refresh { refreshToken }
   ↓
2. TokenRepository.validateRefreshToken()
   ↓
3. UserRepository.findById()
   ↓
4. TokenGenerator.generateAccessToken()
   ↓
5. TokenRepository.revokeRefreshToken() (old)
   ↓
6. TokenRepository.saveRefreshToken() (new)
   ↓
7. Return { accessToken, refreshToken, expiresAt }
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  is_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### User Tokens Table
```sql
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'refresh_token', 'email_verification', 'password_reset'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type) -- One token per type per user
);
```

## 🌐 Frontend Integration

### Shared Auth Service (`packages/shared/src/auth.service.ts`)
Centralized authentication for all frontend apps:

```typescript
export class AuthService {
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    if (response.success && response.data) {
      this.saveAuthState(response.data.user, response.data.tokens);
    }
    return response;
  }

  private saveAuthState(user: AuthUser, tokens: UserAuthTokens): void {
    localStorage.setItem('qr-saas-user', JSON.stringify(user));
    localStorage.setItem('qr-saas-tokens', JSON.stringify(tokens));
    apiClient.setAuthToken(tokens.accessToken);
  }
}
```

### React Context (`apps/*/src/contexts/AuthContext.tsx`)
Component-level authentication state:

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
}
```

## 🛡️ Security Features

### Password Security
- **BCrypt Hashing**: 12 salt rounds (secure for 2025)
- **Timing-Safe Comparison**: Prevents timing attacks
- **Password Validation**: Minimum requirements enforced
- **No Plain Text Storage**: Only hashes in database

### Token Security
- **Short-Lived Access Tokens**: 15-minute expiration
- **Secure Refresh Tokens**: 7-day expiration, revocable
- **CSRF Protection**: Token-based authentication
- **JWT Claims**: User ID, email, subscription, verification status

### API Security
- **Rate Limiting**: 5000 requests per 15 minutes per IP
- **CORS Configuration**: Controlled cross-origin access
- **Helmet Security**: Security headers middleware
- **Input Validation**: Request data sanitization

## 📡 API Endpoints

### Authentication Routes (`/api/auth/`)

#### `POST /api/auth/login`
```json
Request: {
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: {
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "subscription": "free"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "hex-token",
      "expiresAt": 1699123456789
    }
  }
}
```

#### `POST /api/auth/register`
```json
Request: {
  "email": "newuser@example.com",
  "username": "newusername",
  "password": "securePassword123"
}

Response: {
  "success": true,
  "data": {
    "user": { /* same as login */ },
    "tokens": { /* same as login */ }
  }
}
```

#### `POST /api/auth/refresh`
```json
Request: {
  "refreshToken": "hex-refresh-token"
}

Response: {
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-hex-token",
    "expiresAt": 1699123456789
  }
}
```

#### `POST /api/auth/logout`
```json
Request: {
  "userId": "uuid",
  "refreshToken": "hex-refresh-token"
}

Response: {
  "success": true,
  "data": null
}
```

## 🔧 Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secure-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qr_saas
DB_USER=qr_user
DB_PASSWORD=qr_password

# Service Configuration
PORT=3001
NODE_ENV=development
```

### Frontend Environment
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_DEV_MODE=true
```

## 🧪 Test Users

Default test users for development:

| Email | Password | Subscription |
|-------|----------|--------------|
| `free@test.com` | `password123` | `free` |
| `pro@test.com` | `password123` | `pro` |
| `business@test.com` | `password123` | `business` |
| `enterprise@test.com` | `password123` | `enterprise` |
| `admin@test.com` | `password123` | `super_admin` |

## 🔄 Development User Switching

Quick user switching for frontend development:

```bash
# From frontend root
./switch-user.sh free        # Switch to free tier user
./switch-user.sh pro         # Switch to pro tier user
./switch-user.sh business    # Switch to business tier user
./switch-user.sh enterprise  # Switch to enterprise tier user
./switch-user.sh admin       # Switch to admin user
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. **Password Comparison Failing**
```bash
# Check password hash format in database
psql -d qr_saas -c "SELECT email, password_hash FROM users WHERE email = 'test@example.com';"

# Should show bcrypt hash starting with $2b$
```

#### 2. **Token Generation Errors**
```bash
# Check JWT_ACCESS_SECRET environment variable
echo $JWT_ACCESS_SECRET

# Verify token generation in logs
tail -f services/user-service/logs/app.log | grep "token"
```

#### 3. **Database Connection Issues**
```bash
# Verify database connection
psql "host=localhost port=5432 dbname=qr_saas user=qr_user password=qr_password" -c "SELECT 1;"
```

#### 4. **CORS Issues**
Frontend authentication failing due to CORS:
- Verify API Gateway CORS configuration
- Check frontend `NEXT_PUBLIC_API_BASE_URL` setting
- Ensure cookies/localStorage permissions

### Authentication Flow Debugging

1. **Enable Debug Logging**:
   ```bash
   export DEBUG=auth:*
   npm run dev
   ```

2. **Monitor Auth Service Logs**:
   ```bash
   # User Service logs
   tail -f services/user-service/logs/app.log | grep "auth"
   
   # API Gateway logs
   tail -f services/api-gateway/logs/app.log | grep "auth"
   ```

3. **Database Query Monitoring**:
   ```sql
   -- Enable query logging in PostgreSQL
   ALTER SYSTEM SET log_statement = 'all';
   SELECT pg_reload_conf();
   ```

## 📈 Performance Considerations

### Token Management
- **Access Token Caching**: Store in memory/localStorage
- **Refresh Token Security**: HttpOnly cookies in production
- **Token Rotation**: Refresh tokens are rotated on each use
- **Cleanup Jobs**: Expired tokens cleaned automatically

### Database Optimization
- **Indexes**: Email, username, and token fields indexed
- **Connection Pooling**: PostgreSQL connection pool configured
- **Query Optimization**: Parameterized queries for security and performance

## 🔒 Security Best Practices

### Production Checklist
- [ ] Strong JWT secrets (256-bit minimum)
- [ ] HTTPS enforcement
- [ ] Secure cookie settings
- [ ] Rate limiting tuned for production
- [ ] Database connection encryption
- [ ] Log sanitization (no sensitive data)
- [ ] Environment variable security
- [ ] Password policy enforcement
- [ ] Account lockout policies
- [ ] Security headers (CSP, HSTS, etc.)

### Monitoring & Alerts
- Failed login attempt tracking
- Unusual token usage patterns
- Database connection monitoring
- Performance metric tracking
- Security event logging

---

## 🚀 Quick Start Guide

1. **Environment Setup**:
   ```bash
   cd qrgeneration
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Database Setup**:
   ```bash
   npm run db:setup
   npm run db:seed
   ```

3. **Start Services**:
   ```bash
   npm run dev  # Starts all microservices
   ```

4. **Test Authentication**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "free@test.com", "password": "password123"}'
   ```

5. **Frontend Development**:
   ```bash
   cd ../qrgeneration-frontend
   npm run qr:dev  # QR Generator app
   ```

---

*Last Updated: November 2025*
*Version: 1.0.0*
*Architecture: Clean Architecture with SOLID Principles*