import {
  ISubscriptionService,
  ISubscriptionRepository,
  IUserRepository,
  SubscriptionPlan,
  UserSubscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionUsage,
  ServiceResponse,
  ValidationError,
  NotFoundError,
  ConflictError,
  AppError,
  ILogger
} from '../interfaces';

/**
 * Subscription Service - Clean Architecture Implementation
 * 
 * Handles subscription management business logic including:
 * - Plan upgrades and downgrades
 * - Subscription lifecycle management
 * - Usage tracking and validation
 * - Billing integration points
 * 
 * Follows SOLID principles with clean separation of concerns
 */
export class SubscriptionService implements ISubscriptionService {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private userRepository: IUserRepository,
    private logger: ILogger
  ) {}

  // ===============================================
  // SUBSCRIPTION MANAGEMENT
  // ===============================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<ServiceResponse<UserSubscription>> {
    try {
      this.logger.info('Creating subscription', {
        userId: request.userId,
        planId: request.planId
      });

      // Validate user exists
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Validate plan exists
      const plan = await this.subscriptionRepository.getPlanById(request.planId);
      if (!plan) {
        throw new NotFoundError('Subscription plan');
      }

      if (!plan.isActive) {
        throw new ValidationError('Subscription plan is not active');
      }

      // Check if user already has an active subscription
      const existingSubscription = await this.subscriptionRepository.findByUserId(request.userId);
      if (existingSubscription && existingSubscription.status === 'active') {
        throw new ConflictError('User already has an active subscription');
      }

      // Create subscription
      const subscription = await this.subscriptionRepository.create(request);

      // Update user subscription tier in users table
      await this.userRepository.update(request.userId, {
        subscription: this.mapPlanNameToTier(plan.name)
      });

      this.logger.info('Subscription created successfully', {
        subscriptionId: subscription.id,
        userId: request.userId,
        planId: request.planId
      });

      return {
        success: true,
        data: subscription
      };
    } catch (error) {
      this.logger.error('Failed to create subscription', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_CREATION_FAILED',
          message: 'Failed to create subscription',
          statusCode: 500
        }
      };
    }
  }

  async getSubscriptionByUserId(userId: string): Promise<ServiceResponse<UserSubscription>> {
    try {
      if (!userId || userId.trim() === '') {
        throw new ValidationError('User ID is required');
      }

      this.logger.debug('Getting subscription by user ID', { userId });

      const subscription = await this.subscriptionRepository.findByUserId(userId);
      
      if (!subscription) {
        throw new NotFoundError('Subscription');
      }

      return {
        success: true,
        data: subscription
      };
    } catch (error) {
      this.logger.error('Failed to get subscription by user ID', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_FETCH_FAILED',
          message: 'Failed to get subscription',
          statusCode: 500
        }
      };
    }
  }

  async updateSubscription(subscriptionId: string, updates: UpdateSubscriptionRequest): Promise<ServiceResponse<UserSubscription>> {
    try {
      if (!subscriptionId || subscriptionId.trim() === '') {
        throw new ValidationError('Subscription ID is required');
      }

      this.logger.info('Updating subscription', { subscriptionId, updates });

      // Validate subscription exists
      const existingSubscription = await this.subscriptionRepository.findById(subscriptionId);
      if (!existingSubscription) {
        throw new NotFoundError('Subscription');
      }

      // Validate plan if changing
      if (updates.planId && updates.planId !== existingSubscription.planId) {
        const plan = await this.subscriptionRepository.getPlanById(updates.planId);
        if (!plan) {
          throw new NotFoundError('Subscription plan');
        }
        if (!plan.isActive) {
          throw new ValidationError('Subscription plan is not active');
        }
      }

      // Update subscription
      const updatedSubscription = await this.subscriptionRepository.update(subscriptionId, updates);

      // Update user tier if plan changed
      if (updates.planId && updates.planId !== existingSubscription.planId) {
        const plan = await this.subscriptionRepository.getPlanById(updates.planId);
        if (plan) {
          await this.userRepository.update(existingSubscription.userId, {
            subscription: this.mapPlanNameToTier(plan.name)
          });
        }
      }

      this.logger.info('Subscription updated successfully', { subscriptionId });

      return {
        success: true,
        data: updatedSubscription
      };
    } catch (error) {
      this.logger.error('Failed to update subscription', {
        subscriptionId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_UPDATE_FAILED',
          message: 'Failed to update subscription',
          statusCode: 500
        }
      };
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<ServiceResponse<UserSubscription>> {
    try {
      if (!subscriptionId || subscriptionId.trim() === '') {
        throw new ValidationError('Subscription ID is required');
      }

      this.logger.info('Canceling subscription', { subscriptionId, cancelAtPeriodEnd });

      // Validate subscription exists
      const subscription = await this.subscriptionRepository.findById(subscriptionId);
      if (!subscription) {
        throw new NotFoundError('Subscription');
      }

      if (subscription.status === 'cancelled') {
        throw new ValidationError('Subscription is already cancelled');
      }

      // Cancel subscription
      const updatedSubscription = await this.subscriptionRepository.update(subscriptionId, {
        status: cancelAtPeriodEnd ? 'active' : 'cancelled'
      });

      // Update user to free tier if cancelling immediately
      if (!cancelAtPeriodEnd) {
        await this.userRepository.update(subscription.userId, {
          subscription: 'free'
        });
      }

      this.logger.info('Subscription cancelled successfully', { subscriptionId, cancelAtPeriodEnd });

      return {
        success: true,
        data: updatedSubscription
      };
    } catch (error) {
      this.logger.error('Failed to cancel subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_CANCELLATION_FAILED',
          message: 'Failed to cancel subscription',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // PLAN MANAGEMENT
  // ===============================================

  async getSubscriptionPlans(): Promise<ServiceResponse<SubscriptionPlan[]>> {
    try {
      this.logger.debug('Getting all subscription plans');

      const plans = await this.subscriptionRepository.getPlans();

      return {
        success: true,
        data: plans
      };
    } catch (error) {
      this.logger.error('Failed to get subscription plans', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'PLANS_FETCH_FAILED',
          message: 'Failed to get subscription plans',
          statusCode: 500
        }
      };
    }
  }

  async getSubscriptionPlan(planId: string): Promise<ServiceResponse<SubscriptionPlan>> {
    try {
      if (!planId || planId.trim() === '') {
        throw new ValidationError('Plan ID is required');
      }

      this.logger.debug('Getting plan by ID', { planId });

      const plan = await this.subscriptionRepository.getPlanById(planId);
      
      if (!plan) {
        throw new NotFoundError('Subscription plan');
      }

      return {
        success: true,
        data: plan
      };
    } catch (error) {
      this.logger.error('Failed to get plan by ID', {
        planId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PLAN_FETCH_FAILED',
          message: 'Failed to get subscription plan',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // UPGRADE/DOWNGRADE LOGIC
  // ===============================================

  async validatePlanUpgrade(currentPlanId: string, newPlanId: string): Promise<ServiceResponse<boolean>> {
    try {
      if (!currentPlanId || currentPlanId.trim() === '') {
        throw new ValidationError('Current plan ID is required');
      }
      if (!newPlanId || newPlanId.trim() === '') {
        throw new ValidationError('New plan ID is required');
      }

      this.logger.debug('Validating plan upgrade', { currentPlanId, newPlanId });

      // Get both plans
      const currentPlan = await this.subscriptionRepository.getPlanById(currentPlanId);
      const newPlan = await this.subscriptionRepository.getPlanById(newPlanId);

      if (!currentPlan || !newPlan) {
        throw new NotFoundError('Subscription plan');
      }

      if (!newPlan.isActive) {
        throw new ValidationError('New subscription plan is not active');
      }

      // Validate upgrade (new plan should be higher tier or different features)
      const isUpgrade = newPlan.price > currentPlan.price;

      return {
        success: true,
        data: isUpgrade
      };
    } catch (error) {
      this.logger.error('Failed to validate plan upgrade', {
        currentPlanId,
        newPlanId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PLAN_VALIDATION_FAILED',
          message: 'Failed to validate plan upgrade',
          statusCode: 500
        }
      };
    }
  }

  async calculateProration(userId: string, newPlanId: string): Promise<ServiceResponse<{ amount: number; currency: string }>> {
    try {
      if (!userId || userId.trim() === '') {
        throw new ValidationError('User ID is required');
      }
      if (!newPlanId || newPlanId.trim() === '') {
        throw new ValidationError('New plan ID is required');
      }

      this.logger.debug('Calculating proration', { userId, newPlanId });

      // Get user's current subscription
      const subscription = await this.subscriptionRepository.findByUserId(userId);
      if (!subscription) {
        throw new NotFoundError('User subscription');
      }

      // Get current and new plans
      const currentPlan = await this.subscriptionRepository.getPlanById(subscription.planId);
      const newPlan = await this.subscriptionRepository.getPlanById(newPlanId);

      if (!currentPlan || !newPlan) {
        throw new NotFoundError('Subscription plan');
      }

      // Calculate days remaining in current billing cycle
      const now = new Date();
      const currentEnd = new Date(subscription.currentPeriodEnd);
      const daysInCycle = 30; // Assuming monthly billing
      const daysRemaining = Math.max(0, Math.ceil((currentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate proration
      const dailyCurrentRate = currentPlan.price / daysInCycle;
      const dailyNewRate = newPlan.price / daysInCycle;
      const prorationAmount = (dailyNewRate - dailyCurrentRate) * daysRemaining;

      return {
        success: true,
        data: {
          amount: Math.max(0, prorationAmount),
          currency: 'USD'
        }
      };
    } catch (error) {
      this.logger.error('Failed to calculate proration', {
        userId,
        newPlanId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PRORATION_CALCULATION_FAILED',
          message: 'Failed to calculate proration',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // USAGE TRACKING
  // ===============================================

  async getSubscriptionUsage(userId: string): Promise<ServiceResponse<SubscriptionUsage>> {
    try {
      if (!userId || userId.trim() === '') {
        throw new ValidationError('User ID is required');
      }

      this.logger.debug('Getting subscription usage', { userId });

      // Get user's subscription
      const subscription = await this.subscriptionRepository.findByUserId(userId);
      if (!subscription) {
        throw new NotFoundError('User subscription');
      }

      // Get plan to determine limits
      const plan = await this.subscriptionRepository.getPlanById(subscription.planId);
      if (!plan) {
        throw new NotFoundError('Subscription plan');
      }

      // Return usage based on plan limits and features
      const usage: SubscriptionUsage = {
        qrCodesUsed: 0, // This would come from analytics service in real implementation
        qrCodesLimit: plan.qrLimit,
        analyticsRetentionDays: plan.analyticsRetentionDays,
        features: plan.features
      };

      return {
        success: true,
        data: usage
      };
    } catch (error) {
      this.logger.error('Failed to get subscription usage', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'USAGE_FETCH_FAILED',
          message: 'Failed to get subscription usage',
          statusCode: 500
        }
      };
    }
  }

  // ===============================================
  // HELPER METHODS
  // ===============================================

  private mapPlanNameToTier(planName: string): string {
    const tierMapping: Record<string, string> = {
      'Free': 'free',
      'Basic': 'basic',
      'Premium': 'premium',
      'Enterprise': 'enterprise'
    };

    return tierMapping[planName] || 'free';
  }

  private validateSubscriptionRequest(request: CreateSubscriptionRequest): void {
    if (!request.userId || request.userId.trim() === '') {
      throw new ValidationError('User ID is required');
    }
    if (!request.planId || request.planId.trim() === '') {
      throw new ValidationError('Plan ID is required');
    }
  }

  private validateUpdateRequest(request: UpdateSubscriptionRequest): void {
    if (request.planId && request.planId.trim() === '') {
      throw new ValidationError('Plan ID cannot be empty');
    }
    if (request.status && !['active', 'cancelled', 'expired', 'past_due'].includes(request.status)) {
      throw new ValidationError('Invalid subscription status');
    }
  }
}