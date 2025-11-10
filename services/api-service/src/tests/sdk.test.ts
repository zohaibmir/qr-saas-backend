import { Pool } from 'pg';
import { SdkRepository } from '../repositories/sdk.repository';
import { SdkService } from '../services/sdk.service';
import { SupportedLanguage, SdkGenerationStatus } from '../interfaces/sdk.interface';

// Mock dependencies
jest.mock('child_process');

const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
} as unknown as Pool;

const mockRepository = {
    createJob: jest.fn(),
    getJobById: jest.fn(),
    getJobsByUserId: jest.fn(),
    updateJobStatus: jest.fn(),
    deleteExpiredJobs: jest.fn()
};

describe('SdkService', () => {
    let sdkService: SdkService;
    
    beforeEach(() => {
        jest.clearAllMocks();
        sdkService = new SdkService(mockRepository as any);
    });

    describe('generateSdk', () => {
        it('should create a new SDK generation job', async () => {
            const userId = '123e4567-e89b-12d3-a456-426614174000';
            const request = {
                language: SupportedLanguage.JAVASCRIPT,
                packageName: 'test-client',
                version: '1.0.0'
            };

            const mockJob = {
                id: 'job-123',
                userId,
                language: request.language,
                packageName: request.packageName,
                status: SdkGenerationStatus.PENDING,
                options: { version: '1.0.0', clientName: 'QRSaaSClient' },
                createdAt: new Date(),
                expiresAt: new Date()
            };

            mockRepository.createJob.mockResolvedValue(mockJob);

            const result = await sdkService.generateSdk(userId, request);

            expect(mockRepository.createJob).toHaveBeenCalledWith({
                userId,
                language: request.language,
                packageName: request.packageName,
                options: expect.objectContaining({
                    version: '1.0.0',
                    clientName: 'QRSaaSClient'
                }),
                status: SdkGenerationStatus.PENDING,
                expiresAt: expect.any(Date)
            });

            expect(result).toEqual({
                id: mockJob.id,
                language: request.language,
                packageName: request.packageName,
                downloadUrl: `/api/v1/sdks/${mockJob.id}/download`,
                expiresAt: mockJob.expiresAt,
                generatedAt: mockJob.createdAt,
                status: mockJob.status
            });
        });

        it('should set default client name based on language', async () => {
            const userId = '123e4567-e89b-12d3-a456-426614174000';
            const request = {
                language: SupportedLanguage.GO,
                packageName: 'test-client'
            };

            mockRepository.createJob.mockResolvedValue({
                id: 'job-123',
                userId,
                language: request.language,
                packageName: request.packageName,
                status: SdkGenerationStatus.PENDING,
                options: {},
                createdAt: new Date(),
                expiresAt: new Date()
            });

            await sdkService.generateSdk(userId, request);

            expect(mockRepository.createJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        clientName: 'qrsaasclient' // Go has lowercase naming convention
                    })
                })
            );
        });
    });

    describe('downloadSdk', () => {
        it('should throw error if job not found', async () => {
            const jobId = 'non-existent-job';
            const userId = '123e4567-e89b-12d3-a456-426614174000';

            mockRepository.getJobById.mockResolvedValue(null);

            await expect(sdkService.downloadSdk(jobId, userId))
                .rejects.toThrow('SDK generation job not found');
        });

        it('should throw error if job belongs to different user', async () => {
            const jobId = 'job-123';
            const userId = '123e4567-e89b-12d3-a456-426614174000';
            const differentUserId = '987f6543-c21e-43d2-a890-123456789000';

            const mockJob = {
                id: jobId,
                userId: differentUserId,
                status: SdkGenerationStatus.COMPLETED,
                filePath: '/path/to/sdk.zip',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            };

            mockRepository.getJobById.mockResolvedValue(mockJob);

            await expect(sdkService.downloadSdk(jobId, userId))
                .rejects.toThrow('SDK generation job not found');
        });

        it('should throw error if SDK generation not completed', async () => {
            const jobId = 'job-123';
            const userId = '123e4567-e89b-12d3-a456-426614174000';

            const mockJob = {
                id: jobId,
                userId,
                status: SdkGenerationStatus.GENERATING,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            };

            mockRepository.getJobById.mockResolvedValue(mockJob);

            await expect(sdkService.downloadSdk(jobId, userId))
                .rejects.toThrow('SDK generation not completed. Current status: generating');
        });

        it('should throw error if download has expired', async () => {
            const jobId = 'job-123';
            const userId = '123e4567-e89b-12d3-a456-426614174000';

            const mockJob = {
                id: jobId,
                userId,
                status: SdkGenerationStatus.COMPLETED,
                filePath: '/path/to/sdk.zip',
                expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
            };

            mockRepository.getJobById.mockResolvedValue(mockJob);
            mockRepository.updateJobStatus.mockResolvedValue(undefined);

            await expect(sdkService.downloadSdk(jobId, userId))
                .rejects.toThrow('SDK download has expired');

            expect(mockRepository.updateJobStatus)
                .toHaveBeenCalledWith(jobId, SdkGenerationStatus.EXPIRED);
        });
    });

    describe('getGenerationStatus', () => {
        it('should return null for non-existent job', async () => {
            const jobId = 'non-existent-job';
            const userId = '123e4567-e89b-12d3-a456-426614174000';

            mockRepository.getJobById.mockResolvedValue(null);

            const result = await sdkService.getGenerationStatus(jobId, userId);

            expect(result).toBeNull();
        });

        it('should return null for job belonging to different user', async () => {
            const jobId = 'job-123';
            const userId = '123e4567-e89b-12d3-a456-426614174000';
            const differentUserId = '987f6543-c21e-43d2-a890-123456789000';

            const mockJob = {
                id: jobId,
                userId: differentUserId,
                status: SdkGenerationStatus.COMPLETED
            };

            mockRepository.getJobById.mockResolvedValue(mockJob);

            const result = await sdkService.getGenerationStatus(jobId, userId);

            expect(result).toBeNull();
        });

        it('should return job status for valid request', async () => {
            const jobId = 'job-123';
            const userId = '123e4567-e89b-12d3-a456-426614174000';

            const mockJob = {
                id: jobId,
                userId,
                language: SupportedLanguage.PYTHON,
                packageName: 'test-client',
                status: SdkGenerationStatus.COMPLETED,
                createdAt: new Date(),
                completedAt: new Date(),
                expiresAt: new Date()
            };

            mockRepository.getJobById.mockResolvedValue(mockJob);

            const result = await sdkService.getGenerationStatus(jobId, userId);

            expect(result).toEqual(mockJob);
        });
    });

    describe('getUserSdkJobs', () => {
        it('should return user SDK jobs', async () => {
            const userId = '123e4567-e89b-12d3-a456-426614174000';
            const mockJobs = [
                {
                    id: 'job-1',
                    userId,
                    language: SupportedLanguage.JAVASCRIPT,
                    packageName: 'js-client',
                    status: SdkGenerationStatus.COMPLETED
                },
                {
                    id: 'job-2',
                    userId,
                    language: SupportedLanguage.PYTHON,
                    packageName: 'python-client',
                    status: SdkGenerationStatus.GENERATING
                }
            ];

            mockRepository.getJobsByUserId.mockResolvedValue(mockJobs);

            const result = await sdkService.getUserSdkJobs(userId);

            expect(result).toEqual(mockJobs);
            expect(mockRepository.getJobsByUserId).toHaveBeenCalledWith(userId);
        });
    });

    describe('cleanupExpiredJobs', () => {
        it('should clean up expired jobs and return count', async () => {
            const deletedCount = 3;
            mockRepository.deleteExpiredJobs.mockResolvedValue(deletedCount);

            const result = await sdkService.cleanupExpiredJobs();

            expect(result).toBe(deletedCount);
            expect(mockRepository.deleteExpiredJobs).toHaveBeenCalled();
        });
    });
});

