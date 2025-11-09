// Clean Architecture Interfaces for Team Service
// Following SOLID principles with proper abstraction layers

import { ServiceResponse as SharedServiceResponse, ServiceError, AppError, ValidationError, NotFoundError, ConflictError } from '@qr-saas/shared';

// Re-export for consistency with enhanced response
export interface ServiceResponse<T = any> extends SharedServiceResponse<T> {
  meta?: {
    total?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
export { ServiceError, AppError, ValidationError, NotFoundError, ConflictError };

// Basic interfaces
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Team Role enum
export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

// Domain models
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings: Record<string, any>;
  subscriptionPlanId?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: TeamRole;
  permissions: Record<string, any>;
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  createdAt: Date;
}

// Request DTOs
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
}

export interface InviteMemberRequest {
  email: string;
  role: TeamRole;
}

export interface UpdateMemberRoleRequest {
  role: TeamRole;
  permissions?: Record<string, any>;
}

export interface AcceptInvitationRequest {
  token: string;
}

// Response DTOs
export interface OrganizationWithStats extends Organization {
  memberCount: number;
  qrCodeCount: number;
  sharedQrCodeCount: number;
}

export interface MemberWithUserInfo extends OrganizationMember {
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatar?: string;
  };
}

// Permission definitions
export interface TeamPermissions {
  organization: {
    read: boolean;
    update: boolean;
    delete: boolean;
    invite_members: boolean;
    manage_roles: boolean;
    manage_billing: boolean;
  };
  qr_codes: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    bulk_operations: boolean;
    share_with_team: boolean;
  };
  analytics: {
    view_all: boolean;
    view_own: boolean;
    export: boolean;
  };
}

// Service interfaces (Business logic layer)
export interface ITeamService {
  // Organization management
  createOrganization(userId: string, data: CreateOrganizationRequest): Promise<ServiceResponse<Organization>>;
  getOrganization(organizationId: string, userId: string): Promise<ServiceResponse<OrganizationWithStats>>;
  updateOrganization(organizationId: string, userId: string, updates: UpdateOrganizationRequest): Promise<ServiceResponse<Organization>>;
  deleteOrganization(organizationId: string, userId: string): Promise<ServiceResponse<void>>;
  getUserOrganizations(userId: string, pagination: PaginationOptions): Promise<ServiceResponse<Organization[]>>;
  
  // Member management
  inviteMember(organizationId: string, userId: string, invitation: InviteMemberRequest): Promise<ServiceResponse<OrganizationInvitation>>;
  getMembers(organizationId: string, userId: string, pagination: PaginationOptions): Promise<ServiceResponse<MemberWithUserInfo[]>>;
  updateMemberRole(organizationId: string, userId: string, memberId: string, updates: UpdateMemberRoleRequest): Promise<ServiceResponse<OrganizationMember>>;
  removeMember(organizationId: string, userId: string, memberId: string): Promise<ServiceResponse<void>>;
  
  // Invitation management
  acceptInvitation(userId: string, token: string): Promise<ServiceResponse<OrganizationMember>>;
  getPendingInvitations(organizationId: string, userId: string): Promise<ServiceResponse<OrganizationInvitation[]>>;
  cancelInvitation(organizationId: string, userId: string, invitationId: string): Promise<ServiceResponse<void>>;
  resendInvitation(organizationId: string, userId: string, invitationId: string): Promise<ServiceResponse<void>>;
  
  // Permission checking
  checkPermission(userId: string, organizationId: string, permission: string): Promise<ServiceResponse<boolean>>;
  getUserRole(userId: string, organizationId: string): Promise<ServiceResponse<TeamRole | null>>;
}

// Repository interfaces (Data access layer)
export interface IOrganizationRepository {
  create(data: CreateOrganizationRequest & { createdBy: string }): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findByUserId(userId: string, pagination: PaginationOptions): Promise<{ organizations: Organization[]; total: number }>;
  update(id: string, updates: UpdateOrganizationRequest): Promise<Organization>;
  delete(id: string): Promise<void>;
  getStats(organizationId: string): Promise<{
    memberCount: number;
    qrCodeCount: number;
    sharedQrCodeCount: number;
  }>;
}

export interface IMemberRepository {
  create(data: {
    organizationId: string;
    userId: string;
    role: TeamRole;
    invitedBy?: string;
    status?: 'pending' | 'active';
  }): Promise<OrganizationMember>;
  findById(id: string): Promise<OrganizationMember | null>;
  findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMember | null>;
  findByOrganization(organizationId: string, pagination: PaginationOptions): Promise<{ members: MemberWithUserInfo[]; total: number }>;
  updateRole(id: string, role: TeamRole, permissions?: Record<string, any>): Promise<OrganizationMember>;
  updateStatus(id: string, status: 'active' | 'suspended'): Promise<OrganizationMember>;
  delete(id: string): Promise<void>;
}

export interface IInvitationRepository {
  create(data: {
    organizationId: string;
    email: string;
    role: TeamRole;
    invitedBy: string;
    expiresAt: Date;
  }): Promise<OrganizationInvitation>;
  findById(id: string): Promise<OrganizationInvitation | null>;
  findByToken(token: string): Promise<OrganizationInvitation | null>;
  findByOrganization(organizationId: string): Promise<OrganizationInvitation[]>;
  findByEmail(email: string): Promise<OrganizationInvitation[]>;
  accept(id: string, userId: string): Promise<OrganizationInvitation>;
  delete(id: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

// Utility interfaces
export interface ISlugGenerator {
  generateSlug(name: string, existingCheck: (slug: string) => Promise<boolean>): Promise<string>;
}

export interface IInvitationService {
  generateInvitationToken(): string;
  sendInvitationEmail(invitation: OrganizationInvitation, organization: Organization): Promise<void>;
}

export interface IPermissionChecker {
  checkPermission(role: TeamRole, permission: string): boolean;
  getPermissions(role: TeamRole): TeamPermissions;
  canPerformAction(userRole: TeamRole, targetRole: TeamRole, action: string): boolean;
}

// Infrastructure interfaces
export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IDependencyContainer {
  register<T>(token: string, instance: T): void;
  resolve<T>(token: string): T;
  getRegisteredTokens(): string[];
}

export interface IHealthChecker {
  checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    service: string;
    timestamp: string;
    dependencies: Record<string, any>;
  }>;
}

// Error classes specific to team service
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized to perform this action') {
    super(message, 403, 'UNAUTHORIZED', true);
  }
}

export class InvitationExpiredError extends AppError {
  constructor() {
    super('Invitation has expired', 400, 'INVITATION_EXPIRED', true);
  }
}

export class InvitationAlreadyAcceptedError extends AppError {
  constructor() {
    super('Invitation has already been accepted', 400, 'INVITATION_ALREADY_ACCEPTED', true);
  }
}

export class SlugAlreadyExistsError extends ConflictError {
  constructor(slug: string) {
    super(`Organization slug '${slug}' already exists`);
  }
}

// Type guards
export const isOrganization = (obj: any): obj is Organization => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.slug === 'string';
};

export const isTeamRole = (role: string): role is TeamRole => {
  return ['owner', 'admin', 'editor', 'viewer'].includes(role);
};

export const isServiceResponse = <T>(obj: any): obj is ServiceResponse<T> => {
  return obj && typeof obj.success === 'boolean';
};