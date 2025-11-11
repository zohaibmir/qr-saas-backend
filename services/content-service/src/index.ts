import dotenv from 'dotenv';
import app from './app';
import { createLogger } from './utils/logger';
import config from './config';

// Load environment variables
dotenv.config();

const logger = createLogger(config.serviceName);
const PORT = config.port;
const SERVICE_NAME = 'Content Service';

const server = app.listen(PORT, () => {
  console.log(`🚀 ${config.serviceName} is running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`📝 API documentation available at http://localhost:${PORT}/api/content/posts`);
  console.log(`🌍 Environment: ${config.env}`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  server.close((error) => {
    if (error) {
      console.error('Error during server shutdown:', error);
      process.exit(1);
    }
    
    console.log(`✅ ${config.serviceName} shut down successfully`);
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));