import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './environment.config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.swagger.title,
      version: config.swagger.version,
      description: config.swagger.description,
      contact: {
        name: 'QR SaaS Development Team',
        email: 'admin@qr-saas.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: config.environment === 'development' 
          ? `http://localhost:${config.port}` 
          : 'https://admin.qr-saas.com',
        description: config.environment === 'development' ? 'Development Server' : 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Admin JWT token for authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request data' },
                timestamp: { type: 'string', format: 'date-time' },
                path: { type: 'string', example: '/api/content/posts' },
                method: { type: 'string', example: 'POST' }
              }
            }
          }
        },
        AdminUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['super_admin', 'content_admin', 'analytics_admin', 'user_admin', 'support_admin', 'marketing_admin']
            },
            lastLoginAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@qr-saas.com' },
            password: { type: 'string', minLength: 6, example: 'Admin@123456' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Authentication successful' },
            admin: { $ref: '#/components/schemas/AdminUser' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        ContentPost: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'How to Create QR Codes' },
            content: { type: 'string', example: 'QR codes are versatile tools...' },
            excerpt: { type: 'string', example: 'Learn the basics of QR code creation' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            categoryId: { type: 'string', format: 'uuid' },
            authorId: { type: 'string', format: 'uuid' },
            publishedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'Admin Dashboard Service' },
            status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', example: 3600.5 },
            version: { type: 'string', example: '1.0.0' },
            environment: { type: 'string', enum: ['development', 'production'] },
            port: { type: 'number', example: 3013 }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Service health monitoring endpoints'
      },
      {
        name: 'Authentication',
        description: 'Admin authentication and authorization'
      },
      {
        name: 'Dashboard',
        description: 'Admin dashboard overview and metrics'
      },
      {
        name: 'Content Management',
        description: 'Content and media management endpoints'
      },
      {
        name: 'User Management',
        description: 'User account management endpoints'
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints'
      },
      {
        name: 'Admin Management',
        description: 'Admin user and system management'
      }
    ]
  },
  apis: [
    './src/routes/*.ts', // Path to the API routes
    './src/controllers/*.ts' // Path to the controllers (if any)
  ]
};

const swaggerSpec = swaggerJsdoc(options) as any;

export = swaggerSpec;