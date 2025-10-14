/**
 * Bulk QR Code Generation Routes Documentation
 * OpenAPI 3.0 specification for bulk QR operations
 */

export const bulkQRRoutes = {
  // Bulk Templates
  '/api/bulk/templates': {
    get: {
      tags: ['Bulk QR Generation'],
      summary: 'Get all bulk QR templates',
      description: 'Retrieve all available bulk QR templates (system and user templates)',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Bulk templates retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/BulkQRTemplate' }
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                      total: { type: 'integer', example: 10 }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    post: {
      tags: ['Bulk QR Generation'],
      summary: 'Create a new bulk QR template',
      description: 'Create a custom bulk QR template for reusable bulk operations',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBulkTemplateRequest' }
          }
        }
      },
      responses: {
        201: {
          description: 'Bulk template created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkQRTemplate' },
                  metadata: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid template data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        401: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/bulk/templates/{templateId}': {
    get: {
      tags: ['Bulk QR Generation'],
      summary: 'Get bulk template by ID',
      description: 'Retrieve a specific bulk QR template by its ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'templateId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk template ID'
        }
      ],
      responses: {
        200: {
          description: 'Bulk template retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkQRTemplate' },
                  metadata: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Template not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    put: {
      tags: ['Bulk QR Generation'],
      summary: 'Update bulk template',
      description: 'Update an existing bulk QR template (only user templates)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'templateId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk template ID'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', maxLength: 255 },
                description: { type: 'string' },
                fieldMappings: {
                  type: 'object',
                  additionalProperties: { type: 'string' }
                },
                defaultValues: { type: 'object' },
                validationRules: { type: 'object' },
                qrSettings: { type: 'object' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Template updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkQRTemplate' }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid template data or system template',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        404: {
          description: 'Template not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['Bulk QR Generation'],
      summary: 'Delete bulk template',
      description: 'Delete a user-created bulk QR template (system templates cannot be deleted)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'templateId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk template ID'
        }
      ],
      responses: {
        200: {
          description: 'Template deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        400: {
          description: 'Cannot delete system template',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        404: {
          description: 'Template not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  // Bulk Batches
  '/api/bulk/batches': {
    get: {
      tags: ['Bulk QR Generation'],
      summary: 'Get user bulk batches',
      description: 'Retrieve bulk QR generation batches for the authenticated user',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          description: 'Number of batches to return'
        },
        {
          name: 'offset',
          in: 'query',
          schema: { type: 'integer', minimum: 0, default: 0 },
          description: 'Number of batches to skip'
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled']
          },
          description: 'Filter by batch status'
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['created_at', 'updated_at', 'batch_name'],
            default: 'created_at'
          },
          description: 'Sort field'
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          },
          description: 'Sort order'
        }
      ],
      responses: {
        200: {
          description: 'Batches retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/BulkQRBatch' }
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                      total: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    post: {
      tags: ['Bulk QR Generation'],
      summary: 'Create bulk QR batch',
      description: 'Create a new bulk QR generation batch',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBulkBatchRequest' }
          }
        }
      },
      responses: {
        201: {
          description: 'Bulk batch created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkQRBatch' },
                  metadata: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                      total: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid batch data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        401: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/bulk/batches/{batchId}': {
    get: {
      tags: ['Bulk QR Generation'],
      summary: 'Get bulk batch by ID',
      description: 'Retrieve a specific bulk QR batch by its ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'batchId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk batch ID'
        }
      ],
      responses: {
        200: {
          description: 'Batch retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkQRBatch' }
                }
              }
            }
          }
        },
        401: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        404: {
          description: 'Batch not found or access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['Bulk QR Generation'],
      summary: 'Delete bulk batch',
      description: 'Delete a bulk QR batch (cannot delete while processing)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'batchId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk batch ID'
        }
      ],
      responses: {
        200: {
          description: 'Batch deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        400: {
          description: 'Cannot delete batch while processing',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        401: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        404: {
          description: 'Batch not found or access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/bulk/batches/{batchId}/process': {
    post: {
      tags: ['Bulk QR Generation'],
      summary: 'Process bulk batch',
      description: 'Start processing a bulk QR batch to generate QR codes',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'batchId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk batch ID'
        }
      ],
      responses: {
        200: {
          description: 'Batch processing started successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkProcessingResult' }
                }
              }
            }
          }
        },
        400: {
          description: 'Batch cannot be processed (invalid status)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        404: {
          description: 'Batch not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/bulk/batches/{batchId}/cancel': {
    post: {
      tags: ['Bulk QR Generation'],
      summary: 'Cancel bulk batch',
      description: 'Cancel a pending or processing bulk QR batch',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'batchId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk batch ID'
        }
      ],
      responses: {
        200: {
          description: 'Batch cancelled successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        400: {
          description: 'Batch cannot be cancelled (invalid status)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        401: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        404: {
          description: 'Batch not found or access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/bulk/batches/{batchId}/progress': {
    get: {
      tags: ['Bulk QR Generation'],
      summary: 'Get batch progress',
      description: 'Get real-time progress of a bulk QR batch processing',
      parameters: [
        {
          name: 'batchId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Bulk batch ID'
        }
      ],
      responses: {
        200: {
          description: 'Batch progress retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkBatchProgress' }
                }
              }
            }
          }
        },
        404: {
          description: 'Batch not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  // Bulk Processing
  '/api/bulk/process-csv': {
    post: {
      tags: ['Bulk QR Generation'],
      summary: 'Process CSV data',
      description: 'Parse and validate CSV data for bulk QR generation',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['csvData'],
              properties: {
                csvData: {
                  type: 'string',
                  description: 'CSV data as string'
                },
                templateId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Optional template ID for validation'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'CSV processed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/ParsedBulkData' }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid CSV data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  '/api/bulk/validate': {
    post: {
      tags: ['Bulk QR Generation'],
      summary: 'Validate bulk data',
      description: 'Validate bulk data against template rules',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['data'],
              properties: {
                data: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Array of data objects to validate'
                },
                templateId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Optional template ID for validation rules'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Data validated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkValidationResult' }
                }
              }
            }
          }
        },
        400: {
          description: 'Invalid data format',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },

  // Statistics
  '/api/bulk/stats': {
    get: {
      tags: ['Bulk QR Generation'],
      summary: 'Get bulk generation statistics',
      description: 'Get bulk QR generation statistics for the authenticated user',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'days',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          description: 'Number of days to include in statistics'
        }
      ],
      responses: {
        200: {
          description: 'Statistics retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/BulkStats' }
                }
              }
            }
          }
        },
        401: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  }
};

