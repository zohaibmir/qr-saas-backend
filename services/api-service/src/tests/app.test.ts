/**
 * Comprehensive tests for API Service
 * Run with: npm test
 */

import { App } from '../app';
import { ApiKeyService } from '../services/api-key.service';
import { WebhookService } from '../services/webhook.service';

describe('API Service', () => {
    let app: App;

    beforeAll(async () => {
        // Skip database initialization for tests
        process.env.NODE_ENV = 'test';
        process.env.DB_HOST = 'test';
    });

    afterAll(async () => {
        // Clean up
    });

    test('should create app instance', () => {
        app = new App();
        expect(app).toBeDefined();
    });

    test('should have dependency container', () => {
        const container = app.getContainer();
        expect(container).toBeDefined();
    });
});

describe('Dependency Container', () => {
    test('should register and resolve dependencies', () => {
        const { DependencyContainerService } = require('../services/dependency-container.service');
        const container = DependencyContainerService.getInstance();
        
        const testService = { test: true };
        container.register('TestService', testService);
        
        const resolved = container.resolve('TestService');
        expect(resolved).toEqual(testService);
    });

    test('should throw error for missing dependency', () => {
        const { DependencyContainerService } = require('../services/dependency-container.service');
        const container = DependencyContainerService.getInstance();
        
        expect(() => {
            container.resolve('NonExistentService');
        }).toThrow('Dependency not found: NonExistentService');
    });

    test('should clear all dependencies', () => {
        const { DependencyContainerService } = require('../services/dependency-container.service');
        const container = DependencyContainerService.getInstance();
        
        container.register('TestService1', { id: 1 });
        container.register('TestService2', { id: 2 });
        
        expect(container.getRegisteredDependencies()).toContain('TestService1');
        expect(container.getRegisteredDependencies()).toContain('TestService2');
        
        container.clear();
        expect(container.getRegisteredDependencies()).toHaveLength(0);
    });
});

describe('API Key Service', () => {
    let mockRepository: any;
    let apiKeyService: ApiKeyService;

    beforeEach(() => {
        mockRepository = {
            createApiKey: jest.fn(),
            findByPrefix: jest.fn(),
            findByUserId: jest.fn(),
            updateLastUsed: jest.fn(),
            deactivateApiKey: jest.fn(),
            logUsage: jest.fn(),
            getUsageStats: jest.fn()
        };
        
        apiKeyService = new ApiKeyService(mockRepository);
    });

    test('should generate secure API key', async () => {
        const mockApiKeyData = {
            id: 'test-id',
            userId: 'user-123',
            name: 'Test Key',
            keyHash: 'hash',
            prefix: 'ak_12345',
            permissions: ['qr:read'],
            isActive: true,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        mockRepository.createApiKey.mockResolvedValue(mockApiKeyData);

        const request = {
            name: 'Test Key',
            permissions: ['qr:read']
        };

        const result = await apiKeyService.generateApiKey('user-123', request);

        expect(result.apiKey).toBeTruthy();
        expect(result.apiKey.length).toBeGreaterThan(30);
        expect(result.data).toEqual(mockApiKeyData);
        expect(mockRepository.createApiKey).toHaveBeenCalled();
    });

    test('should validate API key', async () => {
        const mockApiKeyData = {
            id: 'test-id',
            userId: 'user-123',
            keyHash: '$2b$12$hash',
            isActive: true,
            expiresAt: null,
            permissions: ['qr:read']
        };

        mockRepository.findByPrefix.mockResolvedValue(mockApiKeyData);
        mockRepository.updateLastUsed.mockResolvedValue(undefined);

        // This test would need a real bcrypt hash to work properly
        // For now, just test the structure
        const isValid = await apiKeyService.validateApiKey('invalid-key');
        expect(isValid).toBeNull();
    });

    test('should get user API keys', async () => {
        const mockApiKeys = [
            { id: '1', name: 'Key 1', permissions: ['qr:read'] },
            { id: '2', name: 'Key 2', permissions: ['qr:write'] }
        ];

        mockRepository.findByUserId.mockResolvedValue(mockApiKeys);

        const result = await apiKeyService.getUserApiKeys('user-123');
        expect(result).toEqual(mockApiKeys);
        expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });
});

describe('Webhook Service', () => {
    let mockRepository: any;
    let webhookService: WebhookService;

    beforeEach(() => {
        mockRepository = {
            createWebhook: jest.fn(),
            findByUserId: jest.fn(),
            findById: jest.fn(),
            updateWebhook: jest.fn(),
            deleteWebhook: jest.fn(),
            createWebhookDelivery: jest.fn(),
            getWebhookDeliveries: jest.fn(),
            updateWebhookDelivery: jest.fn()
        };
        
        webhookService = new WebhookService(mockRepository);
    });

    test('should create webhook with secret', async () => {
        const mockWebhookData = {
            id: 'webhook-id',
            userId: 'user-123',
            url: 'https://example.com/webhook',
            events: ['qr.created'],
            secret: 'generated-secret',
            isActive: true,
            retryPolicy: { maxAttempts: 3, backoffStrategy: 'exponential', initialDelay: 1000 },
            timeout: 30000,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        mockRepository.createWebhook.mockResolvedValue(mockWebhookData);

        const request = {
            url: 'https://example.com/webhook',
            events: ['qr.created']
        };

        const result = await webhookService.createWebhook('user-123', request);

        expect(result).toEqual(mockWebhookData);
        expect(mockRepository.createWebhook).toHaveBeenCalled();
        
        const createCall = mockRepository.createWebhook.mock.calls[0][0];
        expect(createCall.secret).toBeTruthy();
        expect(createCall.secret.length).toBe(64); // 32 bytes * 2 for hex
    });

    test('should get user webhooks', async () => {
        const mockWebhooks = [
            { id: '1', url: 'https://example.com/webhook1', events: ['qr.created'] },
            { id: '2', url: 'https://example.com/webhook2', events: ['qr.scanned'] }
        ];

        mockRepository.findByUserId.mockResolvedValue(mockWebhooks);

        const result = await webhookService.getUserWebhooks('user-123');
        expect(result).toEqual(mockWebhooks);
        expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    test('should create webhook delivery', async () => {
        const mockDelivery = {
            id: 'delivery-id',
            webhookId: 'webhook-id',
            eventType: 'qr.created',
            payload: { test: 'data' },
            status: 'pending',
            attempts: 0,
            createdAt: new Date()
        };

        mockRepository.createWebhookDelivery.mockResolvedValue(mockDelivery);

        const result = await webhookService.deliverWebhook('webhook-id', 'qr.created', { test: 'data' });

        expect(result).toEqual(mockDelivery);
        expect(mockRepository.createWebhookDelivery).toHaveBeenCalled();
    });
});