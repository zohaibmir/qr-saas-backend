/**
 * Authorization Service Implementation
 * Following Single Responsibility Principle from SOLID
 * Handles user authorization logic
 */

import { IAuthorizationService } from '../interfaces/auth.interfaces';
import { AuthUser, SubscriptionTier } from '../entities/auth-user.entity';

export class AuthorizationService implements IAuthorizationService {
  private readonly tierHierarchy: Record<SubscriptionTier, number> = {
    'free': 0,
    'pro': 1,
    'business': 2,
    'enterprise': 3
  };

  public hasPermission(user: AuthUser, permission: string): boolean {
    if (!user || !permission) {
      return false;
    }

    return user.hasPermission(permission);
  }

  public hasSubscriptionAccess(user: AuthUser, requiredTier: string): boolean {
    if (!user || !requiredTier) {
      return false;
    }

    if (!this.isValidSubscriptionTier(requiredTier)) {
      throw new Error(`Invalid subscription tier: ${requiredTier}`);
    }

    return user.hasSubscriptionLevel(requiredTier as SubscriptionTier);
  }

  public canAccessOrganizationResource(user: AuthUser, organizationId: string): boolean {
    if (!user || !organizationId) {
      return false;
    }

    return user.belongsToOrganization(organizationId);
  }

  public hasAnyPermission(user: AuthUser, permissions: string[]): boolean {
    if (!user || !permissions || permissions.length === 0) {
      return false;
    }

    return user.hasAnyPermission(permissions);
  }

  public isEmailVerificationRequired(user: AuthUser, requireVerification: boolean): boolean {
    if (!requireVerification) {
      return true; // No verification required
    }

    if (!user) {
      return false; // No user means no verification
    }

    return user.isEmailVerified;
  }

  public getAccessLevel(user: AuthUser): {
    subscriptionLevel: number;
    tier: SubscriptionTier;
    permissions: readonly string[];
    isVerified: boolean;
    hasOrganization: boolean;
  } {
    return {
      subscriptionLevel: this.tierHierarchy[user.subscriptionTier],
      tier: user.subscriptionTier,
      permissions: user.permissions,
      isVerified: user.isEmailVerified,
      hasOrganization: !!user.organizationId
    };
  }

  public canUpgrade(currentTier: SubscriptionTier, targetTier: SubscriptionTier): boolean {
    return this.tierHierarchy[targetTier] > this.tierHierarchy[currentTier];
  }

  public getAvailableUpgrades(currentTier: SubscriptionTier): SubscriptionTier[] {
    const currentLevel = this.tierHierarchy[currentTier];
    
    return Object.entries(this.tierHierarchy)
      .filter(([_, level]) => level > currentLevel)
      .map(([tier, _]) => tier as SubscriptionTier)
      .sort((a, b) => this.tierHierarchy[a] - this.tierHierarchy[b]);
  }

  public getTierBenefits(tier: SubscriptionTier): {
    maxQrCodes: number;
    maxTeamMembers: number;
    customDomains: boolean;
    whiteLabel: boolean;
    analytics: boolean;
    apiAccess: boolean;
    priority: boolean;
  } {
    const benefits = {
      free: {
        maxQrCodes: 10,
        maxTeamMembers: 0,
        customDomains: false,
        whiteLabel: false,
        analytics: false,
        apiAccess: false,
        priority: false
      },
      pro: {
        maxQrCodes: 100,
        maxTeamMembers: 3,
        customDomains: false,
        whiteLabel: false,
        analytics: true,
        apiAccess: true,
        priority: false
      },
      business: {
        maxQrCodes: 1000,
        maxTeamMembers: 10,
        customDomains: true,
        whiteLabel: false,
        analytics: true,
        apiAccess: true,
        priority: true
      },
      enterprise: {
        maxQrCodes: -1, // unlimited
        maxTeamMembers: -1, // unlimited
        customDomains: true,
        whiteLabel: true,
        analytics: true,
        apiAccess: true,
        priority: true
      }
    };

    return benefits[tier];
  }

  public validateResourceAccess(
    user: AuthUser,
    resourceType: string,
    resourceId?: string,
    requiredPermission?: string,
    minimumTier?: SubscriptionTier,
    requireEmailVerification: boolean = false
  ): {
    allowed: boolean;
    reason?: string;
    upgradeRequired?: SubscriptionTier;
  } {
    // Check email verification
    if (requireEmailVerification && !user.isEmailVerified) {
      return {
        allowed: false,
        reason: 'Email verification required'
      };
    }

    // Check specific permission
    if (requiredPermission && !user.hasPermission(requiredPermission)) {
      return {
        allowed: false,
        reason: `Missing required permission: ${requiredPermission}`
      };
    }

    // Check subscription tier
    if (minimumTier && !user.hasSubscriptionLevel(minimumTier)) {
      return {
        allowed: false,
        reason: `Subscription upgrade required`,
        upgradeRequired: minimumTier
      };
    }

    // Check organization-specific resources
    if (resourceType === 'organization' && resourceId) {
      if (!user.belongsToOrganization(resourceId)) {
        return {
          allowed: false,
          reason: 'Access denied to organization resource'
        };
      }
    }

    return { allowed: true };
  }

  private isValidSubscriptionTier(tier: string): tier is SubscriptionTier {
    return tier in this.tierHierarchy;
  }

  // Method for checking feature flags based on subscription
  public hasFeatureAccess(user: AuthUser, feature: string): boolean {
    const featureMap: Record<string, SubscriptionTier> = {
      'basic_qr': 'free',
      'custom_design': 'pro',
      'team_collaboration': 'pro',
      'analytics_advanced': 'pro',
      'api_access': 'pro',
      'custom_domains': 'business',
      'bulk_operations': 'business',
      'webhook_integrations': 'business',
      'white_labeling': 'enterprise',
      'sso_integration': 'enterprise',
      'dedicated_support': 'enterprise',
      'data_retention_control': 'enterprise'
    };

    const requiredTier = featureMap[feature];
    if (!requiredTier) {
      return false; // Unknown feature
    }

    return user.hasSubscriptionLevel(requiredTier);
  }

  // Method to get usage limits based on subscription
  public getUsageLimits(user: AuthUser): {
    qrCodesPerMonth: number;
    scansPerMonth: number;
    teamMembers: number;
    customDomains: number;
    apiCallsPerDay: number;
    storageGB: number;
  } {
    const limits = {
      free: {
        qrCodesPerMonth: 10,
        scansPerMonth: 1000,
        teamMembers: 1,
        customDomains: 0,
        apiCallsPerDay: 100,
        storageGB: 0.1
      },
      pro: {
        qrCodesPerMonth: 100,
        scansPerMonth: 10000,
        teamMembers: 5,
        customDomains: 0,
        apiCallsPerDay: 1000,
        storageGB: 1
      },
      business: {
        qrCodesPerMonth: 1000,
        scansPerMonth: 100000,
        teamMembers: 25,
        customDomains: 3,
        apiCallsPerDay: 10000,
        storageGB: 10
      },
      enterprise: {
        qrCodesPerMonth: -1, // unlimited
        scansPerMonth: -1, // unlimited
        teamMembers: -1, // unlimited
        customDomains: -1, // unlimited
        apiCallsPerDay: -1, // unlimited
        storageGB: 100
      }
    };

    return limits[user.subscriptionTier];
  }
}