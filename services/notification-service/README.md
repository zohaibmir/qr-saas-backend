# Notification Service

Comprehensive notification and communication service for email delivery, system alerts, and user notifications.

## 🎯 Purpose
- **Email Notifications**: Transactional and marketing emails
- **System Alerts**: Service monitoring and error notifications
- **User Communications**: Account updates and notifications
- **Campaign Management**: Email campaigns and newsletters
- **Event-driven Messaging**: Automated notification triggers

## ✅ Features
- ✅ **Email Templates**: Professional HTML email templates
- ✅ **Transactional Emails**: Registration, password reset, subscription updates
- ✅ **System Monitoring**: Service health and error notifications
- ✅ **Queue Management**: Reliable email delivery queue
- ✅ **Template Engine**: Dynamic content generation
- ✅ **Delivery Tracking**: Email delivery status and analytics

## 📁 Structure
```
src/
├── app.ts              # Express app configuration
├── index.ts            # Service entry point
├── config/            # Configuration files
├── infrastructure/    # External service integrations
├── interfaces/        # TypeScript interfaces
├── repositories/      # Data access layer
├── services/          # Business logic layer
│   ├── email.service.ts
│   ├── template.service.ts
│   ├── queue.service.ts
│   └── notification.service.ts
└── templates/         # Email templates
    ├── welcome.html
    ├── password-reset.html
    ├── subscription-update.html
    └── qr-scan-alert.html
```

## 📧 Email Types
### Transactional Emails
- **Welcome Email**: New user registration
- **Email Verification**: Account verification
- **Password Reset**: Password recovery
- **Subscription Updates**: Plan changes and renewals
- **QR Scan Alerts**: Real-time scan notifications

### System Notifications
- **Service Alerts**: System health monitoring
- **Error Reports**: Critical error notifications
- **Performance Alerts**: Resource usage warnings
- **Security Alerts**: Suspicious activity notifications

### Marketing Communications
- **Newsletter**: Feature updates and news
- **Product Updates**: New features and improvements
- **Usage Reports**: Monthly analytics summaries
- **Promotional Offers**: Subscription promotions

## 🔧 Development
```bash
# Start in development mode
npm run dev

# Build the service
npm run build

# Run tests
npm test
```

## 🌐 API Endpoints
### Email Sending
- `POST /notifications/send` - Send single notification
- `POST /notifications/bulk` - Send bulk notifications
- `POST /notifications/template` - Send templated email

### Template Management
- `GET /notifications/templates` - List email templates
- `GET /notifications/templates/:id` - Get template details
- `POST /notifications/templates` - Create new template
- `PUT /notifications/templates/:id` - Update template

### Queue Management
- `GET /notifications/queue/status` - Queue status
- `POST /notifications/queue/retry/:id` - Retry failed notification
- `GET /notifications/queue/failed` - Get failed notifications

### Analytics
- `GET /notifications/analytics/delivery` - Delivery statistics
- `GET /notifications/analytics/opens` - Email open rates
- `GET /notifications/analytics/clicks` - Click-through rates

## 📬 Queue System
### Queue Processing
- **Reliable Delivery**: Retry mechanism for failed emails
- **Priority Queues**: High-priority system notifications
- **Rate Limiting**: Respect email provider limits
- **Dead Letter Queue**: Handle permanently failed emails

### Queue Types
```
High Priority:     Security alerts, system errors
Medium Priority:   Transactional emails, user notifications
Low Priority:      Marketing emails, newsletters
```

## 🎨 Template System
### Template Features
- **HTML Templates**: Professional responsive design
- **Dynamic Content**: Variable substitution
- **Personalization**: User-specific content
- **Branding**: Consistent visual identity

### Template Variables
```javascript
// User variables
{{user.firstName}}
{{user.email}}
{{user.subscriptionTier}}

// QR code variables
{{qr.name}}
{{qr.scanCount}}
{{qr.createdDate}}

// System variables
{{baseUrl}}
{{supportEmail}}
{{currentDate}}
```

## 📊 Analytics & Tracking
### Delivery Metrics
- **Delivery Rate**: Successfully delivered emails
- **Bounce Rate**: Failed delivery tracking
- **Open Rate**: Email open tracking
- **Click Rate**: Link click tracking

### Performance Monitoring
- **Queue Length**: Current queue size
- **Processing Speed**: Emails per minute
- **Error Rate**: Failed notification percentage
- **Response Time**: Email delivery latency

## 🛡️ Security Features
### Email Security
- **DKIM Signing**: Domain authentication
- **SPF Records**: Sender policy framework
- **Rate Limiting**: Prevent abuse
- **Content Filtering**: Spam prevention

### Data Protection
- **PII Handling**: Secure personal information
- **GDPR Compliance**: Data privacy compliance
- **Unsubscribe**: One-click unsubscribe
- **Data Retention**: Email log retention policies

## 📝 Configuration
Environment variables:
- `PORT` - Service port (default: 3005)
- `SMTP_HOST` - Email server hostname
- `SMTP_PORT` - Email server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `FROM_EMAIL` - Default sender email
- `FROM_NAME` - Default sender name
- `QUEUE_REDIS_URL` - Redis URL for queue
- `TEMPLATE_PATH` - Email template directory

## 🚀 Integration Examples
### User Registration
```javascript
// Send welcome email after registration
await notificationService.send({
  to: user.email,
  template: 'welcome',
  data: {
    firstName: user.firstName,
    verificationUrl: `${baseUrl}/verify/${token}`
  }
});
```

### QR Scan Alert
```javascript
// Real-time scan notification
await notificationService.send({
  to: qr.userId,
  template: 'qr-scan-alert',
  data: {
    qrName: qr.name,
    scanLocation: scan.country,
    scanTime: scan.timestamp
  }
});
```

## 🔮 Future Enhancements
### Multi-channel Support
- **SMS Notifications**: Text message support
- **Push Notifications**: Mobile app notifications
- **Slack Integration**: Team notification channels
- **Discord Webhooks**: Community notifications

### Advanced Features
- **A/B Testing**: Email template testing
- **Personalization**: AI-powered content
- **Automation**: Drip campaigns and workflows
- **Analytics Dashboard**: Visual notification analytics