describe('SdkRepository', () => {
    let sdkRepository: SdkRepository;
    
    beforeEach(() => {
        jest.clearAllMocks();
        sdkRepository = new SdkRepository(mockPool);
    });

    describe('createJob', () => {
        it('should create a new SDK generation job', async () => {
            const jobData = {
                userId: '123e4567-e89b-12d3-a456-426614174000',
                language: SupportedLanguage.JAVASCRIPT,
                packageName: 'test-client',
                options: { version: '1.0.0', clientName: 'TestClient' },
                status: SdkGenerationStatus.PENDING,
                expiresAt: new Date()
            };

            const mockRow = {
                id: 'job-123',
                user_id: jobData.userId,
                language: jobData.language,
                package_name: jobData.packageName,
                options: jobData.options,
                status: jobData.status,
                file_path: null,
                error_message: null,
                created_at: new Date(),
                completed_at: null,
                expires_at: jobData.expiresAt
            };

            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: [mockRow]
            });

            const result = await sdkRepository.createJob(jobData);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO sdk_generation_jobs'),
                [
                    jobData.userId,
                    jobData.language,
                    jobData.packageName,
                    JSON.stringify(jobData.options),
                    jobData.status,
                    null,
                    null,
                    jobData.expiresAt
                ]
            );

            expect(result).toEqual({
                id: mockRow.id,
                userId: mockRow.user_id,
                language: mockRow.language,
                packageName: mockRow.package_name,
                options: mockRow.options,
                status: mockRow.status,
                filePath: mockRow.file_path,
                errorMessage: mockRow.error_message,
                createdAt: mockRow.created_at,
                completedAt: mockRow.completed_at,
                expiresAt: mockRow.expires_at
            });
        });
    });

    describe('getJobById', () => {
        it('should return job by ID', async () => {
            const jobId = 'job-123';
            const mockRow = {
                id: jobId,
                user_id: '123e4567-e89b-12d3-a456-426614174000',
                language: SupportedLanguage.PYTHON,
                package_name: 'test-client',
                options: { version: '1.0.0' },
                status: SdkGenerationStatus.COMPLETED,
                file_path: '/path/to/sdk.zip',
                error_message: null,
                created_at: new Date(),
                completed_at: new Date(),
                expires_at: new Date()
            };

            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: [mockRow]
            });

            const result = await sdkRepository.getJobById(jobId);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, user_id, language'),
                [jobId]
            );

            expect(result).toEqual({
                id: mockRow.id,
                userId: mockRow.user_id,
                language: mockRow.language,
                packageName: mockRow.package_name,
                options: mockRow.options,
                status: mockRow.status,
                filePath: mockRow.file_path,
                errorMessage: mockRow.error_message,
                createdAt: mockRow.created_at,
                completedAt: mockRow.completed_at,
                expiresAt: mockRow.expires_at
            });
        });

        it('should return null for non-existent job', async () => {
            const jobId = 'non-existent-job';

            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: []
            });

            const result = await sdkRepository.getJobById(jobId);

            expect(result).toBeNull();
        });
    });

    describe('updateJobStatus', () => {
        it('should update job status', async () => {
            const jobId = 'job-123';
            const status = SdkGenerationStatus.COMPLETED;
            const filePath = '/path/to/sdk.zip';

            (mockPool.query as jest.Mock).mockResolvedValue({});

            await sdkRepository.updateJobStatus(jobId, status, filePath);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE sdk_generation_jobs'),
                [jobId, status, filePath, undefined]
            );
        });
    });

    describe('deleteExpiredJobs', () => {
        it('should delete expired jobs and return count', async () => {
            const deletedCount = 5;

            (mockPool.query as jest.Mock).mockResolvedValue({
                rowCount: deletedCount
            });

            const result = await sdkRepository.deleteExpiredJobs();

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM sdk_generation_jobs')
            );

            expect(result).toBe(deletedCount);
        });
    });
});