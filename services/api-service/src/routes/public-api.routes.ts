import { Router } from 'express';
import { PublicApiController } from '../controllers/public-api.controller';
import { DependencyContainerService } from '../services/dependency-container.service';

export function createPublicApiRoutes(): Router {
    const router = Router();
    const container = DependencyContainerService.getInstance();
    const publicApiController = container.resolve<PublicApiController>('PublicApiController');

    // Public API v1 routes - requires API key authentication
    
    // QR Code operations
    router.post('/qr/generate', publicApiController.generateQR);
    router.get('/qr/:qrId', publicApiController.getQR);
    router.put('/qr/:qrId', publicApiController.updateQR);
    router.delete('/qr/:qrId', publicApiController.deleteQR);
    router.get('/qr', publicApiController.listQRs);

    return router;
}