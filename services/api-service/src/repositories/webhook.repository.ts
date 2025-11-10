import { Pool } from 'pg';
import { WebhookData, WebhookDelivery } from '../interfaces';

export class WebhookRepository {
    constructor(private dbPool: Pool) {}

    async createWebhook(webhookData: Omit<WebhookData, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookData> {
        const query = `
            INSERT INTO webhooks (
                user_id, url, events, secret, is_active,
                retry_policy, headers, timeout
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const values = [
            webhookData.userId,
            webhookData.url,
            JSON.stringify(webhookData.events),
            webhookData.secret,
            webhookData.isActive,
            JSON.stringify(webhookData.retryPolicy),
            JSON.stringify(webhookData.headers),
            webhookData.timeout
        ];

        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, values);
            return this.mapRowToWebhook(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async findByUserId(userId: string): Promise<WebhookData[]> {
        const query = 'SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC';
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [userId]);
            return result.rows.map(row => this.mapRowToWebhook(row));
        } finally {
            client.release();
        }
    }

    async findById(id: string, userId: string): Promise<WebhookData | null> {
        const query = 'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2';
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [id, userId]);
            return result.rows.length > 0 ? this.mapRowToWebhook(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    async updateWebhook(id: string, userId: string, updates: Partial<WebhookData>): Promise<boolean> {
        const allowedUpdates = ['url', 'events', 'isActive', 'retryPolicy', 'headers', 'timeout'];
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramCount = 0;

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key) && updates[key as keyof WebhookData] !== undefined) {
                paramCount++;
                updateFields.push(`${this.camelToSnakeCase(key)} = $${paramCount}`);
                let value = updates[key as keyof WebhookData];
                
                // Convert objects to JSON
                if (key === 'events' || key === 'retryPolicy' || key === 'headers') {
                    value = JSON.stringify(value);
                }
                
                updateValues.push(value);
            }
        });

        if (updateFields.length === 0) {
            return false;
        }

        updateValues.push(id, userId);
        const query = `
            UPDATE webhooks 
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
        `;

        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, updateValues);
            return (result.rowCount ?? 0) > 0;
        } finally {
            client.release();
        }
    }

    async deleteWebhook(id: string, userId: string): Promise<boolean> {
        const query = 'DELETE FROM webhooks WHERE id = $1 AND user_id = $2';
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [id, userId]);
            return (result.rowCount ?? 0) > 0;
        } finally {
            client.release();
        }
    }

    async createWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>): Promise<WebhookDelivery> {
        const query = `
            INSERT INTO webhook_deliveries (
                webhook_id, event_type, payload, status, attempts,
                last_attempt_at, next_retry_at, response_code, response_body, error_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const values = [
            delivery.webhookId,
            delivery.eventType,
            JSON.stringify(delivery.payload),
            delivery.status,
            delivery.attempts,
            delivery.lastAttemptAt,
            delivery.nextRetryAt,
            delivery.responseCode,
            delivery.responseBody,
            delivery.errorMessage
        ];

        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, values);
            return this.mapRowToWebhookDelivery(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async getWebhookDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
        const query = `
            SELECT * FROM webhook_deliveries 
            WHERE webhook_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [webhookId, limit]);
            return result.rows.map(row => this.mapRowToWebhookDelivery(row));
        } finally {
            client.release();
        }
    }

    async updateWebhookDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<boolean> {
        const allowedUpdates = ['status', 'attempts', 'lastAttemptAt', 'nextRetryAt', 'responseCode', 'responseBody', 'errorMessage'];
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramCount = 0;

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key) && updates[key as keyof WebhookDelivery] !== undefined) {
                paramCount++;
                updateFields.push(`${this.camelToSnakeCase(key)} = $${paramCount}`);
                updateValues.push(updates[key as keyof WebhookDelivery]);
            }
        });

        if (updateFields.length === 0) {
            return false;
        }

        updateValues.push(id);
        const query = `
            UPDATE webhook_deliveries 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount + 1}
        `;

        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, updateValues);
            return (result.rowCount ?? 0) > 0;
        } finally {
            client.release();
        }
    }

    private mapRowToWebhook(row: any): WebhookData {
        return {
            id: row.id,
            userId: row.user_id,
            url: row.url,
            events: JSON.parse(row.events || '[]'),
            secret: row.secret,
            isActive: row.is_active,
            retryPolicy: JSON.parse(row.retry_policy || '{}'),
            headers: row.headers ? JSON.parse(row.headers) : undefined,
            timeout: row.timeout,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapRowToWebhookDelivery(row: any): WebhookDelivery {
        return {
            id: row.id,
            webhookId: row.webhook_id,
            eventType: row.event_type,
            payload: JSON.parse(row.payload || '{}'),
            status: row.status,
            attempts: row.attempts,
            lastAttemptAt: row.last_attempt_at,
            nextRetryAt: row.next_retry_at,
            responseCode: row.response_code,
            responseBody: row.response_body,
            errorMessage: row.error_message,
            createdAt: row.created_at
        };
    }

    private camelToSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }
}