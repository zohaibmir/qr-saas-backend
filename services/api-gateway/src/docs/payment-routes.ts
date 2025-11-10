/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing with multiple providers including Swish for Swedish market
 * 
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       required:
 *         - provider
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique payment method identifier
 *         provider:
 *           type: string
 *           enum: [STRIPE, KLARNA, SWISH, PAYPAL]
 *           description: Payment provider
 *         type:
 *           type: string
 *           description: Payment method type (card, swish, paypal, etc.)
 *         card:
 *           type: object
 *           description: Card details (for Stripe)
 *           properties:
 *             brand:
 *               type: string
 *               description: Card brand (visa, mastercard, etc.)
 *             last4:
 *               type: string
 *               description: Last 4 digits of card
 *             expMonth:
 *               type: number
 *               description: Expiration month
 *             expYear:
 *               type: number
 *               description: Expiration year
 *         swish:
 *           type: object
 *           description: Swish details (for Swedish market)
 *           properties:
 *             phoneNumber:
 *               type: string
 *               description: Swish phone number
 *         isDefault:
 *           type: boolean
 *           description: Whether this is the default payment method
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 * 
 *     PaymentTransaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique transaction identifier
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         subscriptionId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Subscription ID (if applicable)
 *         provider:
 *           type: string
 *           enum: [STRIPE, KLARNA, SWISH, PAYPAL]
 *           description: Payment provider
 *         providerTransactionId:
 *           type: string
 *           description: Provider's transaction ID
 *         type:
 *           type: string
 *           enum: [ONE_TIME, SUBSCRIPTION, REFUND]
 *           description: Transaction type
 *         status:
 *           type: string
 *           enum: [PENDING, PROCESSING, SUCCEEDED, FAILED, CANCELED, REQUIRES_ACTION]
 *           description: Transaction status
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           description: Currency code (SEK for Swish)
 *         description:
 *           type: string
 *           description: Transaction description
 *         paymentMethodId:
 *           type: string
 *           nullable: true
 *           description: Payment method ID used
 *         metadata:
 *           type: object
 *           description: Additional transaction metadata
 *         failureReason:
 *           type: string
 *           nullable: true
 *           description: Reason for failure (if failed)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 * 
 *     SwishPaymentRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 1
 *           maximum: 150000
 *           description: Payment amount in SEK (1-150000)
 *           example: 299.50
 *         phoneNumber:
 *           type: string
 *           pattern: '^46[0-9]{8,9}$'
 *           description: Payer's Swish phone number (Swedish format)
 *           example: "46701234567"
 *         message:
 *           type: string
 *           maxLength: 50
 *           description: Payment message/description
 *           example: "QR SaaS Pro Subscription"
 * 
 *     SwishPaymentResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Swish payment ID
 *         status:
 *           type: string
 *           enum: [CREATED, PAID, DECLINED, ERROR, CANCELLED]
 *           description: Swish payment status
 *         amount:
 *           type: string
 *           description: Payment amount
 *         currency:
 *           type: string
 *           enum: [SEK]
 *           description: Currency (always SEK for Swish)
 *         payerAlias:
 *           type: string
 *           nullable: true
 *           description: Payer's Swish number
 *         payeeAlias:
 *           type: string
 *           description: Merchant's Swish number
 *         message:
 *           type: string
 *           nullable: true
 *           description: Payment message
 *         dateCreated:
 *           type: string
 *           format: date-time
 *           description: Payment creation date
 *         datePaid:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Payment completion date
 * 
 *     CreatePaymentMethodRequest:
 *       type: object
 *       required:
 *         - provider
 *         - methodData
 *       properties:
 *         provider:
 *           type: string
 *           enum: [STRIPE, KLARNA, SWISH, PAYPAL]
 *           description: Payment provider
 *         methodData:
 *           type: object
 *           description: Provider-specific payment method data
 *           oneOf:
 *             - type: object
 *               description: Stripe card data
 *               properties:
 *                 card:
 *                   type: object
 *                   properties:
 *                     number:
 *                       type: string
 *                       description: Card number
 *                     exp_month:
 *                       type: number
 *                       description: Expiration month
 *                     exp_year:
 *                       type: number
 *                       description: Expiration year
 *                     cvc:
 *                       type: string
 *                       description: Card verification code
 *             - type: object
 *               description: Swish phone number
 *               properties:
 *                 phoneNumber:
 *                   type: string
 *                   description: Swish phone number
 *         isDefault:
 *           type: boolean
 *           default: false
 *           description: Set as default payment method
 * 
 *     CreatePaymentIntentRequest:
 *       type: object
 *       required:
 *         - provider
 *         - amount
 *         - currency
 *       properties:
 *         provider:
 *           type: string
 *           enum: [STRIPE, KLARNA, PAYPAL]
 *           description: Payment provider (Swish uses direct payment)
 *         amount:
 *           type: number
 *           minimum: 0.01
 *           description: Payment amount
 *         currency:
 *           type: string
 *           description: Currency code (SEK, USD, EUR)
 *         paymentMethodId:
 *           type: string
 *           description: Payment method ID to use
 *         description:
 *           type: string
 *           description: Payment description
 *         metadata:
 *           type: object
 *           description: Additional metadata
 * 
 *     PaymentIntentResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Payment intent ID
 *         clientSecret:
 *           type: string
 *           description: Client secret for frontend confirmation
 *         status:
 *           type: string
 *           description: Payment intent status
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           description: Currency code
 *         provider:
 *           type: string
 *           description: Payment provider
 *         providerResponse:
 *           type: object
 *           description: Provider-specific response data
 * 
 *     RefundRequest:
 *       type: object
 *       properties:
 *         amount:
 *           type: number
 *           nullable: true
 *           description: Refund amount (partial refund), null for full refund
 *         reason:
 *           type: string
 *           enum: [duplicate, fraudulent, requested_by_customer]
 *           description: Refund reason
 * 
 * /api/payments/payment-methods:
 *   get:
 *     summary: Get user's payment methods
 *     description: Retrieve all payment methods for the authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [STRIPE, KLARNA, SWISH, PAYPAL]
 *         description: Filter by payment provider
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 *   post:
 *     summary: Create new payment method
 *     description: Add a new payment method for the authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentMethodRequest'
 *           examples:
 *             stripe-card:
 *               summary: Stripe Credit Card
 *               value:
 *                 provider: "STRIPE"
 *                 methodData:
 *                   card:
 *                     number: "4242424242424242"
 *                     exp_month: 12
 *                     exp_year: 2025
 *                     cvc: "123"
 *                   customerId: "cus_stripe_customer_id"
 *                 isDefault: true
 *             swish:
 *               summary: Swish Mobile Payment (Sweden)
 *               value:
 *                 provider: "SWISH"
 *                 methodData:
 *                   phoneNumber: "46701234567"
 *                 isDefault: false
 *     responses:
 *       201:
 *         description: Payment method created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/payment-methods/{paymentMethodId}/default:
 *   put:
 *     summary: Set default payment method
 *     description: Set a payment method as the default for the user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Default payment method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/payment-methods/{paymentMethodId}:
 *   delete:
 *     summary: Delete payment method
 *     description: Remove a payment method from the user's account
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Payment method deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/swish/payments:
 *   post:
 *     summary: Create Swish payment (Sweden)
 *     description: Create a new Swish payment for Swedish users. Returns payment details and QR code generation info.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SwishPaymentRequest'
 *           example:
 *             amount: 299.50
 *             phoneNumber: "46701234567"
 *             message: "QR SaaS Pro Subscription - Monthly"
 *     responses:
 *       201:
 *         description: Swish payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentTransaction'
 *             example:
 *               success: true
 *               data:
 *                 id: "txn_12345"
 *                 provider: "SWISH"
 *                 providerTransactionId: "SWISH_1699612800_abc12345"
 *                 status: "PENDING"
 *                 amount: 299.50
 *                 currency: "SEK"
 *                 description: "QR SaaS Payment - SWISH_1699612800_abc12345"
 *                 metadata:
 *                   paymentReference: "QR_1699612800_abc12345"
 *                   phoneNumber: "46701234567"
 *                   swishResponse:
 *                     id: "SWISH_1699612800"
 *                     status: "CREATED"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/swish/status/{transactionId}:
 *   get:
 *     summary: Get Swish payment status
 *     description: Check the current status of a Swish payment transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Swish payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SwishPaymentResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "SWISH_1699612800"
 *                 status: "PAID"
 *                 amount: "299.50"
 *                 currency: "SEK"
 *                 payerAlias: "46701234567"
 *                 datePaid: "2024-11-10T12:30:00Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/payment-intents:
 *   post:
 *     summary: Create payment intent
 *     description: Create a payment intent for Stripe, Klarna, or PayPal (not needed for Swish)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentIntentRequest'
 *     responses:
 *       201:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentIntentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: Retrieve payment transaction history for the authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *           maximum: 100
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentTransaction'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/transactions/{transactionId}/refund:
 *   post:
 *     summary: Process refund
 *     description: Process a full or partial refund for a transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID to refund
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundRequest'
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaymentTransaction'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * /api/payments/webhooks/swish:
 *   post:
 *     summary: Swish webhook callback
 *     description: Webhook endpoint for Swish payment status updates (no authentication required)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SwishPaymentResponse'
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Webhook processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/payments/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook callback
 *     description: Webhook endpoint for Stripe payment events (no authentication required)
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe webhook signature for verification
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook verification failed
 * 
 * components:
 *   responses:
 *     BadRequest:
 *       description: Bad request - Invalid input data
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: Unauthorized - Authentication required
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     InternalServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

