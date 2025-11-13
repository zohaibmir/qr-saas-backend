#!/usr/bin/env node

/**
 * Data Retention Service
 * Handles automated data cleanup, archival, and GDPR compliance
 */

import app from './app';
import { logger } from './utils/logger';
import { healthChecker } from './services/health-checker.service';
import { dataRetentionScheduler } from './services/data-retention-scheduler.service';
import { config } from './config/database.config';

const PORT = process.env.PORT || 3016;

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  await dataRetentionScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown...');
  await dataRetentionScheduler.stop();
  process.exit(0);
});

async function startServer() {
  try {
    // Test database connection
    await config.testConnection();
    logger.info('Database connection established successfully');

    // Initialize health checker
    await healthChecker.initialize();
    logger.info('Health checker initialized');

    // Start data retention scheduler
    await dataRetentionScheduler.start();
    logger.info('Data retention scheduler started');

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Data Retention Service started on port ${PORT}`);
      logger.info(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();