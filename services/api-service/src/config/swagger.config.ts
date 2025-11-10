import { OpenAPIV3 } from 'openapi-types';

export const apiServiceSwaggerDoc: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
        title: 'QR SaaS API Service',
        version: '1.0.0',
        description: 'API service for third-party integrations, API key management, and webhook notifications',
        contact: {
            name: 'QR SaaS Support',
            email: 'support@qrsaas.com'
        }
    },
    servers: [
        {
            url: 'http://localhost:3006',
            description: 'Development server'
        }
    ],
    paths: {
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Service health check',
                responses: {
                    '200': {
                        description: 'Service is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'healthy' },
                                        service: { type: 'string', example: 'api-service' },
                                        timestamp: { type: 'string', format: 'date-time' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/v1/keys': {
            get: {
                tags: ['API Keys'],
                summary: 'Get user API keys',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'API keys retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/ApiKeyResponse' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ['API Keys'],
                summary: 'Create new API key',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateApiKeyRequest' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'API key created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        apiKey: { type: 'string', description: 'The actual API key - only shown once' },
                                        data: { $ref: '#/components/schemas/ApiKeyResponse' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/v1/webhooks': {
            get: {
                tags: ['Webhooks'],
                summary: 'Get user webhooks',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Webhooks retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/WebhookResponse' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ['Webhooks'],
                summary: 'Create new webhook',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateWebhookRequest' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Webhook created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        data: { $ref: '#/components/schemas/WebhookResponse' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/v1/public/qr/generate': {
            post: {
                tags: ['Public API'],
                summary: 'Generate QR code via API key',
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    data: { type: 'string', description: 'Data to encode in QR' },
                                    format: { type: 'string', enum: ['png', 'svg'], default: 'png' },
                                    size: { type: 'number', minimum: 100, maximum: 2000, default: 300 },
                                    errorCorrectionLevel: { type: 'string', enum: ['L', 'M', 'Q', 'H'], default: 'M' }
                                },
                                required: ['data']
                            }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'QR code generated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        data: { type: 'string' },
                                        format: { type: 'string' },
                                        size: { type: 'number' },
                                        url: { type: 'string' },
                                        createdAt: { type: 'string', format: 'date-time' }
                                    }
                                }
                            }
                        }
                    },
                    '401': {
                        description: 'Invalid API key',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '403': {
                        description: 'Insufficient permissions',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '429': {
                        description: 'Rate limit exceeded',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: { type: 'string' },
                                        message: { type: 'string' },
                                        resetTime: { type: 'string', format: 'date-time' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/v1/sdks/generate': {
            post: {
                tags: ['SDK Generation'],
                summary: 'Generate SDK for specified language',
                description: 'Creates auto-generated client libraries from OpenAPI specification',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SdkGenerationRequest' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'SDK generation started successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        data: { $ref: '#/components/schemas/SdkGenerationResponse' }
                                    }
                                }
                            }
                        }
                    },
                    '409': {
                        description: 'SDK generation already in progress',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: { type: 'string' },
                                        message: { type: 'string' },
                                        jobId: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/v1/sdks/{jobId}/download': {
            get: {
                tags: ['SDK Generation'],
                summary: 'Download generated SDK',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'jobId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'SDK generation job ID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'SDK download file',
                        content: {
                            'application/zip': {
                                schema: {
                                    type: 'string',
                                    format: 'binary'
                                }
                            }
                        },
                        headers: {
                            'Content-Disposition': {
                                description: 'Attachment filename',
                                schema: { type: 'string' }
                            }
                        }
                    },
                    '400': {
                        description: 'SDK not ready or expired',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '404': {
                        description: 'SDK job not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/v1/sdks/{jobId}/status': {
            get: {
                tags: ['SDK Generation'],
                summary: 'Get SDK generation status',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'jobId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'uuid' },
                        description: 'SDK generation job ID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'SDK status retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        data: { $ref: '#/components/schemas/SdkJobStatus' }
                                    }
                                }
                            }
                        }
                    },
                    '404': {
                        description: 'SDK job not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/v1/sdks': {
            get: {
                tags: ['SDK Generation'],
                summary: 'Get user SDK generation history',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'User SDKs retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string' },
                                        data: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/SdkJobStatus' }
                                        },
                                        total: { type: 'number' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token for user authentication'
            },
            ApiKeyAuth: {
                type: 'http',
                scheme: 'bearer',
                description: 'API key for third-party access. Format: Bearer <api_key>'
            }
        },
        schemas: {
            CreateApiKeyRequest: {
                type: 'object',
                required: ['name', 'permissions'],
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 100, example: 'My Integration API Key' },
                    permissions: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['qr:read', 'qr:write', 'analytics:read']
                    },
                    expiresAt: { type: 'string', format: 'date-time', example: '2024-12-31T23:59:59Z' },
                    rateLimit: {
                        type: 'object',
                        properties: {
                            requestsPerMinute: { type: 'number', minimum: 1, maximum: 1000, default: 60 },
                            requestsPerHour: { type: 'number', minimum: 1, maximum: 100000, default: 1000 },
                            requestsPerDay: { type: 'number', minimum: 1, maximum: 1000000, default: 10000 }
                        }
                    },
                    ipWhitelist: {
                        type: 'array',
                        items: { type: 'string', format: 'ipv4' },
                        example: ['192.168.1.1', '10.0.0.0/8']
                    }
                }
            },
            ApiKeyResponse: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    prefix: { type: 'string', example: 'ak_12345' },
                    permissions: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                    expiresAt: { type: 'string', format: 'date-time' },
                    lastUsedAt: { type: 'string', format: 'date-time' },
                    usageCount: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            CreateWebhookRequest: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                    url: { type: 'string', format: 'uri', example: 'https://yourapp.com/webhook' },
                    events: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['qr.created', 'qr.scanned', 'qr.updated', 'qr.deleted']
                    },
                    retryPolicy: {
                        type: 'object',
                        properties: {
                            maxAttempts: { type: 'number', minimum: 1, maximum: 10, default: 3 },
                            backoffStrategy: { type: 'string', enum: ['linear', 'exponential'], default: 'exponential' },
                            initialDelay: { type: 'number', minimum: 100, maximum: 60000, default: 1000 }
                        }
                    },
                    headers: {
                        type: 'object',
                        additionalProperties: { type: 'string' },
                        example: { 'Authorization': 'Bearer your-token', 'X-Custom-Header': 'value' }
                    },
                    timeout: { type: 'number', minimum: 1000, maximum: 60000, default: 30000 }
                }
            },
            WebhookResponse: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    url: { type: 'string', format: 'uri' },
                    events: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                    retryPolicy: {
                        type: 'object',
                        properties: {
                            maxAttempts: { type: 'number' },
                            backoffStrategy: { type: 'string' },
                            initialDelay: { type: 'number' }
                        }
                    },
                    timeout: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                    message: { type: 'string' }
                }
            },
            SdkGenerationRequest: {
                type: 'object',
                required: ['language', 'packageName'],
                properties: {
                    language: {
                        type: 'string',
                        enum: ['javascript', 'typescript-fetch', 'python', 'php', 'java', 'csharp-netcore', 'go'],
                        description: 'Programming language for the SDK'
                    },
                    packageName: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100,
                        pattern: '^[a-zA-Z0-9_-]+$',
                        example: 'my-qr-client',
                        description: 'Name of the generated package/library'
                    },
                    version: {
                        type: 'string',
                        pattern: '^\\d+\\.\\d+\\.\\d+$',
                        default: '1.0.0',
                        example: '1.0.0',
                        description: 'Semantic version for the SDK package'
                    },
                    clientName: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100,
                        example: 'QRSaaSClient',
                        description: 'Name of the main client class (optional)'
                    },
                    namespace: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100,
                        example: 'MyCompany',
                        description: 'Namespace/organization name for the package (optional)'
                    }
                }
            },
            SdkGenerationResponse: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', description: 'Unique job identifier' },
                    language: { type: 'string', example: 'javascript' },
                    packageName: { type: 'string', example: 'my-qr-client' },
                    downloadUrl: { type: 'string', example: '/api/v1/sdks/123e4567-e89b-12d3-a456-426614174000/download' },
                    expiresAt: { type: 'string', format: 'date-time', description: 'When the download expires' },
                    generatedAt: { type: 'string', format: 'date-time', description: 'When generation was started' },
                    status: {
                        type: 'string',
                        enum: ['pending', 'generating', 'completed', 'failed', 'expired'],
                        example: 'pending'
                    }
                }
            },
            SdkJobStatus: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    language: { type: 'string' },
                    packageName: { type: 'string' },
                    status: {
                        type: 'string',
                        enum: ['pending', 'generating', 'completed', 'failed', 'expired']
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    completedAt: { type: 'string', format: 'date-time', nullable: true },
                    expiresAt: { type: 'string', format: 'date-time' },
                    errorMessage: { type: 'string', nullable: true, description: 'Error message if generation failed' },
                    downloadUrl: { type: 'string', nullable: true, description: 'Download URL when completed' }
                }
            }
        }
    }
};