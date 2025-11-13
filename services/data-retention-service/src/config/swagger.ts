import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Data Retention Service API',
      version: '1.0.0',
      description: `
        Automated data cleanup and GDPR compliance service for the QR SaaS platform.
        
        This service provides:
        - Data retention policy management
        - Automated data cleanup and archival
        - GDPR compliance features
        - Data subject request handling
        - Compliance reporting
        
        ## Authentication
        Most endpoints require authentication via JWT token in the Authorization header.
        
        ## Rate Limiting
        API endpoints are rate limited to prevent abuse.
        
        ## Compliance Features
        - Right to be forgotten (data erasure)
        - Right of access (data export)
        - Data portability
        - Retention policy enforcement
      `,
      contact: {
        name: 'QR SaaS Platform',
        email: 'support@qrsaas.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3016}`,
        description: 'Development server'
      },
      {
        url: `https://api.qrsaas.com`,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization header'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service communication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Detailed error message'
            },
            requestId: {
              type: 'string',
              description: 'Request tracking ID'
            }
          },
          required: ['error', 'message']
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded'],
              description: 'Overall service health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            service: {
              type: 'string',
              description: 'Service name'
            },
            version: {
              type: 'string',
              description: 'Service version'
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy']
                },
                scheduler: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy']
                },
                storage: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy']
                }
              }
            },
            metrics: {
              type: 'object',
              properties: {
                uptime: {
                  type: 'number',
                  description: 'Service uptime in seconds'
                },
                activeConnections: {
                  type: 'number',
                  description: 'Active database connections'
                },
                pendingJobs: {
                  type: 'number',
                  description: 'Number of pending retention jobs'
                },
                lastExecution: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Last policy execution time'
                }
              }
            }
          }
        },
        DataRetentionPolicy: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique policy identifier'
            },
            name: {
              type: 'string',
              description: 'Policy name'
            },
            description: {
              type: 'string',
              description: 'Policy description'
            },
            table_name: {
              type: 'string',
              description: 'Target database table'
            },
            retention_period_days: {
              type: 'integer',
              minimum: 1,
              description: 'Retention period in days'
            },
            date_column: {
              type: 'string',
              description: 'Date column for retention calculation'
            },
            conditions: {
              type: 'object',
              description: 'Additional conditions for selective retention'
            },
            archive_before_delete: {
              type: 'boolean',
              description: 'Whether to archive data before deletion'
            },
            archive_location: {
              type: 'string',
              description: 'Archive storage location'
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the policy is active'
            },
            execution_cron: {
              type: 'string',
              description: 'Cron expression for automated execution'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            },
            last_executed: {
              type: 'string',
              format: 'date-time'
            },
            next_execution: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['name', 'table_name', 'retention_period_days', 'date_column']
        },
        RetentionExecution: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Execution identifier'
            },
            policy_id: {
              type: 'string',
              description: 'Associated policy ID'
            },
            started_at: {
              type: 'string',
              format: 'date-time'
            },
            completed_at: {
              type: 'string',
              format: 'date-time'
            },
            status: {
              type: 'string',
              enum: ['running', 'completed', 'failed', 'cancelled']
            },
            records_processed: {
              type: 'integer',
              minimum: 0
            },
            records_archived: {
              type: 'integer',
              minimum: 0
            },
            records_deleted: {
              type: 'integer',
              minimum: 0
            },
            error_message: {
              type: 'string'
            },
            execution_metadata: {
              type: 'object'
            }
          }
        },
        DataSubjectRequest: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Request identifier'
            },
            request_type: {
              type: 'string',
              enum: ['access', 'portability', 'erasure', 'rectification'],
              description: 'Type of GDPR request'
            },
            subject_identifier_type: {
              type: 'string',
              enum: ['email', 'user_id', 'phone', 'other']
            },
            subject_identifier: {
              type: 'string',
              description: 'Data subject identifier value'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'rejected', 'expired']
            },
            requested_at: {
              type: 'string',
              format: 'date-time'
            },
            completed_at: {
              type: 'string',
              format: 'date-time'
            },
            requester_email: {
              type: 'string',
              format: 'email'
            },
            description: {
              type: 'string'
            },
            verification_token: {
              type: 'string'
            },
            verified_at: {
              type: 'string',
              format: 'date-time'
            },
            response_location: {
              type: 'string'
            }
          },
          required: ['request_type', 'subject_identifier_type', 'subject_identifier', 'requester_email']
        },
        Pagination: {
          type: 'object',
          properties: {
            current_page: {
              type: 'integer',
              minimum: 1
            },
            total_pages: {
              type: 'integer',
              minimum: 0
            },
            total_records: {
              type: 'integer',
              minimum: 0
            },
            records_per_page: {
              type: 'integer',
              minimum: 1
            },
            has_next: {
              type: 'boolean'
            },
            has_previous: {
              type: 'boolean'
            }
          }
        }
      },
      responses: {
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Invalid request data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Service health and monitoring'
      },
      {
        name: 'Policies',
        description: 'Data retention policy management'
      },
      {
        name: 'Executions',
        description: 'Policy execution monitoring'
      },
      {
        name: 'Archives',
        description: 'Data archive management'
      },
      {
        name: 'Compliance',
        description: 'GDPR compliance and reporting'
      },
      {
        name: 'Subject Requests',
        description: 'Data subject request handling'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/app.ts'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;