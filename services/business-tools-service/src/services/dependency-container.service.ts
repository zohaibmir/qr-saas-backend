/**
 * Dependency Container Service
 * 
 * Centralized dependency injection container for the Business Tools Service.
 * Manages service instances and their dependencies with proper initialization.
 * 
 * @author AI Agent
 * @date 2024
 */

import { Pool } from 'pg';
import { config } from '../config/environment.config';
import { logger } from '../utils/logger';

// Repository imports
import { CustomDomainsRepository } from '../repositories/custom-domains.repository';
import { WhiteLabelRepository } from '../repositories/white-label.repository';
import { GDPRRepository } from '../repositories/gdpr.repository';

// Service imports
import { CustomDomainsService } from './custom-domains.service';
import { WhiteLabelService } from './white-label.service';
import { GDPRService } from './gdpr.service';

// Interface imports
import {
  ICustomDomainsRepository,
  IWhiteLabelRepository,
  IGDPRRepository,
  ICustomDomainsService,
  IWhiteLabelService,
  IGDPRService,
  ILogger
} from '../interfaces';

export interface ServiceContainer {
  customDomainsService: ICustomDomainsService;
  whiteLabelService: IWhiteLabelService;
  gdprService: IGDPRService;
  logger: ILogger;
}

export class DependencyContainer {
  private dbPool: Pool | null = null;
  private repositories: {
    customDomainsRepository: ICustomDomainsRepository;
    whiteLabelRepository: IWhiteLabelRepository;
    gdprRepository: IGDPRRepository;
  } | null = null;
  private services: ServiceContainer | null = null;

  /**
   * Initialize the dependency container
   */
  async initialize(): Promise<void> {
    try {
      // Initialize database connection
      await this.initializeDatabase();

      // Initialize repositories
      this.initializeRepositories();

      // Initialize services
      this.initializeServices();

      logger.info('Dependency container initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize dependency container', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Initialize database connection pool
   */
  private async initializeDatabase(): Promise<void> {
    const dbConfig = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.dbPool = new Pool(dbConfig);

    // Test connection
    try {
      const client = await this.dbPool.connect();
      client.release();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Initialize repository instances
   */
  private initializeRepositories(): void {
    if (!this.dbPool) {
      throw new Error('Database pool not initialized');
    }

    this.repositories = {
      customDomainsRepository: new CustomDomainsRepository(this.dbPool, logger),
      whiteLabelRepository: new WhiteLabelRepository(this.dbPool, logger),
      gdprRepository: new GDPRRepository(this.dbPool, logger)
    };

    logger.debug('Repositories initialized');
  }

  /**
   * Initialize service instances
   */
  private initializeServices(): void {
    if (!this.repositories) {
      throw new Error('Repositories not initialized');
    }

    this.services = {
      customDomainsService: new CustomDomainsService(
        this.repositories.customDomainsRepository,
        this.repositories.customDomainsRepository as any, // Domain verification repo embedded in custom domains
        this.repositories.customDomainsRepository as any, // SSL certificate repo embedded in custom domains
        logger
      ),
      whiteLabelService: new WhiteLabelService(
        this.repositories.whiteLabelRepository,
        logger
      ),
      gdprService: new GDPRService(
        this.repositories.gdprRepository,
        logger
      ),
      logger
    };

    logger.debug('Services initialized');
  }

  /**
   * Get service container
   */
  getServices(): ServiceContainer {
    if (!this.services) {
      throw new Error('Services not initialized. Call initialize() first.');
    }
    return this.services;
  }

  /**
   * Get database pool
   */
  getDatabase(): Pool {
    if (!this.dbPool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dbPool;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.dbPool) {
        await this.dbPool.end();
        logger.info('Database connection pool closed');
      }
    } catch (error) {
      logger.error('Error during dependency container shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}