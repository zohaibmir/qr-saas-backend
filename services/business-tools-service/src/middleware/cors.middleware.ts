/**
 * CORS Middleware
 * 
 * Cross-Origin Resource Sharing configuration for the Business Tools Service.
 * Handles preflight requests and sets appropriate CORS headers.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Request, Response, NextFunction } from 'express';

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:5173',
    'https://qr-generator.com',
    'https://app.qr-generator.com'
  ];

  const origin = req.headers.origin as string;

  // Check if origin is allowed
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  // Set CORS headers
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.header(
    'Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-API-Key'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}