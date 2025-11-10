import { Response } from 'express';
import { SdkController } from '../controllers/sdk.controller';
import { SupportedLanguage, SdkGenerationStatus } from '../interfaces/sdk.interface';
import { AuthenticatedRequest } from '../interfaces';

const mockSdkService = {
    generateSdk: jest.fn(),
    downloadSdk: jest.fn(),
    getGenerationStatus: jest.fn(),
    getUserSdkJobs: jest.fn(),
    cleanupExpiredJobs: jest.fn()
};

const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res as Response;
};

const mockAuthenticatedRequest = (body?: any, params?: any, user?: any): AuthenticatedRequest => {
    return {
        body: body || {},
        params: params || {},
        user: user || { id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', role: 'user' }
    } as AuthenticatedRequest;
};

describe('SdkController', () => {
    let sdkController: SdkController;
    
    beforeEach(() => {
        jest.clearAllMocks();
        sdkController = new SdkController(mockSdkService as any);
    });

    describe('generateSdk', () => {
        it('should generate SDK successfully', async () => {
            const req = mockAuthenticatedRequest({
                language: SupportedLanguage.JAVASCRIPT,
                packageName: 'test-client',
                version: '1.0.0'
            });
            const res = mockResponse();

            const mockResult = {
                id: 'job-123',
                language: SupportedLanguage.JAVASCRIPT,
                packageName: 'test-client',
                downloadUrl: '/api/v1/sdks/job-123/download',
                expiresAt: new Date(),
                generatedAt: new Date(),
                status: SdkGenerationStatus.PENDING
            };

            mockSdkService.generateSdk.mockResolvedValue(mockResult);
            mockSdkService.getUserSdkJobs.mockResolvedValue([]);

            await sdkController.generateSdk(req, res);

            expect(mockSdkService.generateSdk).toHaveBeenCalledWith(
                req.user!.id,
                expect.objectContaining({
                    language: SupportedLanguage.JAVASCRIPT,
                    packageName: 'test-client',
                    version: '1.0.0'
                })
            );

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'SDK generation started successfully',
                data: mockResult
            });
        });

        it('should return 401 if user not authenticated', async () => {
            const req = mockAuthenticatedRequest({
                language: SupportedLanguage.JAVASCRIPT,
                packageName: 'test-client'
            }, {}, undefined); // undefined user instead of null
            const res = mockResponse();

            await sdkController.generateSdk(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'User authentication required'
            });
        });

        it('should return 400 for invalid request body', async () => {
            const req = mockAuthenticatedRequest({
                language: 'invalid-language',
                packageName: ''
            });
            const res = mockResponse();

            await sdkController.generateSdk(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Validation Error',
                message: expect.stringContaining('"language" must be one of')
            });
        });

        it('should return 409 if SDK generation already in progress', async () => {
            const req = mockAuthenticatedRequest({
                language: SupportedLanguage.JAVASCRIPT,
                packageName: 'test-client'
            });
            const res = mockResponse();

            const existingJob = {
                id: 'existing-job',
                language: SupportedLanguage.JAVASCRIPT,
                packageName: 'test-client',
                status: SdkGenerationStatus.GENERATING,
                userId: req.user!.id
            };

            mockSdkService.getUserSdkJobs.mockResolvedValue([existingJob]);

            await sdkController.generateSdk(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                error: 'SDK Generation In Progress',
                message: 'SDK generation for javascript package "test-client" is already in progress',
                jobId: existingJob.id
            });
        });
    });

    describe('downloadSdk', () => {
        it('should download SDK successfully', async () => {
            const req = mockAuthenticatedRequest({}, { jobId: 'job-123' });
            const res = mockResponse();

            const mockDownloadData = {
                fileName: 'test-client-javascript-sdk.zip',
                contentType: 'application/zip',
                buffer: Buffer.from('mock zip content')
            };

            mockSdkService.downloadSdk.mockResolvedValue(mockDownloadData);

            await sdkController.downloadSdk(req, res);

            expect(mockSdkService.downloadSdk).toHaveBeenCalledWith('job-123', req.user!.id);
            
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="test-client-javascript-sdk.zip"');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Length', mockDownloadData.buffer.length);
            expect(res.send).toHaveBeenCalledWith(mockDownloadData.buffer);
        });

        it('should return 404 for non-existent job', async () => {
            const req = mockAuthenticatedRequest({}, { jobId: 'non-existent' });
            const res = mockResponse();

            mockSdkService.downloadSdk.mockRejectedValue(new Error('SDK generation job not found'));

            await sdkController.downloadSdk(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'SDK generation job not found'
            });
        });

        it('should return 400 for expired download', async () => {
            const req = mockAuthenticatedRequest({}, { jobId: 'expired-job' });
            const res = mockResponse();

            mockSdkService.downloadSdk.mockRejectedValue(new Error('SDK download has expired'));

            await sdkController.downloadSdk(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'SDK download has expired'
            });
        });
    });

    describe('getSdkStatus', () => {
        it('should return SDK status successfully', async () => {
            const req = mockAuthenticatedRequest({}, { jobId: 'job-123' });
            const res = mockResponse();

            const mockJob = {
                id: 'job-123',
                userId: req.user!.id,
                language: SupportedLanguage.PYTHON,
                packageName: 'python-client',
                status: SdkGenerationStatus.COMPLETED,
                createdAt: new Date(),
                completedAt: new Date(),
                expiresAt: new Date(),
                errorMessage: null,
                filePath: '/path/to/sdk.zip'
            };

            mockSdkService.getGenerationStatus.mockResolvedValue(mockJob);

            await sdkController.getSdkStatus(req, res);

            expect(mockSdkService.getGenerationStatus).toHaveBeenCalledWith('job-123', req.user!.id);

            expect(res.json).toHaveBeenCalledWith({
                message: 'SDK job status retrieved successfully',
                data: {
                    id: mockJob.id,
                    language: mockJob.language,
                    packageName: mockJob.packageName,
                    status: mockJob.status,
                    createdAt: mockJob.createdAt,
                    completedAt: mockJob.completedAt,
                    expiresAt: mockJob.expiresAt,
                    errorMessage: mockJob.errorMessage,
                    downloadUrl: '/api/v1/sdks/job-123/download'
                }
            });
        });

        it('should return 404 for non-existent job', async () => {
            const req = mockAuthenticatedRequest({}, { jobId: 'non-existent' });
            const res = mockResponse();

            mockSdkService.getGenerationStatus.mockResolvedValue(null);

            await sdkController.getSdkStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'SDK generation job not found'
            });
        });
    });

    describe('getUserSdks', () => {
        it('should return user SDK jobs successfully', async () => {
            const req = mockAuthenticatedRequest();
            const res = mockResponse();

            const mockJobs = [
                {
                    id: 'job-1',
                    userId: req.user!.id,
                    language: SupportedLanguage.JAVASCRIPT,
                    packageName: 'js-client',
                    status: SdkGenerationStatus.COMPLETED,
                    createdAt: new Date(),
                    completedAt: new Date(),
                    expiresAt: new Date(),
                    errorMessage: null
                },
                {
                    id: 'job-2',
                    userId: req.user!.id,
                    language: SupportedLanguage.PYTHON,
                    packageName: 'python-client',
                    status: SdkGenerationStatus.GENERATING,
                    createdAt: new Date(),
                    completedAt: null,
                    expiresAt: new Date(),
                    errorMessage: null
                }
            ];

            mockSdkService.getUserSdkJobs.mockResolvedValue(mockJobs);

            await sdkController.getUserSdks(req, res);

            expect(mockSdkService.getUserSdkJobs).toHaveBeenCalledWith(req.user!.id);

            expect(res.json).toHaveBeenCalledWith({
                message: 'User SDKs retrieved successfully',
                data: [
                    {
                        id: 'job-1',
                        language: SupportedLanguage.JAVASCRIPT,
                        packageName: 'js-client',
                        status: SdkGenerationStatus.COMPLETED,
                        createdAt: mockJobs[0].createdAt,
                        completedAt: mockJobs[0].completedAt,
                        expiresAt: mockJobs[0].expiresAt,
                        errorMessage: null,
                        downloadUrl: '/api/v1/sdks/job-1/download'
                    },
                    {
                        id: 'job-2',
                        language: SupportedLanguage.PYTHON,
                        packageName: 'python-client',
                        status: SdkGenerationStatus.GENERATING,
                        createdAt: mockJobs[1].createdAt,
                        completedAt: mockJobs[1].completedAt,
                        expiresAt: mockJobs[1].expiresAt,
                        errorMessage: null,
                        downloadUrl: null
                    }
                ],
                total: 2
            });
        });
    });
});