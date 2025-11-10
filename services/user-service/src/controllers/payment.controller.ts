import { Request, Response } from 'express';
import { 
  IPaymentService, 
  PaymentProvider, 
  CreatePaymentIntentRequest,
  CreateSubscriptionPaymentRequest,
  SwishPaymentRequest,
  KlarnaSessionRequest,
  ILogger
} from '../interfaces';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscriptionTier: string;
  };
}

export class PaymentController {
  constructor(
    private paymentService: IPaymentService,
    private logger: ILogger
  ) {}

  // ===============================================
  // PAYMENT METHODS MANAGEMENT
  // ===============================================

  createPaymentMethod = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const { provider, methodData } = req.body;

      if (!provider || !Object.values(PaymentProvider).includes(provider)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROVIDER',
            message: 'Valid payment provider is required',
            statusCode: 400
          }
        });
        return;
      }

      this.logger.info('Creating payment method', { userId, provider });

      const result = await this.paymentService.createPaymentMethod(userId, provider, methodData);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Failed to create payment method', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment method',
          statusCode: 500
        }
      });
    }
  };

  getPaymentMethods = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const provider = req.query.provider as PaymentProvider | undefined;

      this.logger.debug('Getting payment methods', { userId, provider });

      const result = await this.paymentService.getPaymentMethods(userId, provider);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to get payment methods', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get payment methods',
          statusCode: 500
        }
      });
    }
  };

  deletePaymentMethod = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const { paymentMethodId } = req.params;

      this.logger.info('Deleting payment method', { userId, paymentMethodId });

      const result = await this.paymentService.deletePaymentMethod(userId, paymentMethodId);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to delete payment method', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete payment method',
          statusCode: 500
        }
      });
    }
  };

  setDefaultPaymentMethod = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const { paymentMethodId } = req.params;

      this.logger.info('Setting default payment method', { userId, paymentMethodId });

      const result = await this.paymentService.setDefaultPaymentMethod(userId, paymentMethodId);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to set default payment method', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set default payment method',
          statusCode: 500
        }
      });
    }
  };

  // ===============================================
  // PAYMENT INTENTS
  // ===============================================

  createPaymentIntent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const request: CreatePaymentIntentRequest = {
        ...req.body,
        userId
      };

      this.logger.info('Creating payment intent', { 
        userId, 
        amount: request.amount, 
        provider: request.provider 
      });

      const result = await this.paymentService.createPaymentIntent(request);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Failed to create payment intent', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment intent',
          statusCode: 500
        }
      });
    }
  };

  confirmPaymentIntent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { paymentIntentId } = req.params;
      const { provider } = req.body;

      this.logger.info('Confirming payment intent', { paymentIntentId, provider });

      const result = await this.paymentService.confirmPaymentIntent(paymentIntentId, provider);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to confirm payment intent', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to confirm payment intent',
          statusCode: 500
        }
      });
    }
  };

  // ===============================================
  // SUBSCRIPTION PAYMENTS
  // ===============================================

  createSubscriptionPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const request: CreateSubscriptionPaymentRequest = {
        ...req.body,
        userId
      };

      this.logger.info('Creating subscription payment', { 
        userId, 
        planId: request.planId, 
        provider: request.provider 
      });

      const result = await this.paymentService.createSubscriptionPayment(request);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Failed to create subscription payment', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create subscription payment',
          statusCode: 500
        }
      });
    }
  };

  // ===============================================
  // PROVIDER-SPECIFIC ENDPOINTS
  // ===============================================

  createStripeSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const request: CreateSubscriptionPaymentRequest = {
        ...req.body,
        userId,
        provider: PaymentProvider.STRIPE
      };

      this.logger.info('Creating Stripe subscription', { userId, planId: request.planId });

      const result = await this.paymentService.createStripeSubscription(request);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create Stripe subscription',
          statusCode: 500
        }
      });
    }
  };

  createKlarnaSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const request: KlarnaSessionRequest = {
        ...req.body,
        userId
      };

      this.logger.info('Creating Klarna session', { userId, amount: request.amount });

      const result = await this.paymentService.createKlarnaSession(request);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Failed to create Klarna session', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create Klarna session',
          statusCode: 500
        }
      });
    }
  };

  createSwishPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const request: SwishPaymentRequest = {
        ...req.body,
        userId
      };

      this.logger.info('Creating Swish payment', { userId, amount: request.amount });

      const result = await this.paymentService.createSwishPayment(request);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Failed to create Swish payment', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create Swish payment',
          statusCode: 500
        }
      });
    }
  };

  // ===============================================
  // TRANSACTION MANAGEMENT
  // ===============================================

  getTransactionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      this.logger.debug('Getting transaction history', { userId, limit, offset });

      const result = await this.paymentService.getTransactionHistory(userId, limit, offset);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to get transaction history', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get transaction history',
          statusCode: 500
        }
      });
    }
  };

  getTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;

      this.logger.debug('Getting transaction', { transactionId });

      const result = await this.paymentService.getTransaction(transactionId);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to get transaction', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get transaction',
          statusCode: 500
        }
      });
    }
  };

  refundTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      const { amount, reason } = req.body;

      this.logger.info('Processing refund', { transactionId, amount, reason });

      const result = await this.paymentService.refundTransaction(transactionId, amount, reason);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to process refund', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process refund',
          statusCode: 500
        }
      });
    }
  };

  // ===============================================
  // WEBHOOK ENDPOINTS
  // ===============================================

  stripeWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      this.logger.info('Processing Stripe webhook');

      const result = await this.paymentService.handleStripeWebhook(payload, signature);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error('Failed to process Stripe webhook', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process webhook',
          statusCode: 400
        }
      });
    }
  };

  klarnaWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const payload = req.body;

      this.logger.info('Processing Klarna webhook');

      const result = await this.paymentService.handleKlarnaWebhook(payload);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error('Failed to process Klarna webhook', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process webhook',
          statusCode: 400
        }
      });
    }
  };

  paypalWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const payload = req.body;

      this.logger.info('Processing PayPal webhook');

      const result = await this.paymentService.handlePayPalWebhook(payload);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error('Failed to process PayPal webhook', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process webhook',
          statusCode: 400
        }
      });
    }
  };

  // ===============================================
  // SWISH SPECIFIC ENDPOINTS
  // ===============================================

  swishCallback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const payload = req.body;

      this.logger.info('Processing Swish callback');

      const result = await this.paymentService.handleSwishCallback(payload);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error('Failed to process Swish callback', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(400).json({
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Failed to process Swish callback',
          statusCode: 400
        }
      });
    }
  };

  getSwishPaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            statusCode: 401
          }
        });
        return;
      }

      const { transactionId } = req.params;

      this.logger.info('Getting Swish payment status', { userId, transactionId });

      const result = await this.paymentService.getSwishPaymentStatus(transactionId);

      if (!result.success) {
        res.status(result.error?.statusCode || 500).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Failed to get Swish payment status', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get Swish payment status',
          statusCode: 500
        }
      });
    }
  };
}