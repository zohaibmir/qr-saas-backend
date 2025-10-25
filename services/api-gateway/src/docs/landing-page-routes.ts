/**
 * Landing Page Routes Documentation
 * Comprehensive API documentation for landing page management endpoints
 */

export const landingPageRoutes = {
  '/api/landing/pages': {
    get: {
      summary: 'Get user landing pages',
      description: 'Retrieve all landing pages for the authenticated user with pagination and filtering',
      tags: ['Landing Pages'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Number of pages per page',
          required: false,
          schema: { type: 'integer', default: 10, maximum: 100 }
        },
        {
          name: 'status',
          in: 'query',
          description: 'Filter by page status',
          required: false,
          schema: { type: 'string', enum: ['published', 'draft', 'archived'] }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Search pages by name or title',
          required: false,
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Landing pages retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      pages: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LandingPage' }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    },
    post: {
      summary: 'Create landing page',
      description: 'Create a new landing page for QR code campaigns',
      tags: ['Landing Pages'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'title', 'templateId'],
              properties: {
                name: { type: 'string', description: 'Internal page name' },
                title: { type: 'string', description: 'Page title' },
                description: { type: 'string', description: 'Page description' },
                templateId: { type: 'string', description: 'Template ID to use' },
                qrCodeId: { type: 'string', description: 'Associated QR code ID' },
                content: { type: 'string', description: 'Page HTML content' },
                styles: { type: 'object', description: 'Custom CSS styles' },
                settings: { type: 'object', description: 'Page configuration' },
                seoTitle: { type: 'string', description: 'SEO title' },
                seoDescription: { type: 'string', description: 'SEO description' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Landing page created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/LandingPage' }
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  },

  '/api/landing/pages/{id}': {
    get: {
      summary: 'Get landing page',
      description: 'Retrieve a specific landing page by ID',
      tags: ['Landing Pages'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Landing page ID',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Landing page retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/LandingPage' }
                }
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    },
    put: {
      summary: 'Update landing page',
      description: 'Update an existing landing page',
      tags: ['Landing Pages'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Landing page ID',
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                content: { type: 'string' },
                styles: { type: 'object' },
                settings: { type: 'object' },
                seoTitle: { type: 'string' },
                seoDescription: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Landing page updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/LandingPage' }
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        404: { $ref: '#/components/responses/NotFound' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    },
    delete: {
      summary: 'Delete landing page',
      description: 'Delete a landing page permanently',
      tags: ['Landing Pages'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Landing page ID',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Landing page deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  },

  '/api/landing/pages/{id}/publish': {
    put: {
      summary: 'Publish/unpublish landing page',
      description: 'Toggle the published status of a landing page',
      tags: ['Landing Pages'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Landing page ID',
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['isPublished'],
              properties: {
                isPublished: { type: 'boolean', description: 'Publish status' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Landing page publish status updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/LandingPage' }
                }
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  },

  '/api/landing/templates': {
    get: {
      summary: 'Get landing page templates',
      description: 'Retrieve available landing page templates',
      tags: ['Landing Page Templates'],
      parameters: [
        {
          name: 'category',
          in: 'query',
          description: 'Filter by template category',
          required: false,
          schema: { type: 'string', enum: ['marketing', 'event', 'product', 'general'] }
        },
        {
          name: 'active',
          in: 'query',
          description: 'Filter by active status',
          required: false,
          schema: { type: 'boolean', default: true }
        }
      ],
      responses: {
        200: {
          description: 'Templates retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/LandingPageTemplate' }
                  }
                }
              }
            }
          }
        },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  },

  '/api/landing/pages/{pageId}/forms': {
    post: {
      summary: 'Create form for landing page',
      description: 'Create a form to capture leads on a landing page',
      tags: ['Landing Page Forms'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'pageId',
          in: 'path',
          required: true,
          description: 'Landing page ID',
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'fields'],
              properties: {
                name: { type: 'string', description: 'Form name' },
                fields: {
                  type: 'array',
                  description: 'Form fields configuration',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string', enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox'] },
                      label: { type: 'string' },
                      required: { type: 'boolean' },
                      placeholder: { type: 'string' },
                      options: { type: 'array', items: { type: 'string' } }
                    }
                  }
                },
                validationRules: { type: 'object', description: 'Custom validation rules' },
                successMessage: { type: 'string', description: 'Success message after submission' },
                errorMessage: { type: 'string', description: 'Error message for failed submissions' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Form created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/LandingPageForm' }
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        404: { $ref: '#/components/responses/NotFound' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  },

  '/api/landing/forms/{formId}/submit': {
    post: {
      summary: 'Submit form data',
      description: 'Submit form data for lead capture (public endpoint)',
      tags: ['Landing Page Forms'],
      parameters: [
        {
          name: 'formId',
          in: 'path',
          required: true,
          description: 'Form ID',
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Form submission data (dynamic based on form fields)'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Form submitted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  },

  '/p/{slug}': {
    get: {
      summary: 'View published landing page',
      description: 'Public endpoint to view a published landing page by slug',
      tags: ['Public Pages'],
      parameters: [
        {
          name: 'slug',
          in: 'path',
          required: true,
          description: 'Page slug',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Landing page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string', description: 'Rendered HTML page' }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  },

  '/preview/{pageId}': {
    get: {
      summary: 'Preview landing page',
      description: 'Public endpoint to preview a landing page (published or draft)',
      tags: ['Public Pages'],
      parameters: [
        {
          name: 'pageId',
          in: 'path',
          required: true,
          description: 'Page ID',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Landing page preview rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string', description: 'Rendered HTML page' }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  }
};

// Schema definitions for landing page components
export const landingPageSchemas = {
  LandingPage: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Unique page identifier' },
      userId: { type: 'string', description: 'Owner user ID' },
      qrCodeId: { type: 'string', description: 'Associated QR code ID' },
      templateId: { type: 'string', description: 'Template ID used' },
      name: { type: 'string', description: 'Internal page name' },
      slug: { type: 'string', description: 'URL slug' },
      title: { type: 'string', description: 'Page title' },
      description: { type: 'string', description: 'Page description' },
      content: { type: 'string', description: 'HTML content' },
      styles: { type: 'object', description: 'Custom CSS styles' },
      settings: { type: 'object', description: 'Page configuration' },
      customDomainId: { type: 'string', description: 'Custom domain ID' },
      isPublished: { type: 'boolean', description: 'Published status' },
      publishedAt: { type: 'string', format: 'date-time', description: 'Published timestamp' },
      seoTitle: { type: 'string', description: 'SEO title' },
      seoDescription: { type: 'string', description: 'SEO description' },
      socialImageId: { type: 'string', description: 'Social media image ID' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  LandingPageTemplate: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Template ID' },
      name: { type: 'string', description: 'Template name' },
      description: { type: 'string', description: 'Template description' },
      templateType: { type: 'string', enum: ['marketing', 'event', 'product', 'general'] },
      content: { type: 'string', description: 'Template HTML content' },
      styles: { type: 'object', description: 'Template CSS styles' },
      settings: { type: 'object', description: 'Template configuration' },
      isSystemTemplate: { type: 'boolean', description: 'System template flag' },
      isActive: { type: 'boolean', description: 'Active status' },
      usageCount: { type: 'integer', description: 'Usage statistics' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  LandingPageForm: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Form ID' },
      pageId: { type: 'string', description: 'Associated page ID' },
      name: { type: 'string', description: 'Form name' },
      fields: { type: 'array', description: 'Form fields configuration' },
      validationRules: { type: 'object', description: 'Validation rules' },
      submitUrl: { type: 'string', description: 'Form submission URL' },
      successMessage: { type: 'string', description: 'Success message' },
      errorMessage: { type: 'string', description: 'Error message' },
      isActive: { type: 'boolean', description: 'Active status' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  Pagination: {
    type: 'object',
    properties: {
      currentPage: { type: 'integer', description: 'Current page number' },
      totalPages: { type: 'integer', description: 'Total number of pages' },
      totalItems: { type: 'integer', description: 'Total number of items' },
      itemsPerPage: { type: 'integer', description: 'Items per page' },
      hasNextPage: { type: 'boolean', description: 'Has next page' },
      hasPreviousPage: { type: 'boolean', description: 'Has previous page' }
    }
  }
};