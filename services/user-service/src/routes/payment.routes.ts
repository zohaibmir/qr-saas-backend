import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { IDependencyContainer } from '../interfaces';

export const createPaymentRoutes = (container: IDependencyContainer): Router => {
  const router = Router();
  const paymentController = container.resolve<PaymentController>('PaymentController');

  // ===============================================
  // PAYMENT METHODS ROUTES
  // ===============================================

  // GET /payment-methods - Get user's payment methods
  router.get('/payment-methods', paymentController.getPaymentMethods);

  // POST /payment-methods - Create new payment method
  router.post('/payment-methods', paymentController.createPaymentMethod);

  // PUT /payment-methods/:paymentMethodId/default - Set as default payment method
  router.put('/payment-methods/:paymentMethodId/default', paymentController.setDefaultPaymentMethod);

  // DELETE /payment-methods/:paymentMethodId - Delete payment method
  router.delete('/payment-methods/:paymentMethodId', paymentController.deletePaymentMethod);

  // ===============================================
  // PAYMENT INTENTS ROUTES
  // ===============================================

  // POST /payment-intents - Create payment intent
  router.post('/payment-intents', paymentController.createPaymentIntent);

  // POST /payment-intents/:paymentIntentId/confirm - Confirm payment intent
  router.post('/payment-intents/:paymentIntentId/confirm', paymentController.confirmPaymentIntent);

  // ===============================================
  // SUBSCRIPTION PAYMENT ROUTES
  // ===============================================

  // POST /subscriptions/payment - Create subscription payment
  router.post('/subscriptions/payment', paymentController.createSubscriptionPayment);

  // ===============================================
  // PROVIDER-SPECIFIC ROUTES
  // ===============================================

  // POST /stripe/subscriptions - Create Stripe subscription
  router.post('/stripe/subscriptions', paymentController.createStripeSubscription);

  // POST /klarna/sessions - Create Klarna payment session
  router.post('/klarna/sessions', paymentController.createKlarnaSession);

  // POST /swish/payments - Create Swish payment QR
  router.post('/swish/payments', paymentController.createSwishPayment);

  // GET /swish/status/:transactionId - Get Swish payment status
  router.get('/swish/status/:transactionId', paymentController.getSwishPaymentStatus);

  // ===============================================
  // TRANSACTION MANAGEMENT ROUTES
  // ===============================================

  // GET /transactions - Get transaction history
  router.get('/transactions', paymentController.getTransactionHistory);

  // GET /transactions/:transactionId - Get specific transaction
  router.get('/transactions/:transactionId', paymentController.getTransaction);

  // POST /transactions/:transactionId/refund - Process refund
  router.post('/transactions/:transactionId/refund', paymentController.refundTransaction);

  // ===============================================
  // WEBHOOK ROUTES (no authentication required)
  // ===============================================

  // POST /webhooks/stripe - Stripe webhook handler
  router.post('/webhooks/stripe', paymentController.stripeWebhook);

  // POST /webhooks/klarna - Klarna webhook handler
  router.post('/webhooks/klarna', paymentController.klarnaWebhook);

  // POST /webhooks/paypal - PayPal webhook handler
  router.post('/webhooks/paypal', paymentController.paypalWebhook);

  // POST /webhooks/swish - Swish callback handler
  router.post('/webhooks/swish', paymentController.swishCallback);

  return router;
};