import { application } from './app';
import { ExpressApp } from './express-app';
import { serviceConfig } from './config';
import { TOKENS } from './services';
import { ILogger } from './interfaces';

async function startServer() {
  try {
    // Bootstrap the application
    const container = await application.bootstrap();
    const logger = container.resolve<ILogger>(TOKENS.LOGGER);
    
    // Create and start Express app
    const expressApp = new ExpressApp(container);
    await expressApp.start(serviceConfig.port);

    // Log service information
    logger.info('Service configuration', {
      maxOrganizationsPerUser: serviceConfig.business.maxOrganizationsPerUser,
      maxMembersPerOrganization: serviceConfig.business.maxMembersPerOrganization,
      invitationExpiryDays: serviceConfig.business.invitationExpiryDays
    });

    // Handle graceful shutdown
    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });

    async function handleShutdown(signal: string) {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      try {
        await application.shutdown();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error: any) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    }

  } catch (error: any) {
    console.error('Failed to start Team Service:', error.message);
    process.exit(1);
  }
}

// Start the service
startServer().catch((error) => {
  console.error('Fatal error starting Team Service:', error);
  process.exit(1);
});