// Bulk QR Schemas
export const bulkQRSchemas = {
  BulkQRTemplate: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid', nullable: true },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      templateType: {
        type: 'string',
        enum: ['url_list', 'vcard_bulk', 'product_bulk', 'event_tickets', 'wifi_bulk', 'csv_mapping', 'custom']
      },
      fieldMappings: {
        type: 'object',
        additionalProperties: { type: 'string' }
      },
      defaultValues: { type: 'object' },
      validationRules: { type: 'object' },
      qrSettings: { type: 'object' },
      isSystemTemplate: { type: 'boolean' },
      isActive: { type: 'boolean' },
      usageCount: { type: 'integer', minimum: 0 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    },
    required: ['id', 'name', 'templateType', 'fieldMappings', 'isSystemTemplate', 'isActive', 'usageCount', 'createdAt', 'updatedAt']
  },

  CreateBulkTemplateRequest: {
    type: 'object',
    required: ['name', 'templateType', 'fieldMappings'],
    properties: {
      name: { type: 'string', maxLength: 255 },
      description: { type: 'string' },
      templateType: {
        type: 'string',
        enum: ['url_list', 'vcard_bulk', 'product_bulk', 'event_tickets', 'wifi_bulk', 'csv_mapping', 'custom']
      },
      fieldMappings: {
        type: 'object',
        additionalProperties: { type: 'string' },
        minProperties: 1
      },
      defaultValues: { type: 'object' },
      validationRules: { type: 'object' },
      qrSettings: { type: 'object' }
    }
  },

  BulkQRBatch: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      batchName: { type: 'string' },
      description: { type: 'string', nullable: true },
      templateId: { type: 'string', format: 'uuid', nullable: true },
      categoryId: { type: 'string', format: 'uuid', nullable: true },
      totalCount: { type: 'integer', minimum: 0 },
      processedCount: { type: 'integer', minimum: 0 },
      successCount: { type: 'integer', minimum: 0 },
      failedCount: { type: 'integer', minimum: 0 },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled']
      },
      processingStartedAt: { type: 'string', format: 'date-time', nullable: true },
      processingCompletedAt: { type: 'string', format: 'date-time', nullable: true },
      inputFileId: { type: 'string', format: 'uuid', nullable: true },
      inputData: { type: 'object', nullable: true },
      errorLog: { type: 'object', nullable: true },
      progressPercentage: { type: 'integer', minimum: 0, maximum: 100 },
      estimatedCompletionTime: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    },
    required: ['id', 'userId', 'batchName', 'totalCount', 'processedCount', 'successCount', 'failedCount', 'status', 'progressPercentage', 'createdAt', 'updatedAt']
  },

  CreateBulkBatchRequest: {
    type: 'object',
    required: ['batchName', 'inputData'],
    properties: {
      batchName: { type: 'string', maxLength: 255 },
      description: { type: 'string' },
      templateId: { type: 'string', format: 'uuid' },
      categoryId: { type: 'string', format: 'uuid' },
      inputData: {
        type: 'array',
        items: { type: 'object' },
        minItems: 1,
        maxItems: 10000
      },
      inputFileId: { type: 'string', format: 'uuid' },
      processImmediately: { type: 'boolean', default: false }
    }
  },

  BulkBatchProgress: {
    type: 'object',
    properties: {
      batchId: { type: 'string', format: 'uuid' },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled']
      },
      totalCount: { type: 'integer', minimum: 0 },
      processedCount: { type: 'integer', minimum: 0 },
      successCount: { type: 'integer', minimum: 0 },
      failedCount: { type: 'integer', minimum: 0 },
      progressPercentage: { type: 'integer', minimum: 0, maximum: 100 },
      estimatedCompletionTime: { type: 'string', format: 'date-time', nullable: true },
      currentItem: { type: 'string', nullable: true },
      errorLog: { type: 'object', nullable: true }
    },
    required: ['batchId', 'status', 'totalCount', 'processedCount', 'successCount', 'failedCount', 'progressPercentage']
  },

  BulkProcessingResult: {
    type: 'object',
    properties: {
      batchId: { type: 'string', format: 'uuid' },
      success: { type: 'boolean' },
      totalProcessed: { type: 'integer', minimum: 0 },
      successfullyCreated: { type: 'integer', minimum: 0 },
      failed: { type: 'integer', minimum: 0 },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            row: { type: 'integer' },
            field: { type: 'string' },
            message: { type: 'string' },
            value: {}
          },
          required: ['row', 'message']
        }
      }
    },
    required: ['batchId', 'success', 'totalProcessed', 'successfullyCreated', 'failed', 'errors']
  },

  ParsedBulkData: {
    type: 'object',
    properties: {
      totalRows: { type: 'integer', minimum: 0 },
      validRows: { type: 'integer', minimum: 0 },
      invalidRows: { type: 'integer', minimum: 0 },
      data: {
        type: 'array',
        items: { type: 'object' }
      },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            row: { type: 'integer' },
            field: { type: 'string' },
            message: { type: 'string' },
            value: {}
          },
          required: ['row', 'message']
        }
      }
    },
    required: ['totalRows', 'validRows', 'invalidRows', 'data', 'errors']
  },

  BulkValidationResult: {
    type: 'object',
    properties: {
      isValid: { type: 'boolean' },
      totalItems: { type: 'integer', minimum: 0 },
      validItems: { type: 'integer', minimum: 0 },
      invalidItems: { type: 'integer', minimum: 0 },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            row: { type: 'integer' },
            field: { type: 'string' },
            message: { type: 'string' },
            value: {}
          },
          required: ['row', 'message']
        }
      },
      warnings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            row: { type: 'integer' },
            field: { type: 'string' },
            message: { type: 'string' },
            value: {}
          },
          required: ['row', 'message']
        }
      }
    },
    required: ['isValid', 'totalItems', 'validItems', 'invalidItems', 'errors', 'warnings']
  },

  BulkStats: {
    type: 'object',
    properties: {
      totalBatches: { type: 'integer', minimum: 0 },
      completedBatches: { type: 'integer', minimum: 0 },
      processingBatches: { type: 'integer', minimum: 0 },
      failedBatches: { type: 'integer', minimum: 0 },
      totalQRCodes: { type: 'integer', minimum: 0 },
      avgBatchSize: { type: 'number', minimum: 0 },
      successRate: { type: 'number', minimum: 0, maximum: 100 }
    },
    required: ['totalBatches', 'completedBatches', 'processingBatches', 'failedBatches', 'totalQRCodes', 'avgBatchSize', 'successRate']
  }
};