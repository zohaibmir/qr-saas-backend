import { Pool } from 'pg';
import { ApiKeyData, ApiKeyUsage } from '../interfaces';

export class ApiKeyRepository {
    constructor(private dbPool: Pool) {}

    async createApiKey(apiKeyData: Omit<ApiKeyData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiKeyData> {
        const query = `
            INSERT INTO api_keys (
                user_id, name, key_hash, prefix, permissions, is_active,
                expires_at, usage_count, rate_limit, ip_whitelist
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const values = [
            apiKeyData.userId,
            apiKeyData.name,
            apiKeyData.keyHash,
            apiKeyData.prefix,
            JSON.stringify(apiKeyData.permissions),
            apiKeyData.isActive,
            apiKeyData.expiresAt,
            apiKeyData.usageCount,
            JSON.stringify(apiKeyData.rateLimit),
            JSON.stringify(apiKeyData.ipWhitelist)
        ];

        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, values);
            return this.mapRowToApiKey(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async findByPrefix(prefix: string): Promise<ApiKeyData | null> {
        const query = 'SELECT * FROM api_keys WHERE prefix = $1 AND is_active = true';
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [prefix]);
            return result.rows.length > 0 ? this.mapRowToApiKey(result.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    async findByUserId(userId: string): Promise<ApiKeyData[]> {
        const query = 'SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC';
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [userId]);
            return result.rows.map(row => this.mapRowToApiKey(row));
        } finally {
            client.release();
        }
    }

    async updateLastUsed(id: string): Promise<void> {
        const query = `
            UPDATE api_keys 
            SET last_used_at = NOW(), usage_count = usage_count + 1 
            WHERE id = $1
        `;
        
        const client = await this.dbPool.connect();
        try {
            await client.query(query, [id]);
        } finally {
            client.release();
        }
    }

    async deactivateApiKey(id: string, userId: string): Promise<boolean> {
        const query = 'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2';
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [id, userId]);
            return (result.rowCount ?? 0) > 0;
        } finally {
            client.release();
        }
    }

    async logUsage(usage: Omit<ApiKeyUsage, 'id' | 'timestamp'>): Promise<void> {
        const query = `
            INSERT INTO api_key_usage (
                api_key_id, endpoint, method, status_code, response_time,
                ip_address, user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const values = [
            usage.apiKeyId,
            usage.endpoint,
            usage.method,
            usage.statusCode,
            usage.responseTime,
            usage.ipAddress,
            usage.userAgent
        ];

        const client = await this.dbPool.connect();
        try {
            await client.query(query, values);
        } finally {
            client.release();
        }
    }

    async getUsageStats(apiKeyId: string, days: number = 30): Promise<any> {
        const query = `
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as requests,
                AVG(response_time) as avg_response_time,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors
            FROM api_key_usage 
            WHERE api_key_id = $1 
                AND timestamp >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
        `;
        
        const client = await this.dbPool.connect();
        try {
            const result = await client.query(query, [apiKeyId]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    private mapRowToApiKey(row: any): ApiKeyData {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            keyHash: row.key_hash,
            prefix: row.prefix,
            permissions: JSON.parse(row.permissions || '[]'),
            isActive: row.is_active,
            expiresAt: row.expires_at,
            lastUsedAt: row.last_used_at,
            usageCount: row.usage_count,
            rateLimit: row.rate_limit ? JSON.parse(row.rate_limit) : undefined,
            ipWhitelist: row.ip_whitelist ? JSON.parse(row.ip_whitelist) : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}