// Export payment-related schemas for use in swagger configuration
export const paymentSchemas = {
  PaymentMethod: {
    type: 'object',
    required: ['provider', 'type'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      provider: { type: 'string', enum: ['STRIPE', 'KLARNA', 'SWISH', 'PAYPAL'] },
      type: { type: 'string' },
      card: {
        type: 'object',
        properties: {
          brand: { type: 'string' },
          last4: { type: 'string' },
          expMonth: { type: 'number' },
          expYear: { type: 'number' }
        }
      },
      swish: {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string' }
        }
      },
      isDefault: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },
  PaymentTransaction: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      subscriptionId: { type: 'string', format: 'uuid', nullable: true },
      provider: { type: 'string', enum: ['STRIPE', 'KLARNA', 'SWISH', 'PAYPAL'] },
      providerTransactionId: { type: 'string' },
      type: { type: 'string', enum: ['ONE_TIME', 'SUBSCRIPTION', 'REFUND'] },
      status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REQUIRES_ACTION'] },
      amount: { type: 'number' },
      currency: { type: 'string' },
      description: { type: 'string' },
      paymentMethodId: { type: 'string', nullable: true },
      metadata: { type: 'object' },
      failureReason: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  SwishPaymentRequest: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: { type: 'number', minimum: 1, maximum: 150000 },
      phoneNumber: { type: 'string', pattern: '^46[0-9]{8,9}$' },
      message: { type: 'string', maxLength: 50 }
    }
  }
};