/**
 * Validation Schemas
 * 
 * Joi validation schemas for request validation across all business tools endpoints.
 * Includes schemas for custom domains, white label configurations, and GDPR requests.
 * 
 * @author AI Agent
 * @date 2024
 */

import Joi from 'joi';

// ===============================================
// Custom Domains Validation Schemas
// ===============================================

export const createDomainSchema = Joi.object({
  domain: Joi.string()
    .hostname()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.hostname': 'Invalid domain format',
      'string.min': 'Domain must be at least 3 characters long',
      'string.max': 'Domain cannot exceed 255 characters',
      'any.required': 'Domain is required'
    }),
  subdomain: Joi.string()
    .alphanum()
    .min(1)
    .max(63)
    .optional()
    .messages({
      'string.alphanum': 'Subdomain can only contain alphanumeric characters',
      'string.min': 'Subdomain must be at least 1 character long',
      'string.max': 'Subdomain cannot exceed 63 characters'
    }),
  purpose: Joi.string()
    .valid('qr_redirect', 'landing_page', 'api_endpoint', 'file_serving', 'other')
    .default('qr_redirect'),
  autoSSL: Joi.boolean().default(true),
  customSettings: Joi.object().optional()
});

export const updateDomainSchema = Joi.object({
  subdomain: Joi.string()
    .alphanum()
    .min(1)
    .max(63)
    .optional(),
  purpose: Joi.string()
    .valid('qr_redirect', 'landing_page', 'api_endpoint', 'file_serving', 'other')
    .optional(),
  autoSSL: Joi.boolean().optional(),
  customSettings: Joi.object().optional(),
  isActive: Joi.boolean().optional()
}).min(1);

export const domainIdSchema = Joi.object({
  domainId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid domain ID format',
      'any.required': 'Domain ID is required'
    })
});

// ===============================================
// White Label Validation Schemas
// ===============================================

export const createWhiteLabelSchema = Joi.object({
  configName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Configuration name is required',
      'string.max': 'Configuration name cannot exceed 100 characters',
      'any.required': 'Configuration name is required'
    }),
  companyName: Joi.string()
    .trim()
    .max(200)
    .optional(),
  primaryColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Primary color must be a valid hex color'
    }),
  secondaryColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Secondary color must be a valid hex color'
    }),
  accentColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  backgroundColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  textColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  supportEmail: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Support email must be a valid email address'
    }),
  supportPhone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,20}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Support phone must be a valid phone number'
    }),
  supportUrl: Joi.string()
    .uri()
    .optional(),
  termsUrl: Joi.string()
    .uri()
    .optional(),
  privacyUrl: Joi.string()
    .uri()
    .optional(),
  brandingSettings: Joi.object().optional(),
  emailSettings: Joi.object().optional(),
  domainSettings: Joi.object().optional(),
  featureFlags: Joi.object().optional()
});

export const updateWhiteLabelSchema = Joi.object({
  configName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  companyName: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .optional(),
  primaryColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  secondaryColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  accentColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  backgroundColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  textColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  supportEmail: Joi.string()
    .email()
    .allow('')
    .optional(),
  supportPhone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,20}$/)
    .allow('')
    .optional(),
  supportUrl: Joi.string()
    .uri()
    .allow('')
    .optional(),
  termsUrl: Joi.string()
    .uri()
    .allow('')
    .optional(),
  privacyUrl: Joi.string()
    .uri()
    .allow('')
    .optional(),
  logoUrl: Joi.string()
    .uri()
    .allow('')
    .optional(),
  logoDarkUrl: Joi.string()
    .uri()
    .allow('')
    .optional(),
  faviconUrl: Joi.string()
    .uri()
    .allow('')
    .optional(),
  customCss: Joi.string()
    .max(10000)
    .allow('')
    .optional(),
  customJs: Joi.string()
    .max(10000)
    .allow('')
    .optional(),
  brandingSettings: Joi.object().optional(),
  emailSettings: Joi.object().optional(),
  domainSettings: Joi.object().optional(),
  featureFlags: Joi.object().optional(),
  isActive: Joi.boolean().optional()
}).min(1);

export const configIdSchema = Joi.object({
  configId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid configuration ID format',
      'any.required': 'Configuration ID is required'
    })
});

