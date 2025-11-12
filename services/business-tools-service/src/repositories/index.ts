/**
 * Business Tools Service Repositories Index
 * 
 * Central export point for all repository classes providing clean imports
 * for the service layer following dependency injection patterns.
 * 
 * @author AI Agent
 * @date 2024
 */

// Custom Domain repositories
export { 
  CustomDomainsRepository,
  DomainVerificationRepository,
  SSLCertificateRepository 
} from './custom-domains.repository';

// White label repositories
export { WhiteLabelRepository } from './white-label.repository';

// GDPR compliance repositories
export { GDPRRepository } from './gdpr.repository';

// Re-export types for convenience
export type {
  // Custom Domain types
  CustomDomain,
  DomainVerification,
  SSLCertificate,
  ICustomDomainsRepository,
  IDomainVerificationRepository,
  ISSLCertificateRepository,
  
  // White label types
  WhiteLabelConfig,
  BrandAsset,
  IWhiteLabelRepository,
  
  // GDPR types
  GDPRRequest,
  UserConsent,
  UserPrivacySettings,
  DataProcessingLog,
  IGDPRRepository
} from '../interfaces';