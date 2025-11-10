import { Pool } from 'pg';
import { SdkGenerationJob, SdkGenerationStatus, SupportedLanguage } from '../interfaces/sdk.interface';

export interface ISdkRepository {
    createJob(job: Omit<SdkGenerationJob, 'id' | 'createdAt'>): Promise<SdkGenerationJob>;
    getJobById(id: string): Promise<SdkGenerationJob | null>;
    getJobsByUserId(userId: string): Promise<SdkGenerationJob[]>;
    updateJobStatus(id: string, status: SdkGenerationStatus, filePath?: string, errorMessage?: string): Promise<void>;
    deleteExpiredJobs(): Promise<number>;
}

export class SdkRepository implements ISdkRepository {
    constructor(private dbPool: Pool) {}

    public async createJob(jobData: Omit<SdkGenerationJob, 'id' | 'createdAt'>): Promise<SdkGenerationJob> {
        const query = `
            INSERT INTO sdk_generation_jobs (
                user_id, language, package_name, options, status, 
                file_path, error_message, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, user_id, language, package_name, options, status, 
                     file_path, error_message, created_at, completed_at, expires_at
        `;

        const values = [
            jobData.userId,
            jobData.language,
            jobData.packageName,
            JSON.stringify(jobData.options),
            jobData.status,
            jobData.filePath || null,
            jobData.errorMessage || null,
            jobData.expiresAt
        ];

        const result = await this.dbPool.query(query, values);
        return this.mapRowToJob(result.rows[0]);
    }

    public async getJobById(id: string): Promise<SdkGenerationJob | null> {
        const query = `
            SELECT id, user_id, language, package_name, options, status, 
                   file_path, error_message, created_at, completed_at, expires_at
            FROM sdk_generation_jobs 
            WHERE id = $1
        `;

        const result = await this.dbPool.query(query, [id]);
        return result.rows.length > 0 ? this.mapRowToJob(result.rows[0]) : null;
    }

    public async getJobsByUserId(userId: string): Promise<SdkGenerationJob[]> {
        const query = `
            SELECT id, user_id, language, package_name, options, status, 
                   file_path, error_message, created_at, completed_at, expires_at
            FROM sdk_generation_jobs 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `;

        const result = await this.dbPool.query(query, [userId]);
        return result.rows.map(row => this.mapRowToJob(row));
    }

    public async updateJobStatus(
        id: string, 
        status: SdkGenerationStatus, 
        filePath?: string, 
        errorMessage?: string
    ): Promise<void> {
        const query = `
            UPDATE sdk_generation_jobs 
            SET status = $2, file_path = $3, error_message = $4, 
                completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
            WHERE id = $1
        `;

        await this.dbPool.query(query, [id, status, filePath || null, errorMessage || null]);
    }

    public async deleteExpiredJobs(): Promise<number> {
        const query = `
            DELETE FROM sdk_generation_jobs 
            WHERE expires_at < NOW() OR status = 'expired'
        `;

        const result = await this.dbPool.query(query);
        return result.rowCount || 0;
    }

    private mapRowToJob(row: any): SdkGenerationJob {
        return {
            id: row.id,
            userId: row.user_id,
            language: row.language as SupportedLanguage,
            packageName: row.package_name,
            options: row.options,
            status: row.status as SdkGenerationStatus,
            filePath: row.file_path,
            errorMessage: row.error_message,
            createdAt: row.created_at,
            completedAt: row.completed_at,
            expiresAt: row.expires_at
        };
    }
}