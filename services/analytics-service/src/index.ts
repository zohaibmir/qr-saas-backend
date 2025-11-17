import { createAnalyticsServiceApp } from './app';

// Initialize and start the application
const analyticsServiceApp = createAnalyticsServiceApp();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  await analyticsServiceApp.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await analyticsServiceApp.shutdown();
  process.exit(0);
});

// Start the service
analyticsServiceApp.start().catch(error => {
  console.error('Failed to start Analytics Service:', error);
  process.exit(1);
});