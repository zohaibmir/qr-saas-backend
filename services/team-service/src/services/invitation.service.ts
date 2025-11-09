import { randomBytes } from 'crypto';
import { IInvitationService, OrganizationInvitation, Organization, ILogger } from '../interfaces';
import { servicesConfig } from '../config';

export class InvitationService implements IInvitationService {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  generateInvitationToken(): string {
    // Generate a secure 32-byte token and encode as hex
    return randomBytes(32).toString('hex');
  }

  async sendInvitationEmail(invitation: OrganizationInvitation, organization: Organization): Promise<void> {
    try {
      // In a real implementation, you would integrate with your notification service
      // For now, we'll simulate sending an email
      
      const emailData = {
        to: invitation.email,
        template: 'team-invitation',
        data: {
          organizationName: organization.name,
          organizationSlug: organization.slug,
          inviterName: 'Team Member', // You might want to fetch this from user service
          role: invitation.role,
          invitationToken: invitation.token,
          acceptUrl: this.buildAcceptUrl(invitation.token),
          expiresAt: invitation.expiresAt.toISOString(),
        }
      };

      // Make HTTP request to notification service
      const response = await fetch(`${servicesConfig.notificationService}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getServiceToken()}`, // Service-to-service auth
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      this.logger.info('Invitation email sent successfully', {
        organizationId: organization.id,
        email: invitation.email,
        invitationId: invitation.id
      });

    } catch (error: any) {
      this.logger.error('Failed to send invitation email', {
        organizationId: organization.id,
        email: invitation.email,
        invitationId: invitation.id,
        error: error.message
      });

      // In a production system, you might want to queue the email for retry
      // For now, we'll just log the error but not throw it to avoid blocking the invitation creation
    }
  }

  private buildAcceptUrl(token: string): string {
    // This would typically point to your frontend application
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/accept-invitation?token=${token}`;
  }

  private getServiceToken(): string {
    // In a real implementation, you would generate or retrieve a service-to-service JWT token
    // This could be done using a shared secret or service account credentials
    return process.env.SERVICE_TOKEN || 'service-token-placeholder';
  }
}