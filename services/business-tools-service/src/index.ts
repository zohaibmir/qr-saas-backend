/**
 * Business Tools Service Entry Point
 * 
 * Main entry point for the Business Tools Service.
 * Handles application startup, graceful shutdown, and error handling.
 * 
 * @author AI Agent
 * @date 2024
 */

import { BusinessToolsApp } from './app';
import { logger } from './utils/logger';

/**
 * Start the Business Tools Service
 */
async function start(): Promise<void> {
  const app = new BusinessToolsApp();

  try {
    // Initialize the application
    await app.initialize();

    // Start the server
    await app.start();

    logger.info('Business Tools Service startup completed successfully');
  } catch (error) {
    logger.error('Failed to start Business Tools Service', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
async function gracefulShutdown(signal: string, app: BusinessToolsApp): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    await app.shutdown();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Initialize app for shutdown handlers
let appInstance: BusinessToolsApp;

// Start the service
start().then(() => {
  appInstance = new BusinessToolsApp();
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', appInstance));
process.on('SIGINT', () => gracefulShutdown('SIGINT', appInstance));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT', appInstance));