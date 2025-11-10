import { Pool, PoolClient } from 'pg';
import {
  IPaymentRepository,
  PaymentMethod,
  PaymentTransaction,
  PaymentProvider,
  ILogger
} from '../interfaces';

export class PaymentRepository implements IPaymentRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async savePaymentMethod(paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>): Promise<PaymentMethod> {
    const query = `
      INSERT INTO payment_methods (
        user_id, provider, type, card_data, klarna_data, swish_data, paypal_data, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      paymentMethod.provider === PaymentProvider.STRIPE ? JSON.parse(JSON.stringify({userId: paymentMethod.provider})).userId : null,
      paymentMethod.provider,
      paymentMethod.type,
      paymentMethod.card ? JSON.stringify(paymentMethod.card) : null,
      paymentMethod.klarna ? JSON.stringify(paymentMethod.klarna) : null,
      paymentMethod.swish ? JSON.stringify(paymentMethod.swish) : null,
      paymentMethod.paypal ? JSON.stringify(paymentMethod.paypal) : null,
      paymentMethod.isDefault
    ];

    try {
      // Extract userId from the request context (we'll need to pass this)
      // For now, let's assume it's passed separately
      const client = await this.db.connect();
      try {
        const result = await client.query(query, values);
        const row = result.rows[0];
        
        return this.mapRowToPaymentMethod(row);
      } finally {
        client.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to save payment method', { error: errorMessage });
      throw error;
    }
  }

  async savePaymentMethodForUser(userId: string, paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>): Promise<PaymentMethod> {
    const query = `
      INSERT INTO payment_methods (
        user_id, provider, type, card_data, klarna_data, swish_data, paypal_data, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      userId,
      paymentMethod.provider,
      paymentMethod.type,
      paymentMethod.card ? JSON.stringify(paymentMethod.card) : null,
      paymentMethod.klarna ? JSON.stringify(paymentMethod.klarna) : null,
      paymentMethod.swish ? JSON.stringify(paymentMethod.swish) : null,
      paymentMethod.paypal ? JSON.stringify(paymentMethod.paypal) : null,
      paymentMethod.isDefault
    ];

    try {
      const client = await this.db.connect();
      try {
        // If this is being set as default, unset all other defaults for this user
        if (paymentMethod.isDefault) {
          await client.query(
            'UPDATE payment_methods SET is_default = false WHERE user_id = $1 AND provider = $2',
            [userId, paymentMethod.provider]
          );
        }

        const result = await client.query(query, values);
        const row = result.rows[0];
        
        return this.mapRowToPaymentMethod(row);
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Failed to save payment method for user', { userId, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async findPaymentMethodById(id: string): Promise<PaymentMethod | null> {
    const query = 'SELECT * FROM payment_methods WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPaymentMethod(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to find payment method by ID', { id, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async findPaymentMethodsByUserId(userId: string, provider?: PaymentProvider): Promise<PaymentMethod[]> {
    let query = 'SELECT * FROM payment_methods WHERE user_id = $1';
    const values: any[] = [userId];
    
    if (provider) {
      query += ' AND provider = $2';
      values.push(provider);
    }
    
    query += ' ORDER BY is_default DESC, created_at DESC';

    try {
      const result = await this.db.query(query, values);
      
      return result.rows.map(row => this.mapRowToPaymentMethod(row));
    } catch (error) {
      this.logger.error('Failed to find payment methods by user ID', { userId, provider, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.type !== undefined) {
      fields.push(`type = $${paramCount++}`);
      values.push(updates.type);
    }
    if (updates.card !== undefined) {
      fields.push(`card_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.card));
    }
    if (updates.klarna !== undefined) {
      fields.push(`klarna_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.klarna));
    }
    if (updates.swish !== undefined) {
      fields.push(`swish_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.swish));
    }
    if (updates.paypal !== undefined) {
      fields.push(`paypal_data = $${paramCount++}`);
      values.push(JSON.stringify(updates.paypal));
    }
    if (updates.isDefault !== undefined) {
      fields.push(`is_default = $${paramCount++}`);
      values.push(updates.isDefault);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE payment_methods 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const client = await this.db.connect();
      try {
        // If setting as default, unset others
        if (updates.isDefault) {
          await client.query(
            'UPDATE payment_methods SET is_default = false WHERE id != $1 AND user_id = (SELECT user_id FROM payment_methods WHERE id = $1)',
            [id]
          );
        }

        const result = await client.query(query, values);
        
        if (result.rows.length === 0) {
          throw new Error('Payment method not found');
        }

        return this.mapRowToPaymentMethod(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Failed to update payment method', { id, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async deletePaymentMethod(id: string): Promise<void> {
    const query = 'DELETE FROM payment_methods WHERE id = $1';

    try {
      const result = await this.db.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Payment method not found');
      }
    } catch (error) {
      this.logger.error('Failed to delete payment method', { id, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  // Transaction methods
  async saveTransaction(transaction: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransaction> {
    const query = `
      INSERT INTO payment_transactions (
        user_id, subscription_id, provider, provider_transaction_id, type, status, 
        amount, currency, description, payment_method_id, metadata, failure_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      transaction.userId,
      transaction.subscriptionId || null,
      transaction.provider,
      transaction.providerTransactionId,
      transaction.type,
      transaction.status,
      transaction.amount,
      transaction.currency,
      transaction.description,
      transaction.paymentMethodId || null,
      transaction.metadata ? JSON.stringify(transaction.metadata) : null,
      transaction.failureReason || null
    ];

    try {
      const result = await this.db.query(query, values);
      const row = result.rows[0];
      
      return this.mapRowToTransaction(row);
    } catch (error) {
      this.logger.error('Failed to save transaction', { error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async findTransactionById(id: string): Promise<PaymentTransaction | null> {
    const query = 'SELECT * FROM payment_transactions WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to find transaction by ID', { id, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async findTransactionsByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<PaymentTransaction[]> {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [userId, limit, offset]);
      
      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      this.logger.error('Failed to find transactions by user ID', { userId, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async updateTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.failureReason !== undefined) {
      fields.push(`failure_reason = $${paramCount++}`);
      values.push(updates.failureReason);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE payment_transactions 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to update transaction', { id, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  async findTransactionByProviderTransactionId(providerTransactionId: string, provider: PaymentProvider): Promise<PaymentTransaction | null> {
    const query = 'SELECT * FROM payment_transactions WHERE provider_transaction_id = $1 AND provider = $2';
    
    try {
      const result = await this.db.query(query, [providerTransactionId, provider]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to find transaction by provider transaction ID', { 
        providerTransactionId, 
        provider, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
      throw error;
    }
  }

  private mapRowToPaymentMethod(row: any): PaymentMethod {
    return {
      id: row.id,
      provider: row.provider as PaymentProvider,
      type: row.type,
      card: row.card_data ? JSON.parse(row.card_data) : undefined,
      klarna: row.klarna_data ? JSON.parse(row.klarna_data) : undefined,
      swish: row.swish_data ? JSON.parse(row.swish_data) : undefined,
      paypal: row.paypal_data ? JSON.parse(row.paypal_data) : undefined,
      isDefault: row.is_default,
      createdAt: row.created_at
    };
  }

  private mapRowToTransaction(row: any): PaymentTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      subscriptionId: row.subscription_id || undefined,
      provider: row.provider as PaymentProvider,
      providerTransactionId: row.provider_transaction_id,
      type: row.type,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      paymentMethodId: row.payment_method_id || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      failureReason: row.failure_reason || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}