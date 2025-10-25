import { Pool, PoolClient } from 'pg';
import {
  ILandingPageFormRepository,
  ILandingPageFormSubmissionRepository,
  LandingPageForm,
  LandingPageFormSubmission,
  QueryOptions,
  DatabaseError,
  NotFoundError,
  ILogger
} from '../interfaces';

export class LandingPageFormRepository implements ILandingPageFormRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(formData: any): Promise<LandingPageForm> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Creating landing page form', {
        landingPageId: formData.landingPageId,
        formName: formData.formName,
        formType: formData.formType
      });

      const query = `
        INSERT INTO landing_page_forms (
          id, landing_page_id, form_name, form_type, fields_config,
          validation_rules, notification_settings, integration_config,
          auto_responder_config, redirect_after_submit, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `;

      const values = [
        formData.id || require('crypto').randomUUID(),
        formData.landingPageId,
        formData.formName,
        formData.formType,
        JSON.stringify(formData.fieldsConfig || []),
        JSON.stringify(formData.validationRules || {}),
        JSON.stringify(formData.notificationSettings || {}),
        JSON.stringify(formData.integrationConfig || {}),
        JSON.stringify(formData.autoResponderConfig || {}),
        formData.redirectAfterSubmit || null,
        formData.isActive !== false,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const form = this.mapRowToForm(result.rows[0]);
      
      this.logger.info('Successfully created landing page form', {
        formId: form.id,
        landingPageId: form.landingPageId,
        formName: form.formName
      });

      return form;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to create landing page form', {
        landingPageId: formData.landingPageId,
        error
      });
      throw new DatabaseError('Failed to create landing page form', error);
    } finally {
      client.release();
    }
  }

  async findById(formId: string): Promise<LandingPageForm | null> {
    try {
      this.logger.info('Fetching form by ID', { formId });
      
      const query = `
        SELECT * FROM landing_page_forms
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [formId]);
      
      if (result.rows.length === 0) {
        this.logger.warn('Form not found', { formId });
        return null;
      }
      
      const form = this.mapRowToForm(result.rows[0]);
      this.logger.info('Successfully fetched form', {
        formId,
        formName: form.formName,
        landingPageId: form.landingPageId
      });
      return form;
      
    } catch (error) {
      this.logger.error('Failed to fetch form by ID', { formId, error });
      throw new DatabaseError('Failed to fetch form', error);
    }
  }

  async findByLandingPageId(landingPageId: string): Promise<LandingPageForm[]> {
    try {
      this.logger.info('Fetching forms by landing page ID', { landingPageId });
      
      const query = `
        SELECT * FROM landing_page_forms
        WHERE landing_page_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [landingPageId]);
      const forms = result.rows.map(this.mapRowToForm.bind(this));
      
      this.logger.info('Successfully fetched forms for landing page', {
        landingPageId,
        count: forms.length
      });
      return forms;
      
    } catch (error) {
      this.logger.error('Failed to fetch forms for landing page', { landingPageId, error });
      throw new DatabaseError('Failed to fetch forms for landing page', error);
    }
  }

  async update(formId: string, formData: any): Promise<LandingPageForm> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Updating landing page form', { formId, updates: Object.keys(formData) });

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (formData.formName !== undefined) {
        updateFields.push(`form_name = $${paramIndex++}`);
        values.push(formData.formName);
      }
      if (formData.fieldsConfig !== undefined) {
        updateFields.push(`fields_config = $${paramIndex++}`);
        values.push(JSON.stringify(formData.fieldsConfig));
      }
      if (formData.validationRules !== undefined) {
        updateFields.push(`validation_rules = $${paramIndex++}`);
        values.push(JSON.stringify(formData.validationRules));
      }
      if (formData.notificationSettings !== undefined) {
        updateFields.push(`notification_settings = $${paramIndex++}`);
        values.push(JSON.stringify(formData.notificationSettings));
      }
      if (formData.integrationConfig !== undefined) {
        updateFields.push(`integration_config = $${paramIndex++}`);
        values.push(JSON.stringify(formData.integrationConfig));
      }
      if (formData.autoResponderConfig !== undefined) {
        updateFields.push(`auto_responder_config = $${paramIndex++}`);
        values.push(JSON.stringify(formData.autoResponderConfig));
      }
      if (formData.redirectAfterSubmit !== undefined) {
        updateFields.push(`redirect_after_submit = $${paramIndex++}`);
        values.push(formData.redirectAfterSubmit);
      }
      if (formData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(formData.isActive);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(formId);

      const query = `
        UPDATE landing_page_forms 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Form not found');
      }

      await client.query('COMMIT');
      
      const updatedForm = this.mapRowToForm(result.rows[0]);
      
      this.logger.info('Successfully updated landing page form', {
        formId,
        formName: updatedForm.formName
      });

      return updatedForm;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to update landing page form', { formId, error });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update landing page form', error);
    } finally {
      client.release();
    }
  }

  async delete(formId: string): Promise<boolean> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Deleting landing page form', { formId });

      // Delete form submissions first
      await client.query('DELETE FROM landing_page_form_submissions WHERE form_id = $1', [formId]);
      
      // Delete the form
      const result = await client.query('DELETE FROM landing_page_forms WHERE id = $1', [formId]);
      
      await client.query('COMMIT');
      
      const deleted = (result.rowCount || 0) > 0;
      
      this.logger.info('Form deletion completed', { formId, deleted });
      return deleted;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to delete landing page form', { formId, error });
      throw new DatabaseError('Failed to delete landing page form', error);
    } finally {
      client.release();
    }
  }

  async incrementSubmissionCount(formId: string): Promise<void> {
    try {
      this.logger.debug('Incrementing form submission count', { formId });
      
      const query = `
        UPDATE landing_page_forms 
        SET submission_count = submission_count + 1
        WHERE id = $1
      `;
      
      await this.db.query(query, [formId]);
      
      this.logger.debug('Successfully incremented form submission count', { formId });
      
    } catch (error) {
      this.logger.error('Failed to increment form submission count', { formId, error });
      throw new DatabaseError('Failed to increment form submission count', error);
    }
  }

  private mapRowToForm(row: any): LandingPageForm {
    return {
      id: row.id,
      landingPageId: row.landing_page_id,
      formName: row.form_name,
      formType: row.form_type,
      fieldsConfig: JSON.parse(row.fields_config || '[]'),
      validationRules: JSON.parse(row.validation_rules || '{}'),
      notificationSettings: JSON.parse(row.notification_settings || '{}'),
      integrationConfig: JSON.parse(row.integration_config || '{}'),
      autoResponderConfig: JSON.parse(row.auto_responder_config || '{}'),
      redirectAfterSubmit: row.redirect_after_submit,
      isActive: row.is_active,
      submissionCount: row.submission_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export class LandingPageFormSubmissionRepository implements ILandingPageFormSubmissionRepository {
  constructor(
    private db: Pool,
    private logger: ILogger
  ) {}

  async create(submissionData: any): Promise<LandingPageFormSubmission> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Creating form submission', {
        formId: submissionData.formId,
        landingPageId: submissionData.landingPageId,
        hasVisitorId: !!submissionData.visitorId
      });

      const query = `
        INSERT INTO landing_page_form_submissions (
          id, form_id, landing_page_id, visitor_id, submission_data,
          ip_address, user_agent, referrer_url, device_info, geo_location,
          submission_source, is_processed, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `;

      const values = [
        submissionData.id || require('crypto').randomUUID(),
        submissionData.formId,
        submissionData.landingPageId,
        submissionData.visitorId || null,
        JSON.stringify(submissionData.submissionData || {}),
        submissionData.ipAddress || null,
        submissionData.userAgent || null,
        submissionData.referrerUrl || null,
        JSON.stringify(submissionData.deviceInfo || {}),
        JSON.stringify(submissionData.geoLocation || {}),
        submissionData.submissionSource || 'landing_page',
        false,
        new Date()
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const submission = this.mapRowToSubmission(result.rows[0]);
      
      this.logger.info('Successfully created form submission', {
        submissionId: submission.id,
        formId: submission.formId,
        landingPageId: submission.landingPageId
      });

      return submission;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to create form submission', {
        formId: submissionData.formId,
        error
      });
      throw new DatabaseError('Failed to create form submission', error);
    } finally {
      client.release();
    }
  }

  async findById(submissionId: string): Promise<LandingPageFormSubmission | null> {
    try {
      this.logger.info('Fetching form submission by ID', { submissionId });
      
      const query = `
        SELECT * FROM landing_page_form_submissions
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [submissionId]);
      
      if (result.rows.length === 0) {
        this.logger.warn('Form submission not found', { submissionId });
        return null;
      }
      
      const submission = this.mapRowToSubmission(result.rows[0]);
      this.logger.info('Successfully fetched form submission', {
        submissionId,
        formId: submission.formId,
        landingPageId: submission.landingPageId
      });
      return submission;
      
    } catch (error) {
      this.logger.error('Failed to fetch form submission by ID', { submissionId, error });
      throw new DatabaseError('Failed to fetch form submission', error);
    }
  }

  async findByFormId(formId: string, options?: QueryOptions): Promise<LandingPageFormSubmission[]> {
    try {
      this.logger.info('Fetching form submissions by form ID', { formId, options });
      
      const limit = Math.min(options?.limit || 50, 200);
      const offset = options?.offset || 0;
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      
      const query = `
        SELECT * FROM landing_page_form_submissions
        WHERE form_id = $1
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [formId, limit, offset]);
      const submissions = result.rows.map(this.mapRowToSubmission.bind(this));
      
      this.logger.info('Successfully fetched form submissions', {
        formId,
        count: submissions.length,
        limit,
        offset
      });
      return submissions;
      
    } catch (error) {
      this.logger.error('Failed to fetch form submissions', { formId, error });
      throw new DatabaseError('Failed to fetch form submissions', error);
    }
  }

  async findByLandingPageId(landingPageId: string, options?: QueryOptions): Promise<LandingPageFormSubmission[]> {
    try {
      this.logger.info('Fetching form submissions by landing page ID', { landingPageId, options });
      
      const limit = Math.min(options?.limit || 50, 200);
      const offset = options?.offset || 0;
      const sortBy = options?.sortBy || 'created_at';
      const sortOrder = options?.sortOrder || 'desc';
      
      const query = `
        SELECT * FROM landing_page_form_submissions
        WHERE landing_page_id = $1
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [landingPageId, limit, offset]);
      const submissions = result.rows.map(this.mapRowToSubmission.bind(this));
      
      this.logger.info('Successfully fetched landing page form submissions', {
        landingPageId,
        count: submissions.length,
        limit,
        offset
      });
      return submissions;
      
    } catch (error) {
      this.logger.error('Failed to fetch landing page form submissions', { landingPageId, error });
      throw new DatabaseError('Failed to fetch landing page form submissions', error);
    }
  }

  async update(submissionId: string, submissionData: any): Promise<LandingPageFormSubmission> {
    const client: PoolClient = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      this.logger.info('Updating form submission', { submissionId, updates: Object.keys(submissionData) });

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (submissionData.isProcessed !== undefined) {
        updateFields.push(`is_processed = $${paramIndex++}`);
        values.push(submissionData.isProcessed);
        if (submissionData.isProcessed) {
          updateFields.push(`processed_at = $${paramIndex++}`);
          values.push(new Date());
        }
      }

      values.push(submissionId);

      const query = `
        UPDATE landing_page_form_submissions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Form submission not found');
      }

      await client.query('COMMIT');
      
      const updatedSubmission = this.mapRowToSubmission(result.rows[0]);
      
      this.logger.info('Successfully updated form submission', {
        submissionId,
        isProcessed: updatedSubmission.isProcessed
      });

      return updatedSubmission;

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to update form submission', { submissionId, error });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update form submission', error);
    } finally {
      client.release();
    }
  }

  async delete(submissionId: string): Promise<boolean> {
    try {
      this.logger.info('Deleting form submission', { submissionId });
      
      const result = await this.db.query('DELETE FROM landing_page_form_submissions WHERE id = $1', [submissionId]);
      
      const deleted = (result.rowCount || 0) > 0;
      
      this.logger.info('Form submission deletion completed', { submissionId, deleted });
      return deleted;

    } catch (error) {
      this.logger.error('Failed to delete form submission', { submissionId, error });
      throw new DatabaseError('Failed to delete form submission', error);
    }
  }

  private mapRowToSubmission(row: any): LandingPageFormSubmission {
    return {
      id: row.id,
      formId: row.form_id,
      landingPageId: row.landing_page_id,
      visitorId: row.visitor_id,
      submissionData: JSON.parse(row.submission_data || '{}'),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      referrerUrl: row.referrer_url,
      deviceInfo: JSON.parse(row.device_info || '{}'),
      geoLocation: JSON.parse(row.geo_location || '{}'),
      submissionSource: row.submission_source,
      isProcessed: row.is_processed,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      createdAt: new Date(row.created_at)
    };
  }
}