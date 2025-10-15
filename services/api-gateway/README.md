# API Gateway Service

The central API gateway that handles routing, authentication, and provides comprehensive API documentation.

## 🎯 Purpose
- **Request Routing**: Route requests to appropriate microservices
- **Authentication**: JWT-based authentication middleware
- **API Documentation**: Swagger/OpenAPI 3.0 documentation portal
- **Request Validation**: Input validation and sanitization
- **Error Handling**: Centralized error handling and responses

## ✅ Features
- ✅ **Swagger Documentation**: Complete API docs at `/api-docs`
- ✅ **Authentication Middleware**: JWT token validation
- ✅ **Proxy Routing**: Smart routing to microservices
- ✅ **Health Checks**: Service health monitoring
- ✅ **CORS Support**: Cross-origin request handling
- ✅ **Rate Limiting**: Basic rate limiting implementation

## 🚀 API Documentation
- **Main Portal**: `http://localhost:3000/api-docs`
- **JSON Spec**: `http://localhost:3000/api-docs.json`
- **Coverage**: All endpoints with examples and schemas

## 📁 Structure
```
src/
├── app.ts              # Express app configuration
├── index.ts            # Server entry point
├── config/
│   └── swagger.ts      # Swagger/OpenAPI configuration
├── controllers/
│   ├── health.controller.ts  # Health check endpoints
│   └── proxy.controller.ts   # Service proxy logic
├── docs/               # API documentation schemas
├── middleware/         # Authentication and validation
├── services/           # Service communication logic
└── utils/             # Utility functions
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

## 🌐 Endpoints
- `GET /health` - Service health check
- `GET /api-docs` - Swagger documentation
- `/*` - Proxy to appropriate microservice

## 🔗 Service Routing
- `/api/users/*` → User Service (Port 3001)
- `/api/qr/*` → QR Service (Port 3002)
- `/api/analytics/*` → Analytics Service (Port 3003)
- `/api/files/*` → File Service (Port 3004)
- `/api/notifications/*` → Notification Service (Port 3005)

## 🔐 Authentication
Uses JWT tokens with middleware validation. Include `Authorization: Bearer <token>` header for protected routes.

## 📝 Configuration
Environment variables:
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (development/production)
- Service URLs for routing