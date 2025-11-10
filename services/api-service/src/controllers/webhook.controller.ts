import { Response } from 'express';
import { WebhookService } from '../services/webhook.service';
import { CreateWebhookRequest, AuthenticatedRequest } from '../interfaces';
import Joi from 'joi';

export class WebhookController {
    constructor(private webhookService: WebhookService) {}

    createWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            // Validate request
            const validation = this.validateCreateWebhookRequest(req.body);
            if (validation.error) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: validation.error.details
                });
                return;
            }

            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const request: CreateWebhookRequest = validation.value;
            const webhook = await this.webhookService.createWebhook(userId, request);

            res.status(201).json({
                message: 'Webhook created successfully',
                data: {
                    id: webhook.id,
                    url: webhook.url,
                    events: webhook.events,
                    isActive: webhook.isActive,
                    retryPolicy: webhook.retryPolicy,
                    headers: webhook.headers,
                    timeout: webhook.timeout,
                    createdAt: webhook.createdAt
                }
            });
        } catch (error) {
            console.error('Error creating webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    getUserWebhooks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const webhooks = await this.webhookService.getUserWebhooks(userId);

            // Don't return the secret in the response
            const safeWebhooks = webhooks.map(webhook => ({
                id: webhook.id,
                url: webhook.url,
                events: webhook.events,
                isActive: webhook.isActive,
                retryPolicy: webhook.retryPolicy,
                headers: webhook.headers,
                timeout: webhook.timeout,
                createdAt: webhook.createdAt,
                updatedAt: webhook.updatedAt
            }));

            res.json({
                message: 'Webhooks retrieved successfully',
                data: safeWebhooks
            });
        } catch (error) {
            console.error('Error getting webhooks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    getWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { webhookId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            if (!webhookId) {
                res.status(400).json({ error: 'Webhook ID is required' });
                return;
            }

            const webhook = await this.webhookService.getWebhook(webhookId, userId);

            if (!webhook) {
                res.status(404).json({ error: 'Webhook not found' });
                return;
            }

            res.json({
                message: 'Webhook retrieved successfully',
                data: {
                    id: webhook.id,
                    url: webhook.url,
                    events: webhook.events,
                    isActive: webhook.isActive,
                    retryPolicy: webhook.retryPolicy,
                    headers: webhook.headers,
                    timeout: webhook.timeout,
                    createdAt: webhook.createdAt,
                    updatedAt: webhook.updatedAt
                }
            });
        } catch (error) {
            console.error('Error getting webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    updateWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { webhookId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            if (!webhookId) {
                res.status(400).json({ error: 'Webhook ID is required' });
                return;
            }

            // Validate update data
            const validation = this.validateUpdateWebhookRequest(req.body);
            if (validation.error) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: validation.error.details
                });
                return;
            }

            const updated = await this.webhookService.updateWebhook(webhookId, userId, validation.value);

            if (!updated) {
                res.status(404).json({ error: 'Webhook not found' });
                return;
            }

            res.json({
                message: 'Webhook updated successfully',
                webhookId
            });
        } catch (error) {
            console.error('Error updating webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    deleteWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { webhookId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            if (!webhookId) {
                res.status(400).json({ error: 'Webhook ID is required' });
                return;
            }

            const deleted = await this.webhookService.deleteWebhook(webhookId, userId);

            if (!deleted) {
                res.status(404).json({ error: 'Webhook not found' });
                return;
            }

            res.json({
                message: 'Webhook deleted successfully',
                webhookId
            });
        } catch (error) {
            console.error('Error deleting webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    getWebhookDeliveries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { webhookId } = req.params;
            const { limit = 50 } = req.query;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            if (!webhookId) {
                res.status(400).json({ error: 'Webhook ID is required' });
                return;
            }

            const deliveries = await this.webhookService.getWebhookDeliveries(webhookId, userId);

            res.json({
                message: 'Webhook deliveries retrieved successfully',
                data: {
                    webhookId,
                    deliveries: deliveries.slice(0, Number(limit))
                }
            });
        } catch (error) {
            console.error('Error getting webhook deliveries:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    retryWebhookDelivery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { deliveryId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            if (!deliveryId) {
                res.status(400).json({ error: 'Delivery ID is required' });
                return;
            }

            const retried = await this.webhookService.retryWebhookDelivery(deliveryId);

            if (!retried) {
                res.status(404).json({ error: 'Delivery not found or cannot be retried' });
                return;
            }

            res.json({
                message: 'Webhook delivery retry initiated',
                deliveryId
            });
        } catch (error) {
            console.error('Error retrying webhook delivery:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    private validateCreateWebhookRequest(data: any): Joi.ValidationResult {
        const schema = Joi.object({
            url: Joi.string().uri().required(),
            events: Joi.array().items(Joi.string()).min(1).required(),
            retryPolicy: Joi.object({
                maxAttempts: Joi.number().min(1).max(10).optional(),
                backoffStrategy: Joi.string().valid('linear', 'exponential').optional(),
                initialDelay: Joi.number().min(100).max(60000).optional()
            }).optional(),
            headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
            timeout: Joi.number().min(1000).max(60000).optional()
        });

        return schema.validate(data);
    }

    private validateUpdateWebhookRequest(data: any): Joi.ValidationResult {
        const schema = Joi.object({
            url: Joi.string().uri().optional(),
            events: Joi.array().items(Joi.string()).min(1).optional(),
            isActive: Joi.boolean().optional(),
            retryPolicy: Joi.object({
                maxAttempts: Joi.number().min(1).max(10).optional(),
                backoffStrategy: Joi.string().valid('linear', 'exponential').optional(),
                initialDelay: Joi.number().min(100).max(60000).optional()
            }).optional(),
            headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
            timeout: Joi.number().min(1000).max(60000).optional()
        });

        return schema.validate(data);
    }
}