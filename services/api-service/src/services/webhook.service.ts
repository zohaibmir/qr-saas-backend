import crypto from 'crypto';
import axios from 'axios';
import { WebhookRepository } from '../repositories/webhook.repository';
import { WebhookData, WebhookDelivery, CreateWebhookRequest } from '../interfaces';

export class WebhookService {
    constructor(private webhookRepository: WebhookRepository) {}

    async createWebhook(userId: string, request: CreateWebhookRequest): Promise<WebhookData> {
        // Generate webhook secret
        const secret = this.generateWebhookSecret();

        const webhookData: Omit<WebhookData, 'id' | 'createdAt' | 'updatedAt'> = {
            userId,
            url: request.url,
            events: request.events,
            secret,
            isActive: true,
            retryPolicy: request.retryPolicy || {
                maxAttempts: 3,
                backoffStrategy: 'exponential',
                initialDelay: 1000
            },
            headers: request.headers,
            timeout: request.timeout || 30000
        };

        return await this.webhookRepository.createWebhook(webhookData);
    }

    async getUserWebhooks(userId: string): Promise<WebhookData[]> {
        return await this.webhookRepository.findByUserId(userId);
    }

    async getWebhook(id: string, userId: string): Promise<WebhookData | null> {
        return await this.webhookRepository.findById(id, userId);
    }

    async updateWebhook(id: string, userId: string, updates: Partial<WebhookData>): Promise<boolean> {
        return await this.webhookRepository.updateWebhook(id, userId, updates);
    }

    async deleteWebhook(id: string, userId: string): Promise<boolean> {
        return await this.webhookRepository.deleteWebhook(id, userId);
    }

    async deliverWebhook(
        webhookId: string, 
        eventType: string, 
        payload: any
    ): Promise<WebhookDelivery> {
        // Create initial delivery record
        const delivery = await this.webhookRepository.createWebhookDelivery({
            webhookId,
            eventType,
            payload,
            status: 'pending',
            attempts: 0
        });

        // Attempt to deliver the webhook
        await this.attemptDelivery(delivery);

        return delivery;
    }

    async retryWebhookDelivery(deliveryId: string): Promise<boolean> {
        // This would typically be called by a background job
        // For now, just return true
        return true;
    }

    async getWebhookDeliveries(webhookId: string, userId: string): Promise<WebhookDelivery[]> {
        // Verify webhook belongs to user
        const webhook = await this.webhookRepository.findById(webhookId, userId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        return await this.webhookRepository.getWebhookDeliveries(webhookId);
    }

    async triggerWebhooksForEvent(userId: string, eventType: string, payload: any): Promise<void> {
        // Get all active webhooks for this user that subscribe to this event
        const webhooks = await this.webhookRepository.findByUserId(userId);
        const relevantWebhooks = webhooks.filter(
            webhook => webhook.isActive && webhook.events.includes(eventType)
        );

        // Trigger each relevant webhook
        const deliveryPromises = relevantWebhooks.map(webhook => 
            this.deliverWebhook(webhook.id, eventType, payload)
        );

        await Promise.allSettled(deliveryPromises);
    }

    private async attemptDelivery(delivery: WebhookDelivery): Promise<void> {
        try {
            // Get webhook details
            const webhook = await this.webhookRepository.findById(delivery.webhookId, '');
            if (!webhook) {
                throw new Error('Webhook not found');
            }

            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Event': delivery.eventType,
                'X-Webhook-Delivery': delivery.id,
                'X-Webhook-Signature': this.generateSignature(delivery.payload, webhook.secret),
                ...webhook.headers
            };

            const startTime = Date.now();

            // Make the HTTP request
            const response = await axios.post(webhook.url, delivery.payload, {
                headers,
                timeout: webhook.timeout,
                validateStatus: () => true // Don't throw for non-2xx status codes
            });

            const responseTime = Date.now() - startTime;

            // Update delivery record
            await this.webhookRepository.updateWebhookDelivery(delivery.id, {
                status: response.status >= 200 && response.status < 300 ? 'success' : 'failed',
                attempts: delivery.attempts + 1,
                lastAttemptAt: new Date(),
                responseCode: response.status,
                responseBody: JSON.stringify(response.data).slice(0, 1000), // Limit size
                nextRetryAt: response.status >= 200 && response.status < 300 
                    ? undefined 
                    : this.calculateNextRetry(delivery.attempts + 1, webhook.retryPolicy)
            });

        } catch (error) {
            // Update delivery record with error
            await this.webhookRepository.updateWebhookDelivery(delivery.id, {
                status: 'failed',
                attempts: delivery.attempts + 1,
                lastAttemptAt: new Date(),
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                nextRetryAt: this.calculateNextRetry(delivery.attempts + 1, {
                    maxAttempts: 3,
                    backoffStrategy: 'exponential',
                    initialDelay: 1000
                })
            });
        }
    }

    private generateWebhookSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private generateSignature(payload: any, secret: string): string {
        const payloadString = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', secret)
            .update(payloadString, 'utf8')
            .digest('hex');
    }

    private calculateNextRetry(attempts: number, retryPolicy: WebhookData['retryPolicy']): Date | undefined {
        if (attempts >= retryPolicy.maxAttempts) {
            return undefined;
        }

        let delay = retryPolicy.initialDelay;
        
        if (retryPolicy.backoffStrategy === 'exponential') {
            delay = delay * Math.pow(2, attempts - 1);
        }

        return new Date(Date.now() + delay);
    }
}