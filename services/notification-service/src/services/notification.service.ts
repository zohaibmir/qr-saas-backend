import { 
  INotificationService, 
  INotificationProvider, 
  ITemplateService,
  ILogger,
  EmailRequest,
  SMSRequest,
  NotificationResponse,
  NotificationStatus,
  EmailMessage,
  SMSMessage,
  ServiceResponse,
  ValidationError,
  NotificationError
} from '../interfaces';

export class NotificationService implements INotificationService {
  constructor(
    private notificationProvider: INotificationProvider,
    private templateService: ITemplateService,
    private logger: ILogger
  ) {}

  async sendEmail(request: EmailRequest): Promise<ServiceResponse<NotificationResponse>> {
    try {
      this.logger.info('Email send requested', {
        to: request.to,
        subject: request.subject,
        hasTemplate: !!request.template
      });

      // Validate request
      if (!request.to || !request.subject) {
        throw new ValidationError('Email recipient and subject are required');
      }

      if (!request.body && !request.template) {
        throw new ValidationError('Either body or template must be provided');
      }

      let emailToSend = { ...request };

      // If template is specified, render it
      if (request.template) {
        try {
          const rendered = await this.templateService.renderTemplate(
            request.template,
            request.templateData || {}
          );
          
          emailToSend.subject = rendered.subject || request.subject;
          emailToSend.body = rendered.body;

          this.logger.debug('Template rendered for email', {
            template: request.template,
            renderedSubject: rendered.subject
          });
        } catch (error) {
          this.logger.error('Template rendering failed', { error, template: request.template });
          throw new NotificationError(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Send email via provider
      const result = await this.notificationProvider.sendEmail(emailToSend);

      this.logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: request.to,
        status: result.status
      });

      return {
        success: true,
        data: {
          messageId: result.messageId,
          status: result.status as 'sent' | 'queued',
          sentAt: new Date()
        }
      };

    } catch (error) {
      this.logger.error('Email sending failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: request.to,
        subject: request.subject
      });

      if (error instanceof ValidationError || error instanceof NotificationError) {
        throw error;
      }

      throw new NotificationError('Email sending failed');
    }
  }

  async sendSMS(request: SMSRequest): Promise<ServiceResponse<NotificationResponse>> {
    try {
      this.logger.info('SMS send requested', {
        to: request.to,
        messageLength: request.message.length
      });

      // Validate request
      if (!request.to || !request.message) {
        throw new ValidationError('Phone number and message are required');
      }

      // Basic phone number validation (simple check)
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(request.to)) {
        throw new ValidationError('Invalid phone number format');
      }

      // Send SMS via provider
      const result = await this.notificationProvider.sendSMS(request);

      this.logger.info('SMS sent successfully', {
        messageId: result.messageId,
        to: request.to,
        status: result.status
      });

      return {
        success: true,
        data: {
          messageId: result.messageId,
          status: result.status as 'sent' | 'queued',
          sentAt: new Date()
        }
      };

    } catch (error) {
      this.logger.error('SMS sending failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: request.to
      });

      if (error instanceof ValidationError || error instanceof NotificationError) {
        throw error;
      }

      throw new NotificationError('SMS sending failed');
    }
  }

  async getNotificationStatus(messageId: string): Promise<ServiceResponse<NotificationStatus>> {
    try {
      this.logger.info('Notification status requested', { messageId });

      if (!messageId) {
        throw new ValidationError('Message ID is required');
      }

      // Determine message type from messageId prefix
      const isEmail = messageId.startsWith('email_');
      const isSMS = messageId.startsWith('sms_');

      if (!isEmail && !isSMS) {
        throw new ValidationError('Invalid message ID format');
      }

      const type = isEmail ? 'email' : 'sms';
      const statusResult = await this.notificationProvider.getMessageStatus(messageId, type);

      this.logger.info('Notification status retrieved', {
        messageId,
        type,
        status: statusResult.status
      });

      return {
        success: true,
        data: {
          messageId,
          status: statusResult.status as NotificationStatus['status'],
          sentAt: new Date(), // In a real implementation, this would come from the database
          deliveredAt: statusResult.deliveredAt
        }
      };

    } catch (error) {
      this.logger.error('Failed to get notification status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new NotificationError('Failed to get notification status');
    }
  }

  async getUserNotifications(userId: string, type?: 'email' | 'sms'): Promise<ServiceResponse<(EmailMessage | SMSMessage)[]>> {
    try {
      this.logger.info('User notifications requested', { userId, type });

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // For demo purposes, return empty array
      // In a real implementation, this would query the database
      const notifications: (EmailMessage | SMSMessage)[] = [];

      this.logger.info('User notifications retrieved', {
        userId,
        type,
        count: notifications.length
      });

      return {
        success: true,
        data: notifications
      };

    } catch (error) {
      this.logger.error('Failed to get user notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new NotificationError('Failed to get user notifications');
    }
  }

  // Convenience methods for common notification types
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<ServiceResponse<NotificationResponse>> {
    return this.sendEmail({
      to: userEmail,
      subject: 'Welcome to QR SaaS Platform',
      template: 'welcome',
      templateData: {
        name: userName,
        email: userEmail
      }
    });
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetLink: string): Promise<ServiceResponse<NotificationResponse>> {
    return this.sendEmail({
      to: userEmail,
      subject: 'Reset Your Password',
      template: 'password-reset',
      templateData: {
        name: userName,
        resetLink,
        expirationTime: '30'
      }
    });
  }

  async sendQRCreatedNotification(userEmail: string, userName: string, qrName: string, qrType: string): Promise<ServiceResponse<NotificationResponse>> {
    return this.sendEmail({
      to: userEmail,
      subject: 'QR Code Created Successfully',
      template: 'qr-created',
      templateData: {
        userName,
        qrName,
        qrType,
        createdAt: new Date().toLocaleString()
      }
    });
  }
}