import { ITemplateService, TemplateError, ILogger } from '../interfaces';

export class TemplateService implements ITemplateService {
  private templates = new Map<string, { subject?: string; body: string; variables: string[] }>();

  constructor(private logger: ILogger) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Welcome email template
    this.templates.set('welcome', {
      subject: 'Welcome to QR SaaS Platform, {{name}}!',
      body: `
        <html>
          <body>
            <h1>Welcome {{name}}!</h1>
            <p>Thank you for joining the QR SaaS Platform. You can now create and manage your QR codes.</p>
            <p>Your account email: {{email}}</p>
            <p>Get started by creating your first QR code!</p>
            <p>Best regards,<br>The QR SaaS Team</p>
          </body>
        </html>
      `,
      variables: ['name', 'email']
    });

    // Password reset email template
    this.templates.set('password-reset', {
      subject: 'Reset Your Password - QR SaaS Platform',
      body: `
        <html>
          <body>
            <h1>Password Reset Request</h1>
            <p>Hello {{name}},</p>
            <p>You requested to reset your password for your QR SaaS Platform account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{{resetLink}}">Reset Password</a></p>
            <p>This link will expire in {{expirationTime}} minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>The QR SaaS Team</p>
          </body>
        </html>
      `,
      variables: ['name', 'resetLink', 'expirationTime']
    });

    // QR Code created notification
    this.templates.set('qr-created', {
      subject: 'Your QR Code "{{qrName}}" has been created!',
      body: `
        <html>
          <body>
            <h1>QR Code Created Successfully!</h1>
            <p>Hello {{userName}},</p>
            <p>Your QR code "{{qrName}}" has been successfully created.</p>
            <p>QR Code Details:</p>
            <ul>
              <li>Name: {{qrName}}</li>
              <li>Type: {{qrType}}</li>
              <li>Created: {{createdAt}}</li>
            </ul>
            <p>You can manage your QR codes in your dashboard.</p>
            <p>Best regards,<br>The QR SaaS Team</p>
          </body>
        </html>
      `,
      variables: ['userName', 'qrName', 'qrType', 'createdAt']
    });

    this.logger.info('Default templates initialized', {
      templateCount: this.templates.size,
      templates: Array.from(this.templates.keys())
    });
  }

  async renderTemplate(templateName: string, data: Record<string, any>): Promise<{ subject?: string; body: string }> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new TemplateError(`Template '${templateName}' not found`);
    }

    this.logger.debug('Rendering template', { templateName, dataKeys: Object.keys(data) });

    // Check if all required variables are provided
    const missingVariables = template.variables.filter(variable => 
      data[variable] === undefined || data[variable] === null
    );

    if (missingVariables.length > 0) {
      throw new TemplateError(
        `Missing template variables: ${missingVariables.join(', ')}`,
        { missingVariables, requiredVariables: template.variables }
      );
    }

    // Simple template rendering - replace {{variable}} with actual values
    let renderedSubject = template.subject;
    let renderedBody = template.body;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      if (renderedSubject) {
        renderedSubject = renderedSubject.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
      }
      renderedBody = renderedBody.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }

    this.logger.info('Template rendered successfully', {
      templateName,
      hasSubject: !!renderedSubject
    });

    return {
      subject: renderedSubject,
      body: renderedBody
    };
  }

  async validateTemplate(template: string, variables: string[]): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check for unmatched braces
      const openBraces = (template.match(/{{/g) || []).length;
      const closeBraces = (template.match(/}}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push('Unmatched template braces');
      }

      // Extract variables from template
      const templateVariables = Array.from(
        template.matchAll(/{{(\w+)}}/g),
        match => match[1]
      );

      // Check for undefined variables
      const undefinedVariables = templateVariables.filter(
        variable => !variables.includes(variable)
      );

      if (undefinedVariables.length > 0) {
        errors.push(`Undefined variables: ${undefinedVariables.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      this.logger.error('Template validation failed', { error, template: template.substring(0, 100) });
      errors.push('Template validation failed');
      
      return {
        isValid: false,
        errors
      };
    }
  }

  // Method to add custom templates (for extensibility)
  addTemplate(name: string, subject: string | undefined, body: string, variables: string[]): void {
    this.templates.set(name, { subject, body, variables });
    this.logger.info('Custom template added', { templateName: name, variables });
  }

  // Method to get available templates
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}