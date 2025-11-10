export interface ApiKeyData {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    prefix: string;
    permissions: string[];
    isActive: boolean;
    expiresAt?: Date;
    lastUsedAt?: Date;
    usageCount: number;
    rateLimit?: {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
    };
    ipWhitelist?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateApiKeyRequest {
    name: string;
    permissions: string[];
    expiresAt?: Date;
    rateLimit?: {
        requestsPerMinute: number;
        requestsPerHour: number;
        requestsPerDay: number;
    };
    ipWhitelist?: string[];
}

export interface ApiKeyUsage {
    id: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress: string;
    userAgent?: string;
    timestamp: Date;
}

export interface WebhookData {
    id: string;
    userId: string;
    url: string;
    events: string[];
    secret: string;
    isActive: boolean;
    retryPolicy: {
        maxAttempts: number;
        backoffStrategy: 'linear' | 'exponential';
        initialDelay: number;
    };
    headers?: Record<string, string>;
    timeout: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWebhookRequest {
    url: string;
    events: string[];
    retryPolicy?: {
        maxAttempts: number;
        backoffStrategy: 'linear' | 'exponential';
        initialDelay: number;
    };
    headers?: Record<string, string>;
    timeout?: number;
}

export interface WebhookDelivery {
    id: string;
    webhookId: string;
    eventType: string;
    payload: any;
    status: 'pending' | 'success' | 'failed' | 'retrying';
    attempts: number;
    lastAttemptAt?: Date;
    nextRetryAt?: Date;
    responseCode?: number;
    responseBody?: string;
    errorMessage?: string;
    createdAt: Date;
}

export interface IntegrationData {
    id: string;
    userId: string;
    platform: string;
    name: string;
    config: Record<string, any>;
    credentials: Record<string, any>;
    isActive: boolean;
    syncSettings: {
        autoSync: boolean;
        syncFrequency: number; // in minutes
        lastSyncAt?: Date;
    };
    mapping: {
        qrFields: Record<string, string>;
        platformFields: Record<string, string>;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateIntegrationRequest {
    platform: string;
    name: string;
    config: Record<string, any>;
    credentials: Record<string, any>;
    syncSettings?: {
        autoSync: boolean;
        syncFrequency: number;
    };
    mapping?: {
        qrFields: Record<string, string>;
        platformFields: Record<string, string>;
    };
}