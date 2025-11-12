/**
 * Business Tools Error Classes
 * 
 * Custom error classes for the business tools service providing structured
 * error handling with error codes and contextual information.
 * 
 * @author AI Agent
 * @date 2024
 */

export class BusinessToolsError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = 'BUSINESS_TOOLS_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'BusinessToolsError';
    this.code = code;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BusinessToolsError);
    }
  }
}

export class DomainValidationError extends BusinessToolsError {
  constructor(message: string, domain?: string) {
    super(message, 'DOMAIN_VALIDATION_ERROR', 400);
    this.name = 'DomainValidationError';
  }
}

export class SSLProvisioningError extends BusinessToolsError {
  constructor(message: string, domain?: string) {
    super(message, 'SSL_PROVISIONING_ERROR', 500);
    this.name = 'SSLProvisioningError';
  }
}

export class WhiteLabelConfigurationError extends BusinessToolsError {
  constructor(message: string, configId?: string) {
    super(message, 'WHITE_LABEL_CONFIG_ERROR', 400);
    this.name = 'WhiteLabelConfigurationError';
  }
}

export class GDPRComplianceError extends BusinessToolsError {
  constructor(message: string, userId?: string) {
    super(message, 'GDPR_COMPLIANCE_ERROR', 400);
    this.name = 'GDPRComplianceError';
  }
}

export class DataProcessingError extends BusinessToolsError {
  constructor(message: string, activityType?: string) {
    super(message, 'DATA_PROCESSING_ERROR', 500);
    this.name = 'DataProcessingError';
  }
}

export class NotFoundError extends BusinessToolsError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found${id ? ` with ID: ${id}` : ''}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends BusinessToolsError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends BusinessToolsError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends BusinessToolsError {
  constructor(message: string, operation?: string) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}