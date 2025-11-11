export interface ProductQRData {
    productId: string;
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    productUrl: string;
    imageUrl?: string;
    brand?: string;
    category?: string;
    sku?: string;
    availability?: 'in_stock' | 'out_of_stock' | 'limited' | 'pre_order';
    stockCount?: number;
    variants?: ProductVariant[];
    enableDynamicPricing?: boolean;
    priceRules?: PriceRule[];
    trackInventory?: boolean;
    lowStockThreshold?: number;
    trackViews?: boolean;
    trackClicks?: boolean;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}
export interface ProductVariant {
    id: string;
    name: string;
    sku?: string;
    price?: number;
    stockCount?: number;
    attributes: {
        [key: string]: string;
    };
}
export interface PriceRule {
    id: string;
    name: string;
    type: 'percentage' | 'fixed' | 'bulk_discount';
    value: number;
    conditions: PriceCondition[];
    priority: number;
    validFrom?: Date;
    validTo?: Date;
    isActive: boolean;
}
export interface PriceCondition {
    type: 'quantity' | 'user_tier' | 'time_range' | 'location' | 'first_time_buyer';
    operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
}
export interface CouponQRData {
    couponCode: string;
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
    discountValue: number;
    minimumPurchase?: number;
    maximumDiscount?: number;
    currency?: string;
    usageLimit?: number;
    usageLimitPerUser?: number;
    currentUsage: number;
    validFrom: Date;
    validTo: Date;
    applicableProducts?: string[];
    applicableCategories?: string[];
    excludedProducts?: string[];
    firstTimeOnly?: boolean;
    autoApply?: boolean;
    redirectUrl?: string;
    buyQuantity?: number;
    getQuantity?: number;
    getFreeProduct?: string;
}
export interface PaymentQRData {
    type: 'stripe' | 'paypal' | 'klarna' | 'swish' | 'generic';
    amount?: number;
    currency: string;
    description?: string;
    stripePaymentIntentId?: string;
    stripePublishableKey?: string;
    paypalOrderId?: string;
    paypalClientId?: string;
    klarnaSessionId?: string;
    klarnaClientToken?: string;
    swishRecipient?: string;
    swishMessage?: string;
    paymentUrl?: string;
    enableDynamicPricing?: boolean;
    priceRules?: PriceRule[];
    successUrl?: string;
    cancelUrl?: string;
    webhookUrl?: string;
    customerEmail?: string;
    customerId?: string;
    allowGuestCheckout?: boolean;
}
export interface InventoryIntegration {
    id: string;
    userId: string;
    name: string;
    type: 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'custom' | 'manual';
    platform: 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'custom' | 'manual';
    platformVersion?: string;
    credentials: string;
    apiEndpoint?: string;
    apiKey?: string;
    apiSecret?: string;
    shopifyStoreName?: string;
    shopifyAccessToken?: string;
    wooCommerceUrl?: string;
    wooCommerceConsumerKey?: string;
    wooCommerceConsumerSecret?: string;
    products?: ManualInventoryItem[];
    syncSettings?: {
        autoSync?: boolean;
        syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'manual';
        lastSyncAt?: Date | null;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ShopifyConfig {
    shopDomain: string;
    accessToken: string;
    apiVersion?: string;
    webhookSecret?: string;
}
export interface WooCommerceConfig {
    baseUrl: string;
    consumerKey: string;
    consumerSecret: string;
    version?: string;
    verifySSL?: boolean;
}
export interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    stockCount: number;
    price: number;
    currency: string;
    productUrl?: string;
    imageUrl?: string;
    category?: string;
    updatedAt: Date;
}
export interface ManualInventoryItem {
    productId: string;
    sku: string;
    name: string;
    stockCount: number;
    price: number;
    currency: string;
    updatedAt: Date;
}
export interface EcommerceQRCode {
    id: string;
    qrCodeId: string;
    type: 'product' | 'coupon' | 'payment' | 'inventory';
    productData?: ProductQRData;
    couponData?: CouponQRData;
    paymentData?: PaymentQRData;
    inventoryIntegrationId?: string;
    views: number;
    scans: number;
    conversions: number;
    revenue: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface EcommerceAnalytics {
    qrCodeId: string;
    type: 'view' | 'scan' | 'click' | 'add_to_cart' | 'purchase';
    productId?: string;
    couponCode?: string;
    amount?: number;
    currency?: string;
    userAgent?: string;
    ipHash?: string;
    country?: string;
    city?: string;
    cartValue?: number;
    itemsCount?: number;
    customerType?: 'new' | 'returning';
    timestamp: Date;
}
export interface CreateProductQRRequest {
    qrCodeId: string;
    productData: ProductQRData;
    inventoryIntegrationId?: string;
}
export interface CreateCouponQRRequest {
    qrCodeId: string;
    couponData: CouponQRData;
}
export interface CreatePaymentQRRequest {
    qrCodeId: string;
    paymentData: PaymentQRData;
}
export interface EcommerceQRResponse {
    id: string;
    qrCodeId: string;
    type: 'product' | 'coupon' | 'payment' | 'inventory';
    data: ProductQRData | CouponQRData | PaymentQRData;
    analytics: {
        views: number;
        scans: number;
        conversions: number;
        revenue: number;
        conversionRate: number;
        averageOrderValue: number;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface InventoryStatus {
    productId: string;
    sku: string;
    stockCount: number;
    availability: 'in_stock' | 'out_of_stock' | 'limited' | 'pre_order';
    lastUpdated: Date;
    source: string;
}
export interface EcommerceDashboard {
    totalProducts: number;
    totalCoupons: number;
    totalPayments: number;
    totalRevenue: number;
    totalConversions: number;
    conversionRate: number;
    averageOrderValue: number;
    topProducts: Array<{
        productId: string;
        name: string;
        scans: number;
        conversions: number;
        revenue: number;
    }>;
    topCoupons: Array<{
        couponCode: string;
        name: string;
        usage: number;
        discountGiven: number;
    }>;
    revenueByDay: Array<{
        date: string;
        revenue: number;
        conversions: number;
    }>;
    inventoryAlerts: Array<{
        productId: string;
        name: string;
        currentStock: number;
        threshold: number;
        status: 'low_stock' | 'out_of_stock';
    }>;
}
//# sourceMappingURL=ecommerce.types.d.ts.map