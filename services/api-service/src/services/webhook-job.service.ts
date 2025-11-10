import { WebhookService } from './webhook.service';
import { WebhookRepository } from '../repositories/webhook.repository';

export class WebhookJobService {
    private jobQueue: Map<string, NodeJS.Timeout> = new Map();
    private isRunning = false;

    constructor(
        private webhookService: WebhookService,
        private webhookRepository: WebhookRepository
    ) {}

    public start(): void {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        console.log('[WebhookJobService] Starting webhook job processor...');
        
        // Process retry queue every 30 seconds
        this.processRetryQueue();
        
        // Set up periodic processing
        const interval = setInterval(() => {
            if (this.isRunning) {
                this.processRetryQueue();
            } else {
                clearInterval(interval);
            }
        }, 30000);
    }

    public stop(): void {
        this.isRunning = false;
        
        // Clear all scheduled jobs
        this.jobQueue.forEach((timeout, id) => {
            clearTimeout(timeout);
        });
        this.jobQueue.clear();
        
        console.log('[WebhookJobService] Webhook job processor stopped');
    }

    public async scheduleWebhookDelivery(
        webhookId: string,
        eventType: string,
        payload: any,
        delayMs: number = 0
    ): Promise<void> {
        const jobId = `${webhookId}-${Date.now()}`;
        
        const timeout = setTimeout(async () => {
            try {
                await this.webhookService.deliverWebhook(webhookId, eventType, payload);
                this.jobQueue.delete(jobId);
            } catch (error) {
                console.error('[WebhookJobService] Failed to deliver webhook:', error);
                this.jobQueue.delete(jobId);
            }
        }, delayMs);

        this.jobQueue.set(jobId, timeout);
        console.log(`[WebhookJobService] Scheduled webhook delivery for ${webhookId} in ${delayMs}ms`);
    }

    public async triggerWebhooksForEvent(
        userId: string,
        eventType: string,
        payload: any
    ): Promise<void> {
        try {
            await this.webhookService.triggerWebhooksForEvent(userId, eventType, payload);
        } catch (error) {
            console.error('[WebhookJobService] Failed to trigger webhooks for event:', error);
        }
    }

    private async processRetryQueue(): Promise<void> {
        try {
            // This is a simplified retry processor
            // In production, you'd use a proper job queue like Bull, Agenda, or similar
            console.log('[WebhookJobService] Processing retry queue...');

            // Get failed deliveries that need retry
            const failedDeliveries = await this.getFailedDeliveries();
            
            for (const delivery of failedDeliveries) {
                if (this.shouldRetry(delivery)) {
                    console.log(`[WebhookJobService] Retrying delivery ${delivery.id}`);
                    
                    // Schedule retry with exponential backoff
                    const delay = this.calculateRetryDelay(delivery.attempts);
                    await this.scheduleWebhookDelivery(
                        delivery.webhookId,
                        delivery.eventType,
                        delivery.payload,
                        delay
                    );

                    // Update next retry time in database
                    await this.webhookRepository.updateWebhookDelivery(delivery.id, {
                        status: 'retrying',
                        nextRetryAt: new Date(Date.now() + delay)
                    });
                }
            }
        } catch (error) {
            console.error('[WebhookJobService] Error processing retry queue:', error);
        }
    }

    private async getFailedDeliveries(): Promise<any[]> {
        // This would typically query the database for failed deliveries
        // For now, return empty array
        // TODO: Implement proper database query
        return [];
    }

    private shouldRetry(delivery: any): boolean {
        const maxAttempts = 3; // This should come from webhook configuration
        const retryWindow = 24 * 60 * 60 * 1000; // 24 hours
        
        return (
            delivery.attempts < maxAttempts &&
            delivery.status === 'failed' &&
            (!delivery.nextRetryAt || new Date() >= new Date(delivery.nextRetryAt)) &&
            (Date.now() - new Date(delivery.createdAt).getTime()) < retryWindow
        );
    }

    private calculateRetryDelay(attempts: number): number {
        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        const baseDelay = 1000;
        const maxDelay = 60000; // Max 1 minute
        
        const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
        
        // Add some jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        
        return Math.floor(delay + jitter);
    }
}