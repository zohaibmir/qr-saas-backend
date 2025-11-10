import { ServiceResponse } from './index';

export enum PaymentProvider {
  STRIPE = 'stripe',
  KLARNA = 'klarna',
  SWISH = 'swish',
  PAYPAL = 'paypal'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REQUIRES_ACTION = 'requires_action'
}

export enum PaymentType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  UPGRADE = 'upgrade',
  REFUND = 'refund'
}

export interface PaymentMethod {
  id: string;
  provider: PaymentProvider;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  klarna?: {
    country: string;
    preferredLocale: string;
  };
  swish?: {
    phoneNumber: string;
  };
  paypal?: {
    email: string;
    payerId: string;
  };
  isDefault: boolean;
  createdAt: Date;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  subscriptionId?: string;
  provider: PaymentProvider;
  providerTransactionId: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  description: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentIntentRequest {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethodId?: string;
  subscriptionId?: string;
  provider: PaymentProvider;
  metadata?: Record<string, any>;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerResponse: any;
}

export interface CreateSubscriptionPaymentRequest {
  userId: string;
  planId: string;
  paymentMethodId: string;
  provider: PaymentProvider;
  trialPeriodDays?: number;
}

export interface SwishPaymentRequest {
  userId: string;
  amount: number;
  message?: string;
  phoneNumber: string;
}

export interface KlarnaSessionRequest {
  userId: string;
  amount: number;
  currency: string;
  planId: string;
  locale?: string;
  country?: string;
}

export interface PaymentConfiguration {
  stripe: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  klarna: {
    enabled: boolean;
    username: string;
    password: string;
    environment: 'playground' | 'production';
  };
  swish: {
    enabled: boolean;
    merchantId: string;
    certificatePath?: string;
  };
  paypal: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'live';
  };
}

export interface IPaymentService {
  // Payment Methods
  createPaymentMethod(userId: string, provider: PaymentProvider, methodData: any): Promise<ServiceResponse<PaymentMethod>>;
  getPaymentMethods(userId: string, provider?: PaymentProvider): Promise<ServiceResponse<PaymentMethod[]>>;
  deletePaymentMethod(userId: string, paymentMethodId: string): Promise<ServiceResponse<void>>;
  setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<ServiceResponse<void>>;

  // Payment Intents
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<ServiceResponse<PaymentIntentResponse>>;
  confirmPaymentIntent(paymentIntentId: string, provider: PaymentProvider): Promise<ServiceResponse<PaymentTransaction>>;

  // Subscription Payments
  createSubscriptionPayment(request: CreateSubscriptionPaymentRequest): Promise<ServiceResponse<PaymentTransaction>>;
  updateSubscriptionPaymentMethod(subscriptionId: string, paymentMethodId: string): Promise<ServiceResponse<void>>;

  // Provider-specific methods
  createStripeSubscription(request: CreateSubscriptionPaymentRequest): Promise<ServiceResponse<PaymentTransaction>>;
  createKlarnaSession(request: KlarnaSessionRequest): Promise<ServiceResponse<any>>;
  createSwishPayment(request: SwishPaymentRequest): Promise<ServiceResponse<PaymentTransaction>>;
  createPayPalOrder(request: CreatePaymentIntentRequest): Promise<ServiceResponse<PaymentIntentResponse>>;

  // Transaction Management
  getTransactionHistory(userId: string, limit?: number, offset?: number): Promise<ServiceResponse<PaymentTransaction[]>>;
  getTransaction(transactionId: string): Promise<ServiceResponse<PaymentTransaction>>;
  refundTransaction(transactionId: string, amount?: number, reason?: string): Promise<ServiceResponse<PaymentTransaction>>;

    // Webhooks
  handleStripeWebhook(payload: any, signature: string): Promise<ServiceResponse<void>>;
  handleKlarnaWebhook(payload: any): Promise<ServiceResponse<void>>;
  handlePayPalWebhook(payload: any): Promise<ServiceResponse<void>>;
  // Webhooks
  handleStripeWebhook(payload: any, signature: string): Promise<ServiceResponse<void>>;
  handleKlarnaWebhook(payload: any): Promise<ServiceResponse<void>>;
  handlePayPalWebhook(payload: any): Promise<ServiceResponse<void>>;
  handleSwishCallback(payload: any): Promise<ServiceResponse<void>>;
  
  // Swish-specific methods
  getSwishPaymentStatus(transactionId: string): Promise<ServiceResponse<any>>;
}

export interface IPaymentRepository {
  // Payment Methods
  savePaymentMethod(paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>): Promise<PaymentMethod>;
  savePaymentMethodForUser(userId: string, paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>): Promise<PaymentMethod>;
  findPaymentMethodById(id: string): Promise<PaymentMethod | null>;
  findPaymentMethodsByUserId(userId: string, provider?: PaymentProvider): Promise<PaymentMethod[]>;
  updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: string): Promise<void>;

  // Transactions
  saveTransaction(transaction: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransaction>;
  findTransactionById(id: string): Promise<PaymentTransaction | null>;
  findTransactionsByUserId(userId: string, limit?: number, offset?: number): Promise<PaymentTransaction[]>;
  updateTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction>;

  // Provider-specific queries
  findTransactionByProviderTransactionId(providerTransactionId: string, provider: PaymentProvider): Promise<PaymentTransaction | null>;
}