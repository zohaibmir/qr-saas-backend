import { Response } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyRequest, AuthenticatedRequest } from '../interfaces';
import Joi from 'joi';

export class ApiKeyController {
    constructor(private apiKeyService: ApiKeyService) {}

    createApiKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            // Validate request
            const validation = this.validateCreateApiKeyRequest(req.body);
            if (validation.error) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: validation.error.details
                });
                return;
            }

            const userId = req.user?.id; // Assume user is set by auth middleware
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const request: CreateApiKeyRequest = validation.value;
            const result = await this.apiKeyService.generateApiKey(userId, request);

            // Return the API key only once - don't store it
            res.status(201).json({
                message: 'API key created successfully',
                apiKey: result.apiKey, // This is the only time we show the full key
                data: {
                    id: result.data.id,
                    name: result.data.name,
                    prefix: result.data.prefix,
                    permissions: result.data.permissions,
                    expiresAt: result.data.expiresAt,
                    rateLimit: result.data.rateLimit,
                    createdAt: result.data.createdAt
                }
            });
        } catch (error) {
            console.error('Error creating API key:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    getUserApiKeys = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const apiKeys = await this.apiKeyService.getUserApiKeys(userId);

            // Never return the actual key or hash, only metadata
            const safeApiKeys = apiKeys.map(key => ({
                id: key.id,
                name: key.name,
                prefix: key.prefix,
                permissions: key.permissions,
                isActive: key.isActive,
                expiresAt: key.expiresAt,
                lastUsedAt: key.lastUsedAt,
                usageCount: key.usageCount,
                rateLimit: key.rateLimit,
                createdAt: key.createdAt
            }));

            res.json({
                message: 'API keys retrieved successfully',
                data: safeApiKeys
            });
        } catch (error) {
            console.error('Error getting API keys:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    revokeApiKey = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { keyId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            if (!keyId) {
                res.status(400).json({ error: 'API key ID is required' });
                return;
            }

            const revoked = await this.apiKeyService.revokeApiKey(keyId, userId);

            if (!revoked) {
                res.status(404).json({ error: 'API key not found' });
                return;
            }

            res.json({
                message: 'API key revoked successfully',
                keyId
            });
        } catch (error) {
            console.error('Error revoking API key:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    getApiKeyStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { keyId } = req.params;
            const { days = 30 } = req.query;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            if (!keyId) {
                res.status(400).json({ error: 'API key ID is required' });
                return;
            }

            // Verify the key belongs to the user
            const userApiKeys = await this.apiKeyService.getUserApiKeys(userId);
            const hasAccess = userApiKeys.some(key => key.id === keyId);

            if (!hasAccess) {
                res.status(403).json({ error: 'Access denied to this API key' });
                return;
            }

            const stats = await this.apiKeyService.getApiKeyStats(keyId, Number(days));

            res.json({
                message: 'API key statistics retrieved successfully',
                data: {
                    keyId,
                    period: `${days} days`,
                    stats
                }
            });
        } catch (error) {
            console.error('Error getting API key stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    private validateCreateApiKeyRequest(data: any): Joi.ValidationResult {
        const schema = Joi.object({
            name: Joi.string().min(1).max(100).required(),
            permissions: Joi.array().items(Joi.string()).min(1).required(),
            expiresAt: Joi.date().greater('now').optional(),
            rateLimit: Joi.object({
                requestsPerMinute: Joi.number().min(1).max(1000).optional(),
                requestsPerHour: Joi.number().min(1).max(100000).optional(),
                requestsPerDay: Joi.number().min(1).max(1000000).optional()
            }).optional(),
            ipWhitelist: Joi.array().items(Joi.string().ip()).optional()
        });

        return schema.validate(data);
    }
}