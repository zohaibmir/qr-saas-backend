# User Service

Comprehensive user management service with authentication, subscription management, and user profiles.

## 🎯 Purpose
- **User Management**: Registration, login, profile management
- **Authentication**: JWT-based authentication system
- **Subscription Management**: Complete subscription lifecycle
- **User Profiles**: Profile data and preferences
- **Security**: Password hashing, token management

## ✅ Features
- ✅ **User Registration & Login**: Secure authentication flow
- ✅ **JWT Authentication**: Token-based security
- ✅ **Subscription Management**: 4-tier subscription system
- ✅ **Profile Management**: User data and preferences
- ✅ **Password Security**: Bcrypt hashing
- ✅ **Database Integration**: PostgreSQL with user tables

## 💳 Subscription Tiers
1. **Free Tier**: 10 QR codes, 30-day analytics, basic customization
2. **Pro Tier**: 500 QR codes, 1-year analytics, advanced customization
3. **Business Tier**: Unlimited QR codes, 3-year analytics, team features
4. **Enterprise Tier**: White-label, custom domains, priority support

## 📁 Structure
```
src/
├── index.ts            # Service entry point
├── config/
│   └── database.config.ts  # Database configuration
├── interfaces/         # TypeScript interfaces
├── repositories/       # Data access layer
│   ├── user.repository.ts
│   └── subscription.repository.ts
├── services/          # Business logic layer
│   ├── user.service.ts
│   ├── subscription.service.ts
│   └── auth.service.ts
└── utils/             # Utility functions
```

## 🗄️ Database Schema
```sql
-- Users table
users (
  id, email, password_hash, first_name, last_name,
  created_at, updated_at, is_active, email_verified
)

-- Subscription Plans
subscription_plans (
  id, name, price, qr_limit, analytics_retention_days,
  features, is_active
)

-- User Subscriptions
user_subscriptions (
  id, user_id, plan_id, status, current_period_start,
  current_period_end, created_at, updated_at
)
```

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
### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile

### Subscription Management
- `GET /subscriptions/plans` - Get all subscription plans
- `POST /subscriptions/subscribe` - Subscribe to a plan
- `PUT /subscriptions/change-plan` - Change subscription plan
- `GET /subscriptions/current` - Get current subscription
- `POST /subscriptions/cancel` - Cancel subscription

### User Management
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `DELETE /users/account` - Delete user account

## 🔐 Security Features
- **Password Hashing**: Bcrypt with salt
- **JWT Tokens**: Secure token generation
- **Input Validation**: Request data validation
- **Rate Limiting**: Login attempt limiting
- **Email Verification**: Account verification flow

## 📝 Configuration
Environment variables:
- `PORT` - Service port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `BCRYPT_ROUNDS` - Password hashing rounds
- `EMAIL_SERVICE_URL` - Email service endpoint