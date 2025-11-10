import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../interfaces';

export class AuthMiddleware {
    public static authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                res.status(401).json({ error: 'Authorization header missing' });
                return;
            }

            const token = authHeader.split(' ')[1]; // Bearer <token>
            
            if (!token) {
                res.status(401).json({ error: 'Token missing' });
                return;
            }

            const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
            const decoded = jwt.verify(token, jwtSecret) as any;

            req.user = {
                id: decoded.id || decoded.userId,
                email: decoded.email,
                role: decoded.role || 'user'
            };

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(401).json({ error: 'Invalid token' });
        }
    };

    public static requirePermissions = (permissions: string[]) => {
        return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
            if (!req.user) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            // For now, just check if user exists
            // In a real implementation, you'd check user permissions from database
            next();
        };
    };
}