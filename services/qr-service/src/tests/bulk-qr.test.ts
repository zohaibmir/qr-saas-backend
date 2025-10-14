import { BulkQRService } from '../services/bulk-qr.service';
import {
  BulkQRTemplate,
  CreateBulkTemplateRequest,
  IBulkQRRepository,
  IQRService,
  ICsvProcessor,
  ILogger,
  ServiceResponse
} from '../interfaces';

describe('Bulk QR Generation - Core Functionality', () => {
  let mockRepository: jest.Mocked<IBulkQRRepository>;
  let mockQRService: jest.Mocked<IQRService>;
  let mockCsvProcessor: jest.Mocked<ICsvProcessor>;
  let mockLogger: jest.Mocked<ILogger>;
  let service: BulkQRService;

  beforeEach(() => {
    mockRepository = {
      createBulkTemplate: jest.fn(),
      findBulkTemplateById: jest.fn(),
      findBulkTemplatesByUser: jest.fn(),
      findSystemBulkTemplates: jest.fn(),
      updateBulkTemplate: jest.fn(),
      deleteBulkTemplate: jest.fn(),
      incrementTemplateUsage: jest.fn(),
      createBulkBatch: jest.fn(),
      findBulkBatchById: jest.fn(),
      findBulkBatchesByUser: jest.fn(),
      updateBulkBatch: jest.fn(),
      deleteBulkBatch: jest.fn(),
      createBulkItems: jest.fn(),
      findBulkItemsByBatch: jest.fn(),
      updateBulkItem: jest.fn(),
      updateBulkItemsStatus: jest.fn(),
      getBulkItemsStats: jest.fn(),
      getBulkStats: jest.fn()
    } as any;

    mockQRService = {
      createQR: jest.fn(),
      getQR: jest.fn(),
      updateQR: jest.fn(),
      deleteQR: jest.fn(),
      getUserQRs: jest.fn()
    } as any;

    mockCsvProcessor = {
      parseCSV: jest.fn(),
      validateData: jest.fn(),
      generateTemplate: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    service = new BulkQRService(mockRepository, mockQRService, mockCsvProcessor, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should create a template successfully', async () => {
      const templateData: CreateBulkTemplateRequest = {
        name: 'Test Template',
        description: 'Test Description',
        templateType: 'url_list',
        fieldMappings: { url: 'URL', title: 'Title' },
        defaultValues: {},
        validationRules: {},
        qrSettings: {}
      };

      const mockTemplate: BulkQRTemplate = {
        id: 'template-1',
        userId: 'user-1',
        name: 'Test Template',
        description: 'Test Description',
        templateType: 'url_list',
        fieldMappings: { url: 'URL', title: 'Title' },
        defaultValues: {},
        validationRules: {},
        qrSettings: {},
        isSystemTemplate: false,
        isActive: true,
        usageCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockRepository.createBulkTemplate.mockResolvedValueOnce(mockTemplate);

      const result = await service.createBulkTemplate('user-1', templateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
      expect(mockRepository.createBulkTemplate).toHaveBeenCalledWith({
        userId: 'user-1',
        ...templateData,
        isSystemTemplate: false
      });
    });

    it('should handle template creation errors', async () => {
      const templateData: CreateBulkTemplateRequest = {
        name: 'Test Template',
        description: 'Test Description',
        templateType: 'url_list',
        fieldMappings: { url: 'URL', title: 'Title' },
        defaultValues: {},
        validationRules: {},
        qrSettings: {}
      };

      mockRepository.createBulkTemplate.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.createBulkTemplate('user-1', templateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FAILED_TO_CREATE_BULK_TEMPLATE');
    });
  });

  describe('Template Retrieval', () => {
    it('should get templates successfully', async () => {
      const mockTemplates: BulkQRTemplate[] = [
        {
          id: 'template-1',
          userId: 'user-1',
          name: 'Template 1',
          description: 'Description 1',
          templateType: 'url_list',
          fieldMappings: {},
          defaultValues: {},
          validationRules: {},
          qrSettings: {},
          isSystemTemplate: false,
          isActive: true,
          usageCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockRepository.findSystemBulkTemplates.mockResolvedValueOnce([]);
      mockRepository.findBulkTemplatesByUser.mockResolvedValueOnce(mockTemplates);

      const result = await service.getBulkTemplates('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplates);
      expect(mockRepository.findBulkTemplatesByUser).toHaveBeenCalledWith('user-1');
      expect(mockRepository.findSystemBulkTemplates).toHaveBeenCalled();
    });

    it('should get template by ID successfully', async () => {
      const mockTemplate: BulkQRTemplate = {
        id: 'template-1',
        userId: 'user-1',
        name: 'Test Template',
        description: 'Test Description',
        templateType: 'url_list',
        fieldMappings: {},
        defaultValues: {},
        validationRules: {},
        qrSettings: {},
        isSystemTemplate: false,
        isActive: true,
        usageCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockRepository.findBulkTemplateById.mockResolvedValueOnce(mockTemplate);

      const result = await service.getBulkTemplateById('template-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplate);
      expect(mockRepository.findBulkTemplateById).toHaveBeenCalledWith('template-1');
    });
  });
});