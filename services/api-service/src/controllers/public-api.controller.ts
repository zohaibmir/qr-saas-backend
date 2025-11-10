import { Request, Response } from 'express';
import axios from 'axios';
import { ApiKeyService } from '../services/api-key.service';
import { WebhookJobService } from '../services/webhook-job.service';

export class PublicApiController {
    constructor(
        private apiKeyService: ApiKeyService,
        private webhookJobService: WebhookJobService
    ) {}

    // Public API for QR operations - requires API key authentication
    generateQR = async (req: Request, res: Response): Promise<void> => {
        const startTime = Date.now();
        
        try {
            // Extract API key from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ 
                    error: 'API key required',
                    message: 'Please provide a valid API key in the Authorization header'
                });
                return;
            }

            const apiKey = authHeader.substring(7); // Remove 'Bearer '
            
            // Validate API key
            const keyData = await this.apiKeyService.validateApiKey(apiKey);
            if (!keyData) {
                res.status(401).json({ 
                    error: 'Invalid API key',
                    message: 'The provided API key is invalid, expired, or revoked'
                });
                return;
            }

            // Check permissions
            if (!keyData.permissions.includes('qr:write') && !keyData.permissions.includes('qr:all')) {
                res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: 'API key does not have permission to generate QR codes'
                });
                return;
            }

            // Check rate limits
            const rateLimitResult = await this.apiKeyService.checkRateLimit(keyData, '/api/v1/qr/generate');
            if (!rateLimitResult.allowed) {
                res.status(429).json({ 
                    error: 'Rate limit exceeded',
                    message: 'API key has exceeded its rate limit',
                    resetTime: rateLimitResult.resetTime
                });
                return;
            }

            // Forward request to QR service
            const qrServiceResponse = await this.forwardToQRService('POST', '/generate', req.body, keyData.userId);
            
            // Log API usage
            const responseTime = Date.now() - startTime;
            await this.apiKeyService.logApiUsage(
                keyData.id,
                '/api/v1/qr/generate',
                'POST',
                qrServiceResponse.status,
                responseTime,
                req.ip || '127.0.0.1',
                req.headers['user-agent']
            );

            // Trigger webhooks if QR was created successfully
            if (qrServiceResponse.status === 201 && qrServiceResponse.data) {
                await this.webhookJobService.triggerWebhooksForEvent(
                    keyData.userId,
                    'qr.created',
                    {
                        qr: qrServiceResponse.data,
                        apiKey: keyData.prefix,
                        timestamp: new Date().toISOString()
                    }
                );
            }

            res.status(qrServiceResponse.status).json(qrServiceResponse.data);
        } catch (error) {
            const responseTime = Date.now() - startTime;
            console.error('Error in public API generateQR:', error);
            
            // Log error if we have key data
            if (req.body._keyData) {
                await this.apiKeyService.logApiUsage(
                    req.body._keyData.id,
                    '/api/v1/qr/generate',
                    'POST',
                    500,
                    responseTime,
                    req.ip || '127.0.0.1',
                    req.headers['user-agent']
                );
            }
            
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    getQR = async (req: Request, res: Response): Promise<void> => {
        const startTime = Date.now();
        
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ 
                    error: 'API key required',
                    message: 'Please provide a valid API key in the Authorization header'
                });
                return;
            }

            const apiKey = authHeader.substring(7);
            const keyData = await this.apiKeyService.validateApiKey(apiKey);
            if (!keyData) {
                res.status(401).json({ 
                    error: 'Invalid API key',
                    message: 'The provided API key is invalid, expired, or revoked'
                });
                return;
            }

            // Check permissions
            if (!keyData.permissions.includes('qr:read') && !keyData.permissions.includes('qr:all')) {
                res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: 'API key does not have permission to read QR codes'
                });
                return;
            }

            // Forward request to QR service
            const qrServiceResponse = await this.forwardToQRService('GET', `/qr/${req.params.qrId}`, null, keyData.userId);
            
            // Log API usage
            const responseTime = Date.now() - startTime;
            await this.apiKeyService.logApiUsage(
                keyData.id,
                `/api/v1/qr/${req.params.qrId}`,
                'GET',
                qrServiceResponse.status,
                responseTime,
                req.ip || '127.0.0.1',
                req.headers['user-agent']
            );

            res.status(qrServiceResponse.status).json(qrServiceResponse.data);
        } catch (error) {
            console.error('Error in public API getQR:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    updateQR = async (req: Request, res: Response): Promise<void> => {
        const startTime = Date.now();
        
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ 
                    error: 'API key required',
                    message: 'Please provide a valid API key in the Authorization header'
                });
                return;
            }

            const apiKey = authHeader.substring(7);
            const keyData = await this.apiKeyService.validateApiKey(apiKey);
            if (!keyData) {
                res.status(401).json({ 
                    error: 'Invalid API key',
                    message: 'The provided API key is invalid, expired, or revoked'
                });
                return;
            }

            // Check permissions
            if (!keyData.permissions.includes('qr:write') && !keyData.permissions.includes('qr:all')) {
                res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: 'API key does not have permission to update QR codes'
                });
                return;
            }

            // Forward request to QR service
            const qrServiceResponse = await this.forwardToQRService('PUT', `/qr/${req.params.qrId}`, req.body, keyData.userId);
            
            // Log API usage
            const responseTime = Date.now() - startTime;
            await this.apiKeyService.logApiUsage(
                keyData.id,
                `/api/v1/qr/${req.params.qrId}`,
                'PUT',
                qrServiceResponse.status,
                responseTime,
                req.ip || '127.0.0.1',
                req.headers['user-agent']
            );

            // Trigger webhooks if QR was updated successfully
            if (qrServiceResponse.status === 200 && qrServiceResponse.data) {
                await this.webhookJobService.triggerWebhooksForEvent(
                    keyData.userId,
                    'qr.updated',
                    {
                        qr: qrServiceResponse.data,
                        apiKey: keyData.prefix,
                        timestamp: new Date().toISOString()
                    }
                );
            }

            res.status(qrServiceResponse.status).json(qrServiceResponse.data);
        } catch (error) {
            console.error('Error in public API updateQR:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    deleteQR = async (req: Request, res: Response): Promise<void> => {
        const startTime = Date.now();
        
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ 
                    error: 'API key required',
                    message: 'Please provide a valid API key in the Authorization header'
                });
                return;
            }

            const apiKey = authHeader.substring(7);
            const keyData = await this.apiKeyService.validateApiKey(apiKey);
            if (!keyData) {
                res.status(401).json({ 
                    error: 'Invalid API key',
                    message: 'The provided API key is invalid, expired, or revoked'
                });
                return;
            }

            // Check permissions
            if (!keyData.permissions.includes('qr:delete') && !keyData.permissions.includes('qr:all')) {
                res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: 'API key does not have permission to delete QR codes'
                });
                return;
            }

            // Forward request to QR service
            const qrServiceResponse = await this.forwardToQRService('DELETE', `/qr/${req.params.qrId}`, null, keyData.userId);
            
            // Log API usage
            const responseTime = Date.now() - startTime;
            await this.apiKeyService.logApiUsage(
                keyData.id,
                `/api/v1/qr/${req.params.qrId}`,
                'DELETE',
                qrServiceResponse.status,
                responseTime,
                req.ip || '127.0.0.1',
                req.headers['user-agent']
            );

            // Trigger webhooks if QR was deleted successfully
            if (qrServiceResponse.status === 200) {
                await this.webhookJobService.triggerWebhooksForEvent(
                    keyData.userId,
                    'qr.deleted',
                    {
                        qrId: req.params.qrId,
                        apiKey: keyData.prefix,
                        timestamp: new Date().toISOString()
                    }
                );
            }

            res.status(qrServiceResponse.status).json(qrServiceResponse.data);
        } catch (error) {
            console.error('Error in public API deleteQR:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    listQRs = async (req: Request, res: Response): Promise<void> => {
        const startTime = Date.now();
        
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ 
                    error: 'API key required',
                    message: 'Please provide a valid API key in the Authorization header'
                });
                return;
            }

            const apiKey = authHeader.substring(7);
            const keyData = await this.apiKeyService.validateApiKey(apiKey);
            if (!keyData) {
                res.status(401).json({ 
                    error: 'Invalid API key',
                    message: 'The provided API key is invalid, expired, or revoked'
                });
                return;
            }

            // Check permissions
            if (!keyData.permissions.includes('qr:read') && !keyData.permissions.includes('qr:all')) {
                res.status(403).json({ 
                    error: 'Insufficient permissions',
                    message: 'API key does not have permission to list QR codes'
                });
                return;
            }

            // Forward request to QR service with query parameters
            const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
            const endpoint = queryString ? `/qr?${queryString}` : '/qr';
            const qrServiceResponse = await this.forwardToQRService('GET', endpoint, null, keyData.userId);
            
            // Log API usage
            const responseTime = Date.now() - startTime;
            await this.apiKeyService.logApiUsage(
                keyData.id,
                '/api/v1/qr',
                'GET',
                qrServiceResponse.status,
                responseTime,
                req.ip || '127.0.0.1',
                req.headers['user-agent']
            );

            res.status(qrServiceResponse.status).json(qrServiceResponse.data);
        } catch (error) {
            console.error('Error in public API listQRs:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    private async forwardToQRService(method: string, endpoint: string, data: any, userId: string): Promise<any> {
        const qrServiceUrl = process.env.QR_SERVICE_URL || 'http://localhost:3002';
        const url = `${qrServiceUrl}${endpoint}`;

        const config = {
            method,
            url,
            data,
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': userId, // Pass user ID to QR service
                'X-Internal-Request': 'true' // Mark as internal request
            },
            timeout: 30000
        };

        try {
            const response = await axios(config);
            return {
                status: response.status,
                data: response.data
            };
        } catch (error: any) {
            if (error.response) {
                return {
                    status: error.response.status,
                    data: error.response.data
                };
            }
            throw error;
        }
    }
}