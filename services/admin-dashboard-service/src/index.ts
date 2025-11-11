import app from './app';
import { config } from './config/environment.config';
import { logger } from './utils/logger';
import { DatabaseService } from './services/database.service';
import { AdminService } from './services/admin.service';

const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    await DatabaseService.connect();
    logger.info('✅ Database connected successfully');

    // Initialize admin service
    logger.info('Initializing admin service...');
    await AdminService.initialize();
    logger.info('✅ Admin service initialized');

    // Start the server
    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🚀 Admin Dashboard Service started successfully`);
      logger.info(`📍 Server running on port ${config.port}`);
      logger.info(`🌐 Environment: ${config.environment}`);
      logger.info(`📊 Service: ${config.serviceName}`);
      
      if (config.environment === 'development') {
        logger.info(`📖 API Documentation: http://localhost:${config.port}/api-docs`);
        logger.info(`🎨 UI Development: http://localhost:3014`);
        logger.info(`🔍 Health Check: http://localhost:${config.port}/health`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`🔄 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          logger.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }

        try {
          // Close database connections
          await DatabaseService.disconnect();
          logger.info('✅ Database disconnected successfully');
          
          logger.info('✅ Admin Dashboard Service shut down gracefully');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('⏰ Forced shutdown after 30 seconds timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('💥 Failed to start Admin Dashboard Service:', error);
    process.exit(1);
  }
};

// Start the server
startServer();