export const assetIdSchema = Joi.object({
  assetId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid asset ID format',
      'any.required': 'Asset ID is required'
    })
});

export const uploadAssetSchema = Joi.object({
  assetType: Joi.string()
    .valid('logo', 'favicon', 'background', 'email_header', 'custom')
    .required()
    .messages({
      'any.only': 'Asset type must be one of: logo, favicon, background, email_header, custom',
      'any.required': 'Asset type is required'
    }),
  assetName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Asset name is required',
      'string.max': 'Asset name cannot exceed 100 characters',
      'any.required': 'Asset name is required'
    }),
  altText: Joi.string()
    .trim()
    .max(255)
    .optional(),
  usageContext: Joi.string()
    .optional()
});

// ===============================================
// GDPR Validation Schemas
// ===============================================

export const createDataRequestSchema = Joi.object({
  requestType: Joi.string()
    .valid('export', 'delete', 'rectify', 'restrict', 'object', 'portability')
    .required()
    .messages({
      'any.only': 'Request type must be one of: export, delete, rectify, restrict, object, portability',
      'any.required': 'Request type is required'
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .optional(),
  dataTypes: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  requestedBy: Joi.string()
    .valid('data_subject', 'legal_representative', 'admin')
    .default('data_subject'),
  urgency: Joi.string()
    .valid('low', 'normal', 'high', 'urgent')
    .default('normal'),
  preferredFormat: Joi.string()
    .valid('json', 'csv', 'pdf')
    .default('json'),
  notificationPreference: Joi.string()
    .valid('email', 'sms', 'in_app', 'none')
    .default('email'),
  requestedData: Joi.object().optional()
});

export const updateConsentSchema = Joi.object({
  consentType: Joi.string()
    .valid('marketing', 'analytics', 'functional', 'personalization', 'third_party')
    .required()
    .messages({
      'any.only': 'Consent type must be one of: marketing, analytics, functional, personalization, third_party',
      'any.required': 'Consent type is required'
    }),
  granted: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Granted status is required'
    }),
  consentVersion: Joi.string()
    .optional()
    .default('1.0'),
  legalBasis: Joi.string()
    .valid('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')
    .default('consent'),
  source: Joi.string()
    .valid('user_action', 'admin_action', 'system_migration', 'api_call')
    .default('user_action')
});

export const updatePrivacySettingsSchema = Joi.object({
  analyticsTracking: Joi.boolean().optional(),
  marketingEmails: Joi.boolean().optional(),
  thirdPartySharing: Joi.boolean().optional(),
  dataRetentionDays: Joi.number()
    .integer()
    .min(1)
    .max(3650)
    .optional()
    .messages({
      'number.min': 'Data retention period must be at least 1 day',
      'number.max': 'Data retention period cannot exceed 10 years'
    }),
  cookiePreferences: Joi.object().optional(),
  notificationPreferences: Joi.object().optional(),
  exportFormat: Joi.string()
    .valid('json', 'csv', 'pdf')
    .optional()
}).min(1);

export const requestIdSchema = Joi.object({
  requestId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid request ID format',
      'any.required': 'Request ID is required'
    })
});

export const logProcessingSchema = Joi.object({
  activityType: Joi.string()
    .valid('collection', 'processing', 'storage', 'transfer', 'deletion', 'access', 'rectification')
    .required()
    .messages({
      'any.only': 'Activity type must be one of: collection, processing, storage, transfer, deletion, access, rectification',
      'any.required': 'Activity type is required'
    }),
  dataProcessed: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one data category must be specified',
      'any.required': 'Data processed is required'
    }),
  legalBasis: Joi.string()
    .valid('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')
    .required()
    .messages({
      'any.only': 'Legal basis must be one of: consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests',
      'any.required': 'Legal basis is required'
    }),
  purpose: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'Purpose is required',
      'string.max': 'Purpose cannot exceed 500 characters',
      'any.required': 'Purpose is required'
    }),
  thirdParties: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .default([]),
  retentionPeriod: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': 'Retention period must be at least 1 day'
    })
});

export const exportDataSchema = Joi.object({
  format: Joi.string()
    .valid('json', 'csv', 'pdf')
    .default('json'),
  dataTypes: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  includeMetadata: Joi.boolean()
    .default(false),
  password: Joi.string()
    .min(8)
    .optional()
    .messages({
      'string.min': 'Password must be at least 8 characters long'
    })
});