/**
 * Logger Utility for Analytics Service
 * Simple logger instance for Authentication System 2.0
 */

import { Logger } from '../services/logger.service';

// Create and export a default logger instance
export const logger = new Logger('analytics-service');

// Export logger class for dependency injection
export { Logger };