# API Service

The API Service is responsible for managing third-party integrations, API keys, and webhook management for the QR SaaS platform.

## Features

### ✅ Implemented
- **API Key Management**: Create, manage, and revoke API keys with permissions and rate limiting
- **Webhook System**: Real-time scan event notifications with delivery tracking
- **Webhook Retry Logic**: Automatic retry with exponential backoff and job processing
- **Public REST API v1**: Complete CRUD operations for QR codes via API keys
- **Clean Architecture**: Following SOLID principles with dependency injection
- **Database Integration**: PostgreSQL with proper schema and indexes
- **Authentication**: JWT-based authentication middleware
- **Error Handling**: Comprehensive error handling and validation
- **Health Checks**: Service health monitoring
- **Docker Support**: Containerized deployment
- **API Documentation**: Complete OpenAPI 3.0 specification with Swagger UI

### 🚧 In Progress
- **Redis-based Rate Limiting**: Distributed rate limiting for production scale
- **Background Job Queue**: Proper job queue implementation for webhook delivery

### 📋 Planned
- **Third-party Integrations**: Zapier, IFTTT, Make.com integrations
- **SDK Generation**: Auto-generated client libraries
- **Monitoring**: Metrics and observability
- **Advanced Analytics**: API usage analytics and insights

## Architecture

The service follows a clean architecture pattern with clear separation of concerns:

```
src/
├── controllers/         # HTTP request handlers
├── services/           # Business logic
├── repositories/       # Data access layer
├── middleware/         # Express middleware
├── routes/             # Route definitions
├── interfaces/         # TypeScript interfaces
├── config/             # Configuration files
└── utils/              # Utility functions
```

## API Endpoints

### Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <jwt_token>
```

### API Keys Management

#### POST /api/v1/keys
Create a new API key.

**Request Body:**
```json
{
  "name": "My API Key",
  "permissions": ["qr:read", "qr:write", "analytics:read"],
  "expiresAt": "2024-12-31T23:59:59Z",
  "rateLimit": {
    "requestsPerMinute": 60,
    "requestsPerHour": 1000,
    "requestsPerDay": 10000
  },
  "ipWhitelist": ["192.168.1.1", "10.0.0.0/8"]
}
```

**Response:**
```json
{
  "message": "API key created successfully",
  "apiKey": "ak_1234567890abcdef...",
  "data": {
    "id": "uuid",
    "name": "My API Key",
    "prefix": "ak_12345",
    "permissions": ["qr:read", "qr:write", "analytics:read"],
    "expiresAt": "2024-12-31T23:59:59Z",
    "rateLimit": {
      "requestsPerMinute": 60,
      "requestsPerHour": 1000,
      "requestsPerDay": 10000
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/v1/keys
Get all API keys for the authenticated user.

**Response:**
```json
{
  "message": "API keys retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "My API Key",
      "prefix": "ak_12345",
      "permissions": ["qr:read", "qr:write"],
      "isActive": true,
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "usageCount": 150,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### DELETE /api/v1/keys/:keyId
Revoke an API key.

**Response:**
```json
{
  "message": "API key revoked successfully",
  "keyId": "uuid"
}
```

#### GET /api/v1/keys/:keyId/stats
Get usage statistics for an API key.

**Query Parameters:**
- `days` (optional): Number of days to include (default: 30)

**Response:**
```json
{
  "message": "API key statistics retrieved successfully",
  "data": {
    "keyId": "uuid",
    "period": "30 days",
    "stats": [
      {
        "date": "2024-01-15",
        "requests": 250,
        "avg_response_time": 120,
        "errors": 5
      }
    ]
  }
}
```

### Webhook Management

#### POST /api/v1/webhooks
Create a new webhook for real-time event notifications.

**Request Body:**
```json
{
  "url": "https://yourapp.com/webhook",
  "events": ["qr.created", "qr.scanned", "qr.updated", "qr.deleted"],
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffStrategy": "exponential",
    "initialDelay": 1000
  },
  "headers": {
    "Authorization": "Bearer your-token",
    "X-Custom-Header": "value"
  },
  "timeout": 30000
}
```

#### GET /api/v1/webhooks
Get all webhooks for the authenticated user.

#### GET /api/v1/webhooks/:webhookId/deliveries
Get webhook delivery history and status.

### Public API (API Key Required)

#### POST /api/v1/public/qr/generate
Generate a QR code using API key authentication.

**Headers:**
```
Authorization: Bearer ak_1234567890abcdef...
```

**Request Body:**
```json
{
  "data": "https://example.com",
  "format": "png", 
  "size": 300
}
```

#### GET /api/v1/public/qr
List QR codes via API key.

## Swagger Documentation

The complete API documentation is available at:
- **Interactive UI**: `http://localhost:3006/api-docs`
- **JSON Spec**: `http://localhost:3006/api-docs.json`
```

## Database Schema

The service uses PostgreSQL with the following main tables:

- **api_keys**: Store API key metadata and configuration
- **api_key_usage**: Track API key usage and performance metrics
- **webhooks**: Store webhook configurations
- **webhook_deliveries**: Track webhook delivery attempts and status
- **integrations**: Store third-party integration configurations

See `src/config/database.sql` for the complete schema.

## Environment Variables

```bash
NODE_ENV=development
PORT=3006
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qr_saas
DB_USER=qr_user
DB_PASSWORD=qr_password
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:3000
```

## Development

### Setup
```bash
cd services/api-service
npm install
npm run dev
```

### Testing
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Building
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t api-service .
docker run -p 3006:3006 api-service
```

Or use docker-compose from the root:
```bash
docker-compose up api-service
```

## Security Features

- **API Key Hashing**: API keys are hashed using bcrypt before storage
- **Rate Limiting**: Configurable rate limiting per API key
- **IP Whitelisting**: Optional IP address restrictions
- **Permission System**: Granular permissions for API access
- **Secure Headers**: Helmet.js for security headers
- **Input Validation**: Joi schema validation for all inputs
- **CORS Protection**: Configurable CORS policies

## Monitoring

- **Health Check**: `GET /health` endpoint for service monitoring
- **Usage Tracking**: All API usage is logged and tracked
- **Error Logging**: Comprehensive error logging with Winston
- **Performance Metrics**: Response time tracking for optimization

## Integration Examples

### Using an API Key
```javascript
const response = await fetch('http://localhost:3006/api/v1/qr/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ak_1234567890abcdef...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: 'https://example.com',
    format: 'png'
  })
});
```

### Setting up a Webhook
```javascript
const webhook = await fetch('http://localhost:3006/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <jwt_token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://yoursite.com/webhook',
    events: ['qr.created', 'qr.scanned'],
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000
    }
  })
});
```

## 🚀 API Endpoints Ready
## Management APIs (JWT Auth Required)
POST   /api/v1/keys                    # Create API key
GET    /api/v1/keys                    # List user's API keys  
DELETE /api/v1/keys/:keyId             # Revoke API key
GET    /api/v1/keys/:keyId/stats       # Get usage statistics

POST   /api/v1/webhooks                # Create webhook
GET    /api/v1/webhooks                # List user's webhooks
GET    /api/v1/webhooks/:webhookId     # Get webhook details
PUT    /api/v1/webhooks/:webhookId     # Update webhook
DELETE /api/v1/webhooks/:webhookId     # Delete webhook
GET    /api/v1/webhooks/:webhookId/deliveries  # Get delivery history

## Public APIs (API Key Auth Required)
POST   /api/v1/public/qr/generate      # Generate QR code
GET    /api/v1/public/qr/:qrId         # Get QR code
PUT    /api/v1/public/qr/:qrId         # Update QR code
DELETE /api/v1/public/qr/:qrId         # Delete QR code
GET    /api/v1/public/qr               # List QR codes

## Documentation
GET    /api-docs                       # Interactive Swagger UI
GET    /api-docs.json                  # OpenAPI 3.0 JSON specification
GET    /health                         # Service health check

## Future Enhancements

1. **API Documentation**: Auto-generated OpenAPI documentation
2. **Rate Limiting**: Redis-based distributed rate limiting
3. **Webhook Management**: Complete webhook delivery system
4. **Third-party Integrations**: Zapier, IFTTT, Make.com connectors
5. **Analytics Dashboard**: API usage analytics and insights
6. **Monitoring**: APM integration and alerting
7. **Caching**: Redis caching for improved performance
8. **Queue System**: Background job processing for webhooks


