import { 
  ICsvProcessor,
  BulkQRTemplate,
  BulkValidationResult,
  BulkDataError,
  BulkDataWarning,
  ILogger,
  ValidationError
} from '../interfaces';

/**
 * CSV Processor - Clean Architecture Implementation
 * 
 * Handles CSV parsing, validation, and field mapping for bulk QR generation
 * Follows SOLID principles and dependency inversion
 */
export class CsvProcessor implements ICsvProcessor {
  constructor(private readonly logger: ILogger) {}

  /**
   * Parse CSV data into structured array
   */
  async parse(csvData: string): Promise<any[]> {
    try {
      this.logger.info('Parsing CSV data', { size: csvData.length });

      // Split by lines and handle different line endings
      const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        throw new ValidationError('CSV data is empty');
      }

      // Parse header row
      const headers = this.parseCsvLine(lines[0]);
      if (headers.length === 0) {
        throw new ValidationError('CSV header row is empty');
      }

      // Parse data rows
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const rowData = this.parseCsvLine(lines[i]);
        
        // Skip empty rows
        if (rowData.every(cell => cell.trim() === '')) {
          continue;
        }

        // Create object from row data
        const record: any = {};
        headers.forEach((header, index) => {
          record[header.trim()] = rowData[index] || '';
        });

        // Add row number for error tracking
        record._rowNumber = i + 1;
        data.push(record);
      }

      this.logger.info('CSV parsing completed', { rows: data.length, columns: headers.length });
      return data;

    } catch (error) {
      this.logger.error('Failed to parse CSV data', { error });
      throw error instanceof ValidationError ? error : new ValidationError('Invalid CSV format');
    }
  }

  /**
   * Validate parsed data against template rules
   */
  async validate(data: any[], template?: BulkQRTemplate): Promise<BulkValidationResult> {
    try {
      this.logger.info('Validating bulk data', { rows: data.length, template: template?.name });

      const errors: BulkDataError[] = [];
      const warnings: BulkDataWarning[] = [];
      let validItems = 0;

      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        const rowNumber = record._rowNumber || i + 1;
        let rowValid = true;

        // Basic validation
        const basicValidation = this.validateBasicRequirements(record, rowNumber);
        if (basicValidation.errors.length > 0) {
          errors.push(...basicValidation.errors);
          rowValid = false;
        }
        warnings.push(...basicValidation.warnings);

        // Template-specific validation
        if (template) {
          const templateValidation = this.validateAgainstTemplate(record, template, rowNumber);
          if (templateValidation.errors.length > 0) {
            errors.push(...templateValidation.errors);
            rowValid = false;
          }
          warnings.push(...templateValidation.warnings);
        }

        if (rowValid) {
          validItems++;
        }
      }

      const result: BulkValidationResult = {
        isValid: errors.length === 0,
        totalItems: data.length,
        validItems,
        invalidItems: data.length - validItems,
        errors,
        warnings
      };

      this.logger.info('Bulk data validation completed', result);
      return result;

    } catch (error) {
      this.logger.error('Failed to validate bulk data', { error });
      throw new ValidationError('Validation failed');
    }
  }

  /**
   * Map CSV fields to QR code fields using template mappings
   */
  mapFields(data: any[], fieldMappings: Record<string, string>): any[] {
    try {
      this.logger.info('Mapping CSV fields', { rows: data.length, mappings: Object.keys(fieldMappings).length });

      return data.map((record, index) => {
        const mapped: any = {};
        
        // Map fields according to template
        Object.entries(fieldMappings).forEach(([qrField, csvField]) => {
          if (record.hasOwnProperty(csvField)) {
            mapped[qrField] = record[csvField];
          }
        });

        // Preserve row number for error tracking
        mapped._rowNumber = record._rowNumber || index + 1;
        mapped._originalData = record;

        return mapped;
      });

    } catch (error) {
      this.logger.error('Failed to map CSV fields', { error });
      throw new ValidationError('Field mapping failed');
    }
  }

  /**
   * Apply default values to mapped data
   */
  applyDefaults(data: any[], defaultValues: Record<string, any>): any[] {
    try {
      this.logger.info('Applying default values', { rows: data.length, defaults: Object.keys(defaultValues).length });

      return data.map(record => {
        const withDefaults = { ...record };

        // Apply default values for missing or empty fields
        Object.entries(defaultValues).forEach(([field, defaultValue]) => {
          if (!withDefaults[field] || withDefaults[field].toString().trim() === '') {
            withDefaults[field] = defaultValue;
          }
        });

        return withDefaults;
      });

    } catch (error) {
      this.logger.error('Failed to apply default values', { error });
      throw new ValidationError('Default value application failed');
    }
  }

  // ===============================================
  // PRIVATE HELPER METHODS
  // ===============================================

  /**
   * Parse single CSV line handling quoted values and commas
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }

      i++;
    }

    // Add the last field
    result.push(current);

    return result;
  }

  /**
   * Validate basic requirements for any QR code
   */
  private validateBasicRequirements(record: any, rowNumber: number): { errors: BulkDataError[], warnings: BulkDataWarning[] } {
    const errors: BulkDataError[] = [];
    const warnings: BulkDataWarning[] = [];

    // Check for completely empty record
    const hasAnyData = Object.keys(record).some(key => 
      key !== '_rowNumber' && record[key] && record[key].toString().trim() !== ''
    );

    if (!hasAnyData) {
      errors.push({
        row: rowNumber,
        message: 'Row contains no data',
        value: record
      });
    }

    // Basic field validations
    if (record.name && record.name.length > 255) {
      errors.push({
        row: rowNumber,
        field: 'name',
        message: 'Name exceeds maximum length of 255 characters',
        value: record.name
      });
    }

    if (record.url && !this.isValidUrl(record.url)) {
      errors.push({
        row: rowNumber,
        field: 'url',
        message: 'Invalid URL format',
        value: record.url
      });
    }

    if (record.email && !this.isValidEmail(record.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format',
        value: record.email
      });
    }

    if (record.phone && !this.isValidPhone(record.phone)) {
      warnings.push({
        row: rowNumber,
        field: 'phone',
        message: 'Phone number format may not be valid',
        value: record.phone
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate record against template-specific rules
   */
  private validateAgainstTemplate(record: any, template: BulkQRTemplate, rowNumber: number): { errors: BulkDataError[], warnings: BulkDataWarning[] } {
    const errors: BulkDataError[] = [];
    const warnings: BulkDataWarning[] = [];

    if (!template.validationRules) {
      return { errors, warnings };
    }

    // Apply template validation rules
    Object.entries(template.validationRules).forEach(([field, rules]: [string, any]) => {
      const value = record[field];

      // Required field validation
      if (rules.required && (!value || value.toString().trim() === '')) {
        errors.push({
          row: rowNumber,
          field,
          message: `Required field '${field}' is missing`,
          value: value
        });
        return;
      }

      // Skip other validations if field is empty and not required
      if (!value || value.toString().trim() === '') {
        return;
      }

      // String length validations
      if (rules.maxLength && value.toString().length > rules.maxLength) {
        errors.push({
          row: rowNumber,
          field,
          message: `Field '${field}' exceeds maximum length of ${rules.maxLength}`,
          value: value
        });
      }

      if (rules.minLength && value.toString().length < rules.minLength) {
        errors.push({
          row: rowNumber,
          field,
          message: `Field '${field}' is below minimum length of ${rules.minLength}`,
          value: value
        });
      }

      // Pattern validation
      if (rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value.toString())) {
          errors.push({
            row: rowNumber,
            field,
            message: `Field '${field}' does not match required format`,
            value: value
          });
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          row: rowNumber,
          field,
          message: `Field '${field}' must be one of: ${rules.enum.join(', ')}`,
          value: value
        });
      }

      // Numeric validations
      if (rules.type === 'number') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          errors.push({
            row: rowNumber,
            field,
            message: `Field '${field}' must be a valid number`,
            value: value
          });
        } else {
          if (rules.min !== undefined && numValue < rules.min) {
            errors.push({
              row: rowNumber,
              field,
              message: `Field '${field}' must be at least ${rules.min}`,
              value: value
            });
          }
          if (rules.max !== undefined && numValue > rules.max) {
            errors.push({
              row: rowNumber,
              field,
              message: `Field '${field}' must be at most ${rules.max}`,
              value: value
            });
          }
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (basic validation)
   */
  private isValidPhone(phone: string): boolean {
    // Remove common phone number characters
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    // Check if it's all digits and reasonable length
    return /^\d{7,15}$/.test(cleaned);
  }
}