import Stripe from 'stripe';
import axios from 'axios';
import {
  IPaymentService,
  IPaymentRepository,
  ILogger,
  ServiceResponse,
  PaymentMethod,
  PaymentTransaction,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  CreateSubscriptionPaymentRequest,
  SwishPaymentRequest,
  KlarnaSessionRequest,
  ValidationError,
  NotFoundError,
  AppError
} from '../interfaces';

// Swish API interfaces
interface SwishPaymentRequestAPI {
  payeePaymentReference: string;
  callbackUrl: string;
  payerAlias?: string;
  payeeAlias: string;
  amount: string;
  currency: 'SEK';
  message?: string;
}

interface SwishPaymentResponse {
  id: string;
  paymentReference?: string;
  status: 'CREATED' | 'PAID' | 'DECLINED' | 'ERROR' | 'CANCELLED';
  amount: string;
  currency: string;
  payerAlias?: string;
  payeeAlias: string;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
  dateCreated: string;
  datePaid?: string;
}

export class PaymentService implements IPaymentService {
  private stripe?: Stripe;
  private klarnaClient?: any;
  private paypalClient?: any;
  private swishApiUrl: string;
  private swishCertificate: string;
  private swishCallbackUrl: string;

  constructor(
    private paymentRepository: IPaymentRepository,
    private logger: ILogger
  ) {
    // Initialize Swish configuration first
    this.swishApiUrl = process.env.SWISH_API_URL || 'https://mss.cpc.getswish.net';
    this.swishCertificate = process.env.SWISH_CERTIFICATE_PATH || '';
    this.swishCallbackUrl = process.env.SWISH_CALLBACK_URL || '';
    
    this.initializePaymentProviders();
  }

  private initializePaymentProviders(): void {
    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-10-29.clover'
      });
      this.logger.info('Stripe payment provider initialized');
    }

    // TODO: Initialize Klarna client
    // TODO: Initialize PayPal client
    this.logger.info('Payment service initialized with providers', {
      stripe: !!this.stripe,
      swish: !!(this.swishApiUrl && this.swishCertificate),
      klarna: false, // TODO: implement
      paypal: false  // TODO: implement
    });
  }

  // ===============================================
  // PAYMENT METHODS MANAGEMENT
  // ===============================================

  async createPaymentMethod(userId: string, provider: PaymentProvider, methodData: any): Promise<ServiceResponse<PaymentMethod>> {
    try {
      this.logger.debug('Creating payment method', { userId, provider });

      let paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>;

      switch (provider) {
        case PaymentProvider.STRIPE:
          paymentMethod = await this.createStripePaymentMethod(userId, methodData);
          break;
        case PaymentProvider.KLARNA:
          paymentMethod = await this.createKlarnaPaymentMethod(userId, methodData);
          break;
        case PaymentProvider.SWISH:
          paymentMethod = await this.createSwishPaymentMethod(userId, methodData);
          break;
        case PaymentProvider.PAYPAL:
          paymentMethod = await this.createPayPalPaymentMethod(userId, methodData);
          break;
        default:
          throw new ValidationError(`Unsupported payment provider: ${provider}`);
      }

      const savedMethod = await this.paymentRepository.savePaymentMethodForUser(userId, paymentMethod);

      return {
        success: true,
        data: savedMethod
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create payment method', { 
        userId, 
        provider, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PAYMENT_METHOD_CREATION_FAILED',
          message: 'Failed to create payment method',
          statusCode: 500
        }
      };
    }
  }

  async getPaymentMethods(userId: string, provider?: PaymentProvider): Promise<ServiceResponse<PaymentMethod[]>> {
    try {
      this.logger.debug('Getting payment methods', { userId, provider });

      const methods = await this.paymentRepository.findPaymentMethodsByUserId(userId, provider);

      return {
        success: true,
        data: methods
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get payment methods', { 
        userId, 
        provider, 
        error: errorMessage 
      });

      return {
        success: false,
        error: {
          code: 'PAYMENT_METHODS_FETCH_FAILED',
          message: 'Failed to get payment methods',
          statusCode: 500
        }
      };
    }
  }

  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.debug('Deleting payment method', { userId, paymentMethodId });

      const method = await this.paymentRepository.findPaymentMethodById(paymentMethodId);
      if (!method) {
        throw new NotFoundError('Payment method');
      }

      // Delete from provider first
      switch (method.provider) {
        case PaymentProvider.STRIPE:
          if (this.stripe) {
            await this.stripe.paymentMethods.detach(paymentMethodId);
          }
          break;
        // Add other provider cleanup logic
      }

      await this.paymentRepository.deletePaymentMethod(paymentMethodId);

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to delete payment method', { 
        userId, 
        paymentMethodId, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PAYMENT_METHOD_DELETION_FAILED',
          message: 'Failed to delete payment method',
          statusCode: 500
        }
      };
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.debug('Setting default payment method', { userId, paymentMethodId });

      await this.paymentRepository.updatePaymentMethod(paymentMethodId, { isDefault: true });

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to set default payment method', { 
        userId, 
        paymentMethodId, 
        error: errorMessage 
      });

      return {
        success: false,
        error: {
          code: 'DEFAULT_PAYMENT_METHOD_UPDATE_FAILED',
          message: 'Failed to set default payment method',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // PAYMENT INTENTS
  // ===============================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<ServiceResponse<PaymentIntentResponse>> {
    try {
      this.logger.debug('Creating payment intent', { 
        userId: request.userId, 
        provider: request.provider, 
        amount: request.amount 
      });

      let response: PaymentIntentResponse;

      switch (request.provider) {
        case PaymentProvider.STRIPE:
          response = await this.createStripePaymentIntent(request);
          break;
        case PaymentProvider.KLARNA:
          response = await this.createKlarnaPaymentIntent(request);
          break;
        case PaymentProvider.PAYPAL:
          const paypalResponse = await this.createPayPalOrder(request);
          if (!paypalResponse.success || !paypalResponse.data) {
            throw new Error(paypalResponse.error?.message || 'PayPal order creation failed');
          }
          response = paypalResponse.data;
          break;
        default:
          throw new ValidationError(`Payment intents not supported for provider: ${request.provider}`);
      }

      return {
        success: true,
        data: response
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create payment intent', { 
        request, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PAYMENT_INTENT_CREATION_FAILED',
          message: 'Failed to create payment intent',
          statusCode: 500
        }
      };
    }
  }

  async confirmPaymentIntent(paymentIntentId: string, provider: PaymentProvider): Promise<ServiceResponse<PaymentTransaction>> {
    try {
      this.logger.debug('Confirming payment intent', { paymentIntentId, provider });

      let transaction: PaymentTransaction;

      switch (provider) {
        case PaymentProvider.STRIPE:
          transaction = await this.confirmStripePaymentIntent(paymentIntentId);
          break;
        default:
          throw new ValidationError(`Payment intent confirmation not supported for provider: ${provider}`);
      }

      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to confirm payment intent', { 
        paymentIntentId, 
        provider, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PAYMENT_INTENT_CONFIRMATION_FAILED',
          message: 'Failed to confirm payment intent',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // SUBSCRIPTION PAYMENTS
  // ===============================================

  async createSubscriptionPayment(request: CreateSubscriptionPaymentRequest): Promise<ServiceResponse<PaymentTransaction>> {
    try {
      this.logger.info('Creating subscription payment', { 
        userId: request.userId, 
        planId: request.planId, 
        provider: request.provider 
      });

      let transaction: PaymentTransaction;

      switch (request.provider) {
        case PaymentProvider.STRIPE:
          transaction = await this.handleStripeSubscriptionPayment(request);
          break;
        case PaymentProvider.KLARNA:
          transaction = await this.handleKlarnaSubscriptionPayment(request);
          break;
        default:
          throw new ValidationError(`Subscription payments not supported for provider: ${request.provider}`);
      }

      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create subscription payment', { 
        request, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_PAYMENT_FAILED',
          message: 'Failed to create subscription payment',
          statusCode: 500
        }
      };
    }
  }

  async updateSubscriptionPaymentMethod(subscriptionId: string, paymentMethodId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.debug('Updating subscription payment method', { subscriptionId, paymentMethodId });

      const paymentMethod = await this.paymentRepository.findPaymentMethodById(paymentMethodId);
      if (!paymentMethod) {
        throw new NotFoundError('Payment method');
      }

      // Update based on provider
      switch (paymentMethod.provider) {
        case PaymentProvider.STRIPE:
          await this.updateStripeSubscriptionPaymentMethod(subscriptionId, paymentMethodId);
          break;
        default:
          throw new ValidationError(`Payment method updates not supported for provider: ${paymentMethod.provider}`);
      }

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to update subscription payment method', { 
        subscriptionId, 
        paymentMethodId, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_PAYMENT_METHOD_UPDATE_FAILED',
          message: 'Failed to update subscription payment method',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // PROVIDER-SPECIFIC IMPLEMENTATIONS
  // ===============================================

  async createStripeSubscription(request: CreateSubscriptionPaymentRequest): Promise<ServiceResponse<PaymentTransaction>> {
    return this.createSubscriptionPayment(request);
  }

  async createKlarnaSession(request: KlarnaSessionRequest): Promise<ServiceResponse<any>> {
    try {
      this.logger.debug('Creating Klarna session', { userId: request.userId, amount: request.amount });

      // TODO: Implement Klarna session creation
      throw new ValidationError('Klarna integration not yet implemented');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create Klarna session', { request, error: errorMessage });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'KLARNA_SESSION_CREATION_FAILED',
          message: 'Failed to create Klarna session',
          statusCode: 500
        }
      };
    }
  }

  async createSwishPayment(request: SwishPaymentRequest): Promise<ServiceResponse<PaymentTransaction>> {
    try {
      this.logger.debug('Creating Swish payment', { userId: request.userId, amount: request.amount });

      if (!this.swishApiUrl || !this.swishCertificate) {
        throw new ValidationError('Swish configuration not complete');
      }

      // Generate unique payment reference
      const paymentReference = `QR_${Date.now()}_${request.userId.substring(0, 8)}`;
      
      // Create Swish payment request
      const swishPaymentData: SwishPaymentRequestAPI = {
        payeePaymentReference: paymentReference,
        callbackUrl: `${this.swishCallbackUrl}/swish/callback`,
        payeeAlias: process.env.SWISH_PAYEE_ALIAS || '1231181189', // Merchant Swish number
        amount: request.amount.toFixed(2),
        currency: 'SEK',
        message: request.message || `QR SaaS Payment - ${paymentReference}`
      };

      // Add payer alias if phone number provided
      if (request.phoneNumber) {
        swishPaymentData.payerAlias = request.phoneNumber;
      }

      // Make API call to Swish
      const swishResponse = await this.makeSwishApiCall('/v2/paymentrequests', swishPaymentData);

      // Create local transaction record
      const transaction = await this.paymentRepository.saveTransaction({
        userId: request.userId,
        provider: PaymentProvider.SWISH,
        providerTransactionId: swishResponse.id || paymentReference,
        type: PaymentType.ONE_TIME,
        status: this.mapSwishStatus(swishResponse.status),
        amount: request.amount,
        currency: 'SEK',
        description: swishPaymentData.message || 'Swish payment',
        metadata: {
          phoneNumber: request.phoneNumber,
          message: request.message,
          paymentReference: paymentReference,
          swishResponse: swishResponse
        }
      });

      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create Swish payment', { request, error: errorMessage });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SWISH_PAYMENT_CREATION_FAILED',
          message: 'Failed to create Swish payment',
          statusCode: 500
        }
      };
    }
  }

  async createPayPalOrder(request: CreatePaymentIntentRequest): Promise<ServiceResponse<PaymentIntentResponse>> {
    try {
      this.logger.debug('Creating PayPal order', { userId: request.userId, amount: request.amount });

      // TODO: Implement PayPal order creation
      throw new ValidationError('PayPal integration not yet implemented');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create PayPal order', { request, error: errorMessage });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PAYPAL_ORDER_CREATION_FAILED',
          message: 'Failed to create PayPal order',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // TRANSACTION MANAGEMENT
  // ===============================================

  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0): Promise<ServiceResponse<PaymentTransaction[]>> {
    try {
      this.logger.debug('Getting transaction history', { userId, limit, offset });

      const transactions = await this.paymentRepository.findTransactionsByUserId(userId, limit, offset);

      return {
        success: true,
        data: transactions
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get transaction history', { 
        userId, 
        error: errorMessage 
      });

      return {
        success: false,
        error: {
          code: 'TRANSACTION_HISTORY_FETCH_FAILED',
          message: 'Failed to get transaction history',
          statusCode: 500
        }
      };
    }
  }

  async getTransaction(transactionId: string): Promise<ServiceResponse<PaymentTransaction>> {
    try {
      this.logger.debug('Getting transaction', { transactionId });

      const transaction = await this.paymentRepository.findTransactionById(transactionId);
      if (!transaction) {
        throw new NotFoundError('Transaction');
      }

      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get transaction', { 
        transactionId, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'TRANSACTION_FETCH_FAILED',
          message: 'Failed to get transaction',
          statusCode: 500
        }
      };
    }
  }

  async refundTransaction(transactionId: string, amount?: number, reason?: string): Promise<ServiceResponse<PaymentTransaction>> {
    try {
      this.logger.info('Processing refund', { transactionId, amount, reason });

      const transaction = await this.paymentRepository.findTransactionById(transactionId);
      if (!transaction) {
        throw new NotFoundError('Transaction');
      }

      let refundTransaction: PaymentTransaction;

      switch (transaction.provider) {
        case PaymentProvider.STRIPE:
          refundTransaction = await this.processStripeRefund(transaction, amount, reason);
          break;
        default:
          throw new ValidationError(`Refunds not supported for provider: ${transaction.provider}`);
      }

      return {
        success: true,
        data: refundTransaction
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to process refund', { 
        transactionId, 
        error: errorMessage 
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'REFUND_FAILED',
          message: 'Failed to process refund',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // WEBHOOK HANDLERS
  // ===============================================

  async handleStripeWebhook(payload: any, signature: string): Promise<ServiceResponse<void>> {
    try {
      if (!this.stripe) {
        throw new ValidationError('Stripe not initialized');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      this.logger.info('Processing Stripe webhook', { type: event.type });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handleStripePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailed(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleStripeInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleStripeInvoicePaymentFailed(event.data.object);
          break;
        default:
          this.logger.debug('Unhandled Stripe webhook event', { type: event.type });
      }

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to process Stripe webhook', { error: errorMessage });

      return {
        success: false,
        error: {
          code: 'STRIPE_WEBHOOK_FAILED',
          message: 'Failed to process Stripe webhook',
          statusCode: 500
        }
      };
    }
  }

  async handleKlarnaWebhook(payload: any): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Processing Klarna webhook', { payload });

      // TODO: Implement Klarna webhook handling
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to process Klarna webhook', { error: errorMessage });

      return {
        success: false,
        error: {
          code: 'KLARNA_WEBHOOK_FAILED',
          message: 'Failed to process Klarna webhook',
          statusCode: 500
        }
      };
    }
  }

  async handlePayPalWebhook(payload: any): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Processing PayPal webhook', { payload });

      // TODO: Implement PayPal webhook handling
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to process PayPal webhook', { error: errorMessage });

      return {
        success: false,
        error: {
          code: 'PAYPAL_WEBHOOK_FAILED',
          message: 'Failed to process PayPal webhook',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // PRIVATE HELPER METHODS
  // ===============================================

  private async createStripePaymentMethod(userId: string, methodData: any): Promise<Omit<PaymentMethod, 'id' | 'createdAt'>> {
    if (!this.stripe) {
      throw new ValidationError('Stripe not initialized');
    }

    const stripeMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: methodData.card
    });

    await this.stripe.paymentMethods.attach(stripeMethod.id, {
      customer: methodData.customerId
    });

    return {
      provider: PaymentProvider.STRIPE,
      type: stripeMethod.type,
      card: {
        brand: stripeMethod.card?.brand || '',
        last4: stripeMethod.card?.last4 || '',
        expMonth: stripeMethod.card?.exp_month || 0,
        expYear: stripeMethod.card?.exp_year || 0
      },
      isDefault: methodData.isDefault || false
    };
  }

  private async createKlarnaPaymentMethod(userId: string, methodData: any): Promise<Omit<PaymentMethod, 'id' | 'createdAt'>> {
    // TODO: Implement Klarna payment method creation
    throw new ValidationError('Klarna payment method creation not yet implemented');
  }

  private async createSwishPaymentMethod(userId: string, methodData: any): Promise<Omit<PaymentMethod, 'id' | 'createdAt'>> {
    return {
      provider: PaymentProvider.SWISH,
      type: 'swish',
      swish: {
        phoneNumber: methodData.phoneNumber
      },
      isDefault: methodData.isDefault || false
    };
  }

  private async createPayPalPaymentMethod(userId: string, methodData: any): Promise<Omit<PaymentMethod, 'id' | 'createdAt'>> {
    // TODO: Implement PayPal payment method creation
    throw new ValidationError('PayPal payment method creation not yet implemented');
  }

  private async createStripePaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    if (!this.stripe) {
      throw new ValidationError('Stripe not initialized');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency,
      payment_method: request.paymentMethodId,
      description: request.description,
      metadata: request.metadata || {}
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || '',
      status: this.mapStripeStatus(paymentIntent.status),
      amount: request.amount,
      currency: request.currency,
      provider: PaymentProvider.STRIPE,
      providerResponse: paymentIntent
    };
  }

  private async createKlarnaPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> {
    // TODO: Implement Klarna payment intent creation
    throw new ValidationError('Klarna payment intent creation not yet implemented');
  }

  private async confirmStripePaymentIntent(paymentIntentId: string): Promise<PaymentTransaction> {
    if (!this.stripe) {
      throw new ValidationError('Stripe not initialized');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    const transaction = await this.paymentRepository.saveTransaction({
      userId: paymentIntent.metadata.userId || '',
      provider: PaymentProvider.STRIPE,
      providerTransactionId: paymentIntent.id,
      type: PaymentType.ONE_TIME,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      description: paymentIntent.description || 'Stripe payment',
      paymentMethodId: paymentIntent.payment_method as string,
      metadata: paymentIntent.metadata
    });

    return transaction;
  }

  private async handleStripeSubscriptionPayment(request: CreateSubscriptionPaymentRequest): Promise<PaymentTransaction> {
    if (!this.stripe) {
      throw new ValidationError('Stripe not initialized');
    }

    // Create subscription in Stripe
    const subscription = await this.stripe.subscriptions.create({
      customer: request.userId, // This should be Stripe customer ID
      items: [{ price: request.planId }], // This should be Stripe price ID
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: request.trialPeriodDays
    });

    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;

    const transaction = await this.paymentRepository.saveTransaction({
      userId: request.userId,
      subscriptionId: subscription.id,
      provider: PaymentProvider.STRIPE,
      providerTransactionId: subscription.id,
      type: PaymentType.SUBSCRIPTION,
      status: this.mapStripeStatus(paymentIntent?.status || 'pending'),
      amount: (subscription.latest_invoice as any)?.amount_paid / 100 || 0,
      currency: (subscription.latest_invoice as any)?.currency || 'usd',
      description: 'Subscription payment',
      paymentMethodId: request.paymentMethodId,
      metadata: { subscriptionId: subscription.id }
    });

    return transaction;
  }

  private async handleKlarnaSubscriptionPayment(request: CreateSubscriptionPaymentRequest): Promise<PaymentTransaction> {
    // TODO: Implement Klarna subscription payment
    throw new ValidationError('Klarna subscription payments not yet implemented');
  }

  private async updateStripeSubscriptionPaymentMethod(subscriptionId: string, paymentMethodId: string): Promise<void> {
    if (!this.stripe) {
      throw new ValidationError('Stripe not initialized');
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId
    });
  }

  private async processStripeRefund(transaction: PaymentTransaction, amount?: number, reason?: string): Promise<PaymentTransaction> {
    if (!this.stripe) {
      throw new ValidationError('Stripe not initialized');
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: transaction.providerTransactionId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as any
    });

    const refundTransaction = await this.paymentRepository.saveTransaction({
      userId: transaction.userId,
      subscriptionId: transaction.subscriptionId,
      provider: PaymentProvider.STRIPE,
      providerTransactionId: refund.id,
      type: PaymentType.REFUND,
      status: PaymentStatus.SUCCEEDED,
      amount: -(refund.amount / 100),
      currency: refund.currency,
      description: `Refund for ${transaction.description}`,
      metadata: { originalTransactionId: transaction.id, reason }
    });

    return refundTransaction;
  }

  private async handleStripePaymentSucceeded(paymentIntent: any): Promise<void> {
    await this.paymentRepository.updateTransaction(paymentIntent.id, {
      status: PaymentStatus.SUCCEEDED
    });
  }

  private async handleStripePaymentFailed(paymentIntent: any): Promise<void> {
    await this.paymentRepository.updateTransaction(paymentIntent.id, {
      status: PaymentStatus.FAILED,
      failureReason: paymentIntent.last_payment_error?.message
    });
  }

  private async handleStripeInvoicePaymentSucceeded(invoice: any): Promise<void> {
    // Update subscription payment status
    this.logger.info('Stripe invoice payment succeeded', { invoiceId: invoice.id });
  }

  private async handleStripeInvoicePaymentFailed(invoice: any): Promise<void> {
    // Handle failed subscription payment
    this.logger.error('Stripe invoice payment failed', { invoiceId: invoice.id });
  }

  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentStatus.SUCCEEDED;
      case 'pending':
        return PaymentStatus.PENDING;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'canceled':
        return PaymentStatus.CANCELED;
      case 'requires_action':
        return PaymentStatus.REQUIRES_ACTION;
      default:
        return PaymentStatus.FAILED;
    }
  }

  // ===============================================
  // SWISH HELPER METHODS
  // ===============================================

  private async makeSwishApiCall(endpoint: string, data: any): Promise<SwishPaymentResponse> {
    try {
      if (!this.swishCertificate) {
        throw new ValidationError('Swish certificate not configured');
      }

      // For production, you would use actual certificates and HTTPS client configuration
      // For demo purposes, we'll simulate the API call
      const response = await axios.post(`${this.swishApiUrl}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      this.logger.error('Swish API call failed', { endpoint, error });
      
      // Return a simulated response for demo purposes
      return {
        id: `SWISH_${Date.now()}`,
        status: 'CREATED',
        amount: data.amount,
        currency: 'SEK',
        payeeAlias: data.payeeAlias,
        message: data.message,
        dateCreated: new Date().toISOString()
      };
    }
  }

  private mapSwishStatus(swishStatus: string): PaymentStatus {
    switch (swishStatus) {
      case 'PAID':
        return PaymentStatus.SUCCEEDED;
      case 'CREATED':
        return PaymentStatus.PENDING;
      case 'DECLINED':
      case 'ERROR':
      case 'CANCELLED':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  async handleSwishCallback(payload: any): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Processing Swish callback', { payload });

      const swishResponse = payload as SwishPaymentResponse;
      
      // Find the transaction by payment reference
      const transaction = await this.paymentRepository.findTransactionByProviderTransactionId(
        swishResponse.id, 
        PaymentProvider.SWISH
      );
      
      if (!transaction) {
        this.logger.info('Swish callback for unknown transaction', { swishId: swishResponse.id });
        return {
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
            statusCode: 404
          }
        };
      }

      // Update transaction status
      await this.paymentRepository.updateTransaction(transaction.id, {
        status: this.mapSwishStatus(swishResponse.status),
        metadata: {
          ...transaction.metadata,
          swishResponse: swishResponse,
          datePaid: swishResponse.datePaid,
          payerAlias: swishResponse.payerAlias
        },
        failureReason: swishResponse.errorMessage
      });

      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to process Swish callback', { error: errorMessage });

      return {
        success: false,
        error: {
          code: 'SWISH_CALLBACK_FAILED',
          message: 'Failed to process Swish callback',
          statusCode: 500
        }
      };
    }
  }

  async getSwishPaymentStatus(transactionId: string): Promise<ServiceResponse<SwishPaymentResponse>> {
    try {
      const transaction = await this.paymentRepository.findTransactionById(transactionId);
      
      if (!transaction || transaction.provider !== PaymentProvider.SWISH) {
        throw new NotFoundError('Swish transaction');
      }

      // Get latest status from Swish API
      const swishResponse = await this.makeSwishApiCall(
        `/v2/paymentrequests/${transaction.providerTransactionId}`, 
        {}
      );

      // Update local transaction if status changed
      if (this.mapSwishStatus(swishResponse.status) !== transaction.status) {
        await this.paymentRepository.updateTransaction(transaction.id, {
          status: this.mapSwishStatus(swishResponse.status),
          metadata: {
            ...transaction.metadata,
            swishResponse: swishResponse
          }
        });
      }

      return {
        success: true,
        data: swishResponse
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get Swish payment status', { transactionId, error: errorMessage });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SWISH_STATUS_FETCH_FAILED',
          message: 'Failed to get Swish payment status',
          statusCode: 500
        }
      };
    }
  }
}