import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { DependencyContainerService } from '../services/dependency-container.service';

export function createWebhookRoutes(): Router {
    const router = Router();
    const container = DependencyContainerService.getInstance();
    const webhookController = container.resolve<WebhookController>('WebhookController');

    // All routes require authentication
    router.use(AuthMiddleware.authenticate);

    // Create new webhook
    router.post('/', webhookController.createWebhook);

    // Get user's webhooks
    router.get('/', webhookController.getUserWebhooks);

    // Get specific webhook
    router.get('/:webhookId', webhookController.getWebhook);

    // Update webhook
    router.put('/:webhookId', webhookController.updateWebhook);

    // Delete webhook
    router.delete('/:webhookId', webhookController.deleteWebhook);

    // Get webhook delivery history
    router.get('/:webhookId/deliveries', webhookController.getWebhookDeliveries);

    // Retry webhook delivery
    router.post('/deliveries/:deliveryId/retry', webhookController.retryWebhookDelivery);

    return router;
}