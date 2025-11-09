import { IPermissionChecker, TeamRole, TeamPermissions } from '../interfaces';

export class PermissionChecker implements IPermissionChecker {
  
  checkPermission(role: TeamRole, permission: string): boolean {
    const permissions = this.getPermissions(role);
    
    // Parse nested permission string (e.g., "organization.update")
    const parts = permission.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [resource, action] = parts;
    const resourcePermissions = permissions[resource as keyof TeamPermissions];
    
    if (!resourcePermissions) {
      return false;
    }

    return resourcePermissions[action as keyof typeof resourcePermissions] || false;
  }

  getPermissions(role: TeamRole): TeamPermissions {
    const permissions: TeamPermissions = {
      organization: {
        read: false,
        update: false,
        delete: false,
        invite_members: false,
        manage_roles: false,
        manage_billing: false,
      },
      qr_codes: {
        create: false,
        read: false,
        update: false,
        delete: false,
        bulk_operations: false,
        share_with_team: false,
      },
      analytics: {
        view_all: false,
        view_own: false,
        export: false,
      },
    };

    switch (role) {
      case 'owner':
        // Owner has full permissions
        permissions.organization = {
          read: true,
          update: true,
          delete: true,
          invite_members: true,
          manage_roles: true,
          manage_billing: true,
        };
        permissions.qr_codes = {
          create: true,
          read: true,
          update: true,
          delete: true,
          bulk_operations: true,
          share_with_team: true,
        };
        permissions.analytics = {
          view_all: true,
          view_own: true,
          export: true,
        };
        break;

      case 'admin':
        permissions.organization = {
          read: true,
          update: true,
          delete: false,
          invite_members: true,
          manage_roles: true,
          manage_billing: false,
        };
        permissions.qr_codes = {
          create: true,
          read: true,
          update: true,
          delete: true,
          bulk_operations: true,
          share_with_team: true,
        };
        permissions.analytics = {
          view_all: true,
          view_own: true,
          export: true,
        };
        break;

      case 'editor':
        permissions.organization = {
          read: true,
          update: false,
          delete: false,
          invite_members: false,
          manage_roles: false,
          manage_billing: false,
        };
        permissions.qr_codes = {
          create: true,
          read: true,
          update: true,
          delete: false,
          bulk_operations: false,
          share_with_team: true,
        };
        permissions.analytics = {
          view_all: false,
          view_own: true,
          export: false,
        };
        break;

      case 'viewer':
        permissions.organization = {
          read: true,
          update: false,
          delete: false,
          invite_members: false,
          manage_roles: false,
          manage_billing: false,
        };
        permissions.qr_codes = {
          create: false,
          read: true,
          update: false,
          delete: false,
          bulk_operations: false,
          share_with_team: false,
        };
        permissions.analytics = {
          view_all: false,
          view_own: false,
          export: false,
        };
        break;
    }

    return permissions;
  }

  canPerformAction(userRole: TeamRole, targetRole: TeamRole, action: string): boolean {
    const roleHierarchy: Record<TeamRole, number> = {
      owner: 4,
      admin: 3,
      editor: 2,
      viewer: 1,
    };

    const userLevel = roleHierarchy[userRole];
    const targetLevel = roleHierarchy[targetRole];

    switch (action) {
      case 'update_role':
        // Only owners can modify admin roles, admins can modify editor/viewer
        if (targetRole === 'owner') {
          return false; // Cannot modify owner role
        }
        if (targetRole === 'admin') {
          return userRole === 'owner';
        }
        return userLevel >= 3; // Admin or owner can modify editor/viewer

      case 'remove':
        // Cannot remove owner, only owner can remove admin
        if (targetRole === 'owner') {
          return false;
        }
        if (targetRole === 'admin') {
          return userRole === 'owner';
        }
        return userLevel >= 3; // Admin or owner can remove editor/viewer

      case 'invite':
        // Admins and owners can invite
        return userLevel >= 3;

      default:
        // For unknown actions, require same or higher level
        return userLevel >= targetLevel;
    }
  }
}