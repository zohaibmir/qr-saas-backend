import { Pool } from 'pg';
import { serviceConfig, validateConfig } from './config';
import { getDatabaseConnection } from './config/database.config';
import { Logger } from './utils/logger';
import {
  OrganizationRepository,
  MemberRepository,
  InvitationRepository
} from './repositories';
import {
  TeamService,
  SlugGenerator,
  PermissionChecker,
  InvitationService,
  DependencyContainer,
  HealthChecker,
  TOKENS
} from './services';
import { DatabaseConnection } from './config/database.config';

export class Application {
  private container: DependencyContainer;
  private logger: Logger;
  private databaseConnection: DatabaseConnection;

  constructor() {
    // Validate configuration
    validateConfig();
    
    // Initialize logger
    this.logger = new Logger(serviceConfig.serviceName, serviceConfig.nodeEnv);
    
    // Initialize dependency container
    this.container = new DependencyContainer(this.logger);
    
    // Initialize database connection
    this.databaseConnection = getDatabaseConnection(this.logger);
  }

  async bootstrap(): Promise<DependencyContainer> {
    try {
      this.logger.info('Starting Team Service bootstrap process');

      // Test database connection
      const isDbConnected = await this.databaseConnection.testConnection();
      if (!isDbConnected) {
        throw new Error('Failed to connect to database');
      }

      // Register infrastructure dependencies
      this.registerInfrastructure();

      // Register repositories
      this.registerRepositories();

      // Register services
      this.registerServices();

      this.logger.info('Team Service bootstrap completed successfully', {
        registeredDependencies: this.container.getRegisteredTokens()
      });

      return this.container;

    } catch (error: any) {
      this.logger.error('Team Service bootstrap failed', { error: error.message });
      throw error;
    }
  }

  private registerInfrastructure(): void {
    this.container.register(TOKENS.LOGGER, this.logger);
    this.container.register(TOKENS.DATABASE_CONNECTION, this.databaseConnection);
    
    const healthChecker = new HealthChecker(this.logger, this.databaseConnection);
    this.container.register(TOKENS.HEALTH_CHECKER, healthChecker);
  }

  private registerRepositories(): void {
    const pool = this.databaseConnection.getPool();
    
    const organizationRepo = new OrganizationRepository(pool, this.logger);
    const memberRepo = new MemberRepository(pool, this.logger);
    const invitationRepo = new InvitationRepository(pool, this.logger);

    this.container.register(TOKENS.ORGANIZATION_REPOSITORY, organizationRepo);
    this.container.register(TOKENS.MEMBER_REPOSITORY, memberRepo);
    this.container.register(TOKENS.INVITATION_REPOSITORY, invitationRepo);
  }

  private registerServices(): void {
    // Utility services
    const slugGenerator = new SlugGenerator(this.logger);
    const permissionChecker = new PermissionChecker();
    const invitationService = new InvitationService(this.logger);

    this.container.register(TOKENS.SLUG_GENERATOR, slugGenerator);
    this.container.register(TOKENS.PERMISSION_CHECKER, permissionChecker);
    this.container.register(TOKENS.INVITATION_SERVICE, invitationService);

    // Main business service
    const teamService = new TeamService(
      this.container.resolve(TOKENS.ORGANIZATION_REPOSITORY),
      this.container.resolve(TOKENS.MEMBER_REPOSITORY),
      this.container.resolve(TOKENS.INVITATION_REPOSITORY),
      this.logger,
      slugGenerator,
      invitationService,
      permissionChecker
    );

    this.container.register(TOKENS.TEAM_SERVICE, teamService);

    // Register controllers
    this.registerControllers();
  }

  private registerControllers(): void {
    // Import controllers
    const { OrganizationController } = require('./controllers/organization.controller');
    const { MemberController } = require('./controllers/member.controller');
    const { InvitationController } = require('./controllers/invitation.controller');
    const { HealthController } = require('./controllers/health.controller');

    // Create controller instances
    const organizationController = new OrganizationController(
      this.container.resolve(TOKENS.TEAM_SERVICE),
      this.logger
    );

    const memberController = new MemberController(
      this.container.resolve(TOKENS.TEAM_SERVICE),
      this.logger
    );

    const invitationController = new InvitationController(
      this.container.resolve(TOKENS.TEAM_SERVICE),
      this.logger
    );

    const healthController = new HealthController(
      this.container.resolve(TOKENS.HEALTH_CHECKER),
      this.logger
    );

    // Register controllers in container
    this.container.register(TOKENS.ORGANIZATION_CONTROLLER, organizationController);
    this.container.register(TOKENS.MEMBER_CONTROLLER, memberController);
    this.container.register(TOKENS.INVITATION_CONTROLLER, invitationController);
    this.container.register(TOKENS.HEALTH_CONTROLLER, healthController);
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Team Service');

      // Close database connections
      await this.databaseConnection.close();

      // Clear dependency container
      this.container.clear();

      this.logger.info('Team Service shutdown completed');
    } catch (error: any) {
      this.logger.error('Error during Team Service shutdown', { error: error.message });
      throw error;
    }
  }

  getContainer(): DependencyContainer {
    return this.container;
  }
}

// Export singleton instance
export const application = new Application();