import { Pool, PoolClient } from 'pg';
import {
  ISubscriptionRepository,
  SubscriptionPlan,
  UserSubscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  ILogger,
  DatabaseError
} from '../interfaces';

export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  // ===============================================
  // SUBSCRIPTION PLANS
  // ===============================================

  async getPlans(): Promise<SubscriptionPlan[]> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT 
          id, name, price, currency, qr_limit, analytics_retention_days, 
          features, is_active, created_at
        FROM subscription_plans 
        WHERE is_active = true
        ORDER BY price ASC
      `;
      
      const result = await client.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        currency: row.currency,
        qrLimit: row.qr_limit,
        analyticsRetentionDays: row.analytics_retention_days,
        features: row.features,
        isActive: row.is_active,
        createdAt: row.created_at
      }));
    } catch (error) {
      this.logger.error('Failed to get subscription plans', { error });
      throw new DatabaseError('Failed to get subscription plans');
    } finally {
      client.release();
    }
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT 
          id, name, price, currency, qr_limit, analytics_retention_days, 
          features, is_active, created_at
        FROM subscription_plans 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [planId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        currency: row.currency,
        qrLimit: row.qr_limit,
        analyticsRetentionDays: row.analytics_retention_days,
        features: row.features,
        isActive: row.is_active,
        createdAt: row.created_at
      };
    } catch (error) {
      this.logger.error('Failed to get subscription plan by ID', { planId, error });
      throw new DatabaseError('Failed to get subscription plan');
    } finally {
      client.release();
    }
  }

  async getPlanByName(name: string): Promise<SubscriptionPlan | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT 
          id, name, price, currency, qr_limit, analytics_retention_days, 
          features, is_active, created_at
        FROM subscription_plans 
        WHERE LOWER(name) = LOWER($1) AND is_active = true
      `;
      
      const result = await client.query(query, [name]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        currency: row.currency,
        qrLimit: row.qr_limit,
        analyticsRetentionDays: row.analytics_retention_days,
        features: row.features,
        isActive: row.is_active,
        createdAt: row.created_at
      };
    } catch (error) {
      this.logger.error('Failed to get subscription plan by name', { name, error });
      throw new DatabaseError('Failed to get subscription plan');
    } finally {
      client.release();
    }
  }

  // ===============================================
  // USER SUBSCRIPTIONS
  // ===============================================

  async create(subscription: CreateSubscriptionRequest): Promise<UserSubscription> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO user_subscriptions 
        (user_id, plan_id, status, current_period_start, current_period_end)
        VALUES ($1, $2, 'active', $3, $4)
        RETURNING id, user_id, plan_id, status, current_period_start, 
                  current_period_end, cancel_at_period_end, created_at, updated_at
      `;
      
      const values = [
        subscription.userId,
        subscription.planId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd
      ];
      
      const result = await client.query(query, values);
      const row = result.rows[0];
      
      this.logger.info('Subscription created successfully', {
        subscriptionId: row.id,
        userId: subscription.userId,
        planId: subscription.planId
      });
      
      return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      this.logger.error('Failed to create subscription', { subscription, error });
      throw new DatabaseError('Failed to create subscription');
    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string): Promise<UserSubscription | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT 
          us.id, us.user_id, us.plan_id, us.status, us.current_period_start, 
          us.current_period_end, us.cancel_at_period_end, us.created_at, us.updated_at,
          sp.name as plan_name, sp.price as plan_price, sp.currency as plan_currency,
          sp.qr_limit as plan_qr_limit, sp.analytics_retention_days as plan_analytics_retention,
          sp.features as plan_features, sp.is_active as plan_is_active, sp.created_at as plan_created_at
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1
        ORDER BY us.created_at DESC
        LIMIT 1
      `;
      
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        plan: row.plan_name ? {
          id: row.plan_id,
          name: row.plan_name,
          price: parseFloat(row.plan_price),
          currency: row.plan_currency,
          qrLimit: row.plan_qr_limit,
          analyticsRetentionDays: row.plan_analytics_retention,
          features: row.plan_features,
          isActive: row.plan_is_active,
          createdAt: row.plan_created_at
        } : undefined
      };
    } catch (error) {
      this.logger.error('Failed to find subscription by user ID', { userId, error });
      throw new DatabaseError('Failed to find subscription');
    } finally {
      client.release();
    }
  }

  async findById(subscriptionId: string): Promise<UserSubscription | null> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT 
          us.id, us.user_id, us.plan_id, us.status, us.current_period_start, 
          us.current_period_end, us.cancel_at_period_end, us.created_at, us.updated_at,
          sp.name as plan_name, sp.price as plan_price, sp.currency as plan_currency,
          sp.qr_limit as plan_qr_limit, sp.analytics_retention_days as plan_analytics_retention,
          sp.features as plan_features, sp.is_active as plan_is_active, sp.created_at as plan_created_at
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.id = $1
      `;
      
      const result = await client.query(query, [subscriptionId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        plan: row.plan_name ? {
          id: row.plan_id,
          name: row.plan_name,
          price: parseFloat(row.plan_price),
          currency: row.plan_currency,
          qrLimit: row.plan_qr_limit,
          analyticsRetentionDays: row.plan_analytics_retention,
          features: row.plan_features,
          isActive: row.plan_is_active,
          createdAt: row.plan_created_at
        } : undefined
      };
    } catch (error) {
      this.logger.error('Failed to find subscription by ID', { subscriptionId, error });
      throw new DatabaseError('Failed to find subscription');
    } finally {
      client.release();
    }
  }

  async update(subscriptionId: string, updates: UpdateSubscriptionRequest): Promise<UserSubscription> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.planId !== undefined) {
        updateFields.push(`plan_id = $${paramIndex++}`);
        updateValues.push(updates.planId);
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(updates.status);
      }

      if (updates.currentPeriodStart !== undefined) {
        updateFields.push(`current_period_start = $${paramIndex++}`);
        updateValues.push(updates.currentPeriodStart);
      }

      if (updates.currentPeriodEnd !== undefined) {
        updateFields.push(`current_period_end = $${paramIndex++}`);
        updateValues.push(updates.currentPeriodEnd);
      }

      if (updates.cancelAtPeriodEnd !== undefined) {
        updateFields.push(`cancel_at_period_end = $${paramIndex++}`);
        updateValues.push(updates.cancelAtPeriodEnd);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(subscriptionId);

      const query = `
        UPDATE user_subscriptions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, user_id, plan_id, status, current_period_start, 
                  current_period_end, cancel_at_period_end, created_at, updated_at
      `;

      const result = await client.query(query, updateValues);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Subscription not found');
      }

      const row = result.rows[0];
      
      this.logger.info('Subscription updated successfully', {
        subscriptionId,
        updates: Object.keys(updates)
      });

      return {
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      this.logger.error('Failed to update subscription', { subscriptionId, updates, error });
      throw new DatabaseError('Failed to update subscription');
    } finally {
      client.release();
    }
  }

  async delete(subscriptionId: string): Promise<void> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = 'DELETE FROM user_subscriptions WHERE id = $1';
      const result = await client.query(query, [subscriptionId]);
      
      if (result.rowCount === 0) {
        throw new DatabaseError('Subscription not found');
      }
      
      this.logger.info('Subscription deleted successfully', { subscriptionId });
    } catch (error) {
      this.logger.error('Failed to delete subscription', { subscriptionId, error });
      throw new DatabaseError('Failed to delete subscription');
    } finally {
      client.release();
    }
  }

  // ===============================================
  // SUBSCRIPTION ANALYTICS
  // ===============================================

  async findExpiredSubscriptions(): Promise<UserSubscription[]> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT 
          id, user_id, plan_id, status, current_period_start, 
          current_period_end, cancel_at_period_end, created_at, updated_at
        FROM user_subscriptions 
        WHERE current_period_end < NOW() AND status = 'active'
        ORDER BY current_period_end ASC
      `;
      
      const result = await client.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to find expired subscriptions', { error });
      throw new DatabaseError('Failed to find expired subscriptions');
    } finally {
      client.release();
    }
  }

  async findSubscriptionsByPlan(planId: string): Promise<UserSubscription[]> {
    const client: PoolClient = await this.db.connect();
    
    try {
      const query = `
        SELECT 
          id, user_id, plan_id, status, current_period_start, 
          current_period_end, cancel_at_period_end, created_at, updated_at
        FROM user_subscriptions 
        WHERE plan_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [planId]);
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to find subscriptions by plan', { planId, error });
      throw new DatabaseError('Failed to find subscriptions by plan');
    } finally {
      client.release();
    }
  }

  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    cancelled: number;
    expired: number;
    byPlan: Record<string, number>;
  }> {
    const client: PoolClient = await this.db.connect();
    
    try {
      // Get overall stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
        FROM user_subscriptions
      `;
      
      const statsResult = await client.query(statsQuery);
      const stats = statsResult.rows[0];
      
      // Get stats by plan
      const planStatsQuery = `
        SELECT sp.name, COUNT(us.id) as count
        FROM subscription_plans sp
        LEFT JOIN user_subscriptions us ON sp.id = us.plan_id
        GROUP BY sp.id, sp.name
        ORDER BY count DESC
      `;
      
      const planStatsResult = await client.query(planStatsQuery);
      const byPlan: Record<string, number> = {};
      
      planStatsResult.rows.forEach(row => {
        byPlan[row.name] = parseInt(row.count);
      });
      
      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        cancelled: parseInt(stats.cancelled),
        expired: parseInt(stats.expired),
        byPlan
      };
    } catch (error) {
      this.logger.error('Failed to get subscription stats', { error });
      throw new DatabaseError('Failed to get subscription stats');
    } finally {
      client.release();
    }
  }
}