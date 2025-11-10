import { Router } from 'express';
import { ApiKeyController } from '../controllers/api-key.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { DependencyContainerService } from '../services/dependency-container.service';

export function createApiKeyRoutes(): Router {
    const router = Router();
    const container = DependencyContainerService.getInstance();
    const apiKeyController = container.resolve<ApiKeyController>('ApiKeyController');

    // All routes require authentication
    router.use(AuthMiddleware.authenticate);

    // Create new API key
    router.post('/', apiKeyController.createApiKey);

    // Get user's API keys
    router.get('/', apiKeyController.getUserApiKeys);

    // Revoke API key
    router.delete('/:keyId', apiKeyController.revokeApiKey);

    // Get API key statistics
    router.get('/:keyId/stats', apiKeyController.getApiKeyStats);

    return router;
}