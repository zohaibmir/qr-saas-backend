import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiKeyData, CreateApiKeyRequest } from '../interfaces';

export class ApiKeyService {
    constructor(private apiKeyRepository: ApiKeyRepository) {}

    async generateApiKey(userId: string, request: CreateApiKeyRequest): Promise<{ apiKey: string; data: ApiKeyData }> {
        // Generate secure API key
        const apiKey = this.generateSecureKey();
        const prefix = apiKey.substring(0, 8);
        const keyHash = await this.hashKey(apiKey);

        const apiKeyData: Omit<ApiKeyData, 'id' | 'createdAt' | 'updatedAt'> = {
            userId,
            name: request.name,
            keyHash,
            prefix,
            permissions: request.permissions,
            isActive: true,
            expiresAt: request.expiresAt,
            lastUsedAt: undefined,
            usageCount: 0,
            rateLimit: request.rateLimit || {
                requestsPerMinute: 60,
                requestsPerHour: 1000,
                requestsPerDay: 10000
            },
            ipWhitelist: request.ipWhitelist
        };

        const createdApiKey = await this.apiKeyRepository.createApiKey(apiKeyData);
        
        return {
            apiKey,
            data: createdApiKey
        };
    }

    async validateApiKey(apiKey: string): Promise<ApiKeyData | null> {
        const prefix = apiKey.substring(0, 8);
        const keyData = await this.apiKeyRepository.findByPrefix(prefix);
        
        if (!keyData) {
            return null;
        }

        // Check if key is active and not expired
        if (!keyData.isActive) {
            return null;
        }

        if (keyData.expiresAt && keyData.expiresAt < new Date()) {
            return null;
        }

        // Verify the key hash
        const isValid = await this.verifyKey(apiKey, keyData.keyHash);
        if (!isValid) {
            return null;
        }

        // Update last used timestamp
        await this.apiKeyRepository.updateLastUsed(keyData.id);

        return keyData;
    }

    async getUserApiKeys(userId: string): Promise<ApiKeyData[]> {
        return await this.apiKeyRepository.findByUserId(userId);
    }

    async revokeApiKey(apiKeyId: string, userId: string): Promise<boolean> {
        return await this.apiKeyRepository.deactivateApiKey(apiKeyId, userId);
    }

    async checkRateLimit(apiKey: ApiKeyData, endpoint: string): Promise<{ allowed: boolean; resetTime?: Date }> {
        if (!apiKey.rateLimit) {
            return { allowed: true };
        }

        // This is a simplified rate limiting check
        // In a production environment, you'd use Redis or similar for distributed rate limiting
        const now = new Date();
        const minute = Math.floor(now.getTime() / 60000);
        
        // For now, just return true - implement proper rate limiting with Redis later
        return { allowed: true };
    }

    async logApiUsage(
        apiKeyId: string, 
        endpoint: string, 
        method: string, 
        statusCode: number, 
        responseTime: number, 
        ipAddress: string, 
        userAgent?: string
    ): Promise<void> {
        await this.apiKeyRepository.logUsage({
            apiKeyId,
            endpoint,
            method,
            statusCode,
            responseTime,
            ipAddress,
            userAgent
        });
    }

    async getApiKeyStats(apiKeyId: string, days: number = 30): Promise<any> {
        return await this.apiKeyRepository.getUsageStats(apiKeyId, days);
    }

    private generateSecureKey(): string {
        // Generate a secure 32-byte random key and encode it as base64
        const randomBytes = crypto.randomBytes(32);
        return randomBytes.toString('base64').replace(/[+/=]/g, (match) => {
            switch (match) {
                case '+': return '-';
                case '/': return '_';
                case '=': return '';
                default: return match;
            }
        });
    }

    private async hashKey(apiKey: string): Promise<string> {
        const saltRounds = 12;
        return await bcrypt.hash(apiKey, saltRounds);
    }

    private async verifyKey(apiKey: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(apiKey, hash);
    }
}