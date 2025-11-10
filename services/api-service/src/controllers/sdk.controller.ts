import { Response } from 'express';
import Joi from 'joi';
import { ISdkService } from '../services/sdk.service';
import { SupportedLanguage, SdkGenerationRequest } from '../interfaces/sdk.interface';
import { AuthenticatedRequest } from '../interfaces';

export interface ISdkController {
    generateSdk(req: AuthenticatedRequest, res: Response): Promise<void>;
    downloadSdk(req: AuthenticatedRequest, res: Response): Promise<void>;
    getSdkStatus(req: AuthenticatedRequest, res: Response): Promise<void>;
    getUserSdks(req: AuthenticatedRequest, res: Response): Promise<void>;
}

export class SdkController implements ISdkController {
    private readonly generateSdkSchema = Joi.object({
        language: Joi.string().valid(...Object.values(SupportedLanguage)).required(),
        packageName: Joi.string().min(1).max(100).required(),
        version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).default('1.0.0'),
        clientName: Joi.string().min(1).max(100).optional(),
        namespace: Joi.string().min(1).max(100).optional()
    });

    constructor(private sdkService: ISdkService) {}

    public async generateSdk(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            // Validate request
            const { error, value } = this.generateSdkSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    error: 'Validation Error',
                    message: error.details[0].message
                });
                return;
            }

            const request: SdkGenerationRequest = value;
            
            // Check if user already has a pending or generating job for the same language/package
            const existingJobs = await this.sdkService.getUserSdkJobs(userId);
            const activeJob = existingJobs.find(job => 
                job.language === request.language && 
                job.packageName === request.packageName &&
                (job.status === 'pending' || job.status === 'generating')
            );

            if (activeJob) {
                res.status(409).json({
                    error: 'SDK Generation In Progress',
                    message: `SDK generation for ${request.language} package "${request.packageName}" is already in progress`,
                    jobId: activeJob.id
                });
                return;
            }

            const result = await this.sdkService.generateSdk(userId, request);

            res.status(201).json({
                message: 'SDK generation started successfully',
                data: result
            });
        } catch (error) {
            console.error('[SdkController] Generate SDK error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to start SDK generation'
            });
        }
    }

    public async downloadSdk(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const { jobId } = req.params;

            if (!userId) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            if (!jobId) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Job ID is required'
                });
                return;
            }

            const downloadData = await this.sdkService.downloadSdk(jobId, userId);

            res.setHeader('Content-Type', downloadData.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${downloadData.fileName}"`);
            res.setHeader('Content-Length', downloadData.buffer.length);
            
            res.send(downloadData.buffer);
        } catch (error) {
            console.error('[SdkController] Download SDK error:', error);
            
            if (error instanceof Error) {
                const message = error.message;
                if (message.includes('not found')) {
                    res.status(404).json({
                        error: 'Not Found',
                        message
                    });
                } else if (message.includes('not completed') || message.includes('expired')) {
                    res.status(400).json({
                        error: 'Bad Request',
                        message
                    });
                } else {
                    res.status(500).json({
                        error: 'Internal Server Error',
                        message: 'Failed to download SDK'
                    });
                }
            } else {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Failed to download SDK'
                });
            }
        }
    }

    public async getSdkStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const { jobId } = req.params;

            if (!userId) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            if (!jobId) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Job ID is required'
                });
                return;
            }

            const job = await this.sdkService.getGenerationStatus(jobId, userId);
            
            if (!job) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'SDK generation job not found'
                });
                return;
            }

            res.json({
                message: 'SDK job status retrieved successfully',
                data: {
                    id: job.id,
                    language: job.language,
                    packageName: job.packageName,
                    status: job.status,
                    createdAt: job.createdAt,
                    completedAt: job.completedAt,
                    expiresAt: job.expiresAt,
                    errorMessage: job.errorMessage,
                    downloadUrl: job.status === 'completed' ? `/api/v1/sdks/${job.id}/download` : null
                }
            });
        } catch (error) {
            console.error('[SdkController] Get SDK status error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to get SDK status'
            });
        }
    }

    public async getUserSdks(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            const jobs = await this.sdkService.getUserSdkJobs(userId);

            const formattedJobs = jobs.map(job => ({
                id: job.id,
                language: job.language,
                packageName: job.packageName,
                status: job.status,
                createdAt: job.createdAt,
                completedAt: job.completedAt,
                expiresAt: job.expiresAt,
                errorMessage: job.errorMessage,
                downloadUrl: job.status === 'completed' ? `/api/v1/sdks/${job.id}/download` : null
            }));

            res.json({
                message: 'User SDKs retrieved successfully',
                data: formattedJobs,
                total: formattedJobs.length
            });
        } catch (error) {
            console.error('[SdkController] Get user SDKs error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to get user SDKs'
            });
        }
    }
}