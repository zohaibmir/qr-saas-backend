import express from 'express';
import { PublicController } from '../controllers/public.controller';

export interface PublicRoutesConfig {
  publicController: PublicController;
}

export function createPublicRoutes(config: PublicRoutesConfig): express.Router {
  const router = express.Router();
  const { publicController } = config;

  // Middleware for public routes
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  // Set user identifier cookie middleware
  router.use((req, res, next) => {
    // Generate user identifier if not exists
    let userId = req.cookies?.['landing_page_user_id'];
    
    if (!userId) {
      const ip = (
        req.headers['x-forwarded-for'] as string ||
        req.headers['x-real-ip'] as string ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown'
      ).split(',')[0].trim();
      
      const userAgent = req.get('User-Agent') || '';
      const timestamp = Date.now();
      
      userId = Buffer.from(`${ip}${userAgent}${timestamp}`)
        .toString('base64')
        .replace(/[+/=]/g, '')
        .substring(0, 16);
      
      // Set cookie for 30 days
      res.cookie('landing_page_user_id', userId, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    next();
  });

  // Public landing page routes
  
  /**
   * @route GET /health
   * @desc Health check for public service
   * @access Public
   */
  router.get('/health', publicController.healthCheck);

  /**
   * @route GET /meta/:slug
   * @desc Get page metadata for SEO/preview
   * @access Public
   */
  router.get('/meta/:slug', publicController.getPageMetadata);

  /**
   * @route POST /forms/submit
   * @desc Submit form data
   * @access Public
   */
  router.post('/forms/submit', publicController.handleFormSubmission);

  /**
   * @route POST /track/conversion
   * @desc Track conversion events
   * @access Public
   */
  router.post('/track/conversion', publicController.trackConversion);

  /**
   * @route GET /:slug
   * @desc Serve landing page by slug (must be last route)
   * @access Public
   */
  router.get('/:slug', publicController.serveLandingPage);

  return router;
}

export default createPublicRoutes;