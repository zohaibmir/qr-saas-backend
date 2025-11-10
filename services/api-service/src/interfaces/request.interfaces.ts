import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export interface ApiResponse<T = any> {
    message: string;
    data?: T;
    error?: string;
    details?: any;
}