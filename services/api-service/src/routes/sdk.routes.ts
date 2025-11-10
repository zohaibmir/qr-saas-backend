import { Router } from 'express';
import { DependencyContainerService } from '../services/dependency-container.service';
import { SdkController } from '../controllers/sdk.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const container = DependencyContainerService.getInstance();

// Get controller from container
const sdkController = container.resolve<SdkController>('SdkController');

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

// SDK Generation Routes
router.post('/generate', sdkController.generateSdk.bind(sdkController));
router.get('/:jobId/download', sdkController.downloadSdk.bind(sdkController));
router.get('/:jobId/status', sdkController.getSdkStatus.bind(sdkController));
router.get('/', sdkController.getUserSdks.bind(sdkController));

export default router;