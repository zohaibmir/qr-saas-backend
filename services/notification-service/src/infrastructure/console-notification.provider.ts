import { INotificationProvider, EmailRequest, SMSRequest, ILogger } from '../interfaces';

export class ConsoleNotificationProvider implements INotificationProvider {
  constructor(private logger: ILogger) {}

  async sendEmail(email: EmailRequest): Promise<{ messageId: string; status: string }> {
    const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.logger.info('Email sent via console provider', {
      messageId,
      to: email.to,
      subject: email.subject,
      hasTemplate: !!email.template,
      templateData: email.templateData
    });

    // Simulate email sending
    console.log('📧 Email Sent:', {
      messageId,
      to: email.to,
      from: email.from || 'noreply@qrsaas.com',
      subject: email.subject,
      body: email.body?.substring(0, 100) + (email.body && email.body.length > 100 ? '...' : ''),
      template: email.template,
      templateData: email.templateData
    });

    return {
      messageId,
      status: 'sent'
    };
  }

  async sendSMS(sms: SMSRequest): Promise<{ messageId: string; status: string }> {
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.logger.info('SMS sent via console provider', {
      messageId,
      to: sms.to,
      messageLength: sms.message.length
    });

    // Simulate SMS sending
    console.log('📱 SMS Sent:', {
      messageId,
      to: sms.to,
      from: sms.from || '+1234567890',
      message: sms.message
    });

    return {
      messageId,
      status: 'sent'
    };
  }

  async getMessageStatus(messageId: string, type: 'email' | 'sms'): Promise<{ status: string; deliveredAt?: Date }> {
    this.logger.info('Message status requested', { messageId, type });

    // Simulate status check - for demo purposes, always return delivered
    return {
      status: 'delivered',
      deliveredAt: new Date()
    };
  }
}