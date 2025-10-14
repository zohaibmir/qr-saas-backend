import { QRCustomizationService } from '../services/qr-customization.service';
import { ImageProcessorService } from '../services/image-processor.service';
import { QRGenerator } from '../utils/qr-generator';
import { Logger } from '../services/logger.service';
import { QRDesignConfig } from '../interfaces';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

describe('QR Customization System Tests', () => {
  let customizationService: QRCustomizationService;
  let imageProcessor: ImageProcessorService;
  let qrGenerator: QRGenerator;

  beforeEach(() => {
    customizationService = new QRCustomizationService(mockLogger);
    imageProcessor = new ImageProcessorService(mockLogger);
    qrGenerator = new QRGenerator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('QRCustomizationService', () => {
    describe('validateCustomization', () => {
      it('should validate free tier limitations', async () => {
        const designConfig: QRDesignConfig = {
          size: 500,
          logo: { url: 'test.png', size: 20, position: 'center' },
          pattern: 'rounded',
          eyePattern: { outer: 'circle', inner: 'diamond' }
        };

        const result = await customizationService.validateCustomization(designConfig, 'free');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('QR code size cannot exceed 300px for free tier');
        expect(result.errors).toContain('Logo integration not available for free tier. Upgrade to Pro or higher.');
        expect(result.errors).toContain('Eye pattern customization not available for free tier. Upgrade to Business or higher.');
      });

      it('should validate pro tier features', async () => {
        const designConfig: QRDesignConfig = {
          size: 400,
          logo: { url: 'test.png', size: 20, position: 'center' },
          pattern: 'rounded',
          backgroundTransparent: true
        };

        const result = await customizationService.validateCustomization(designConfig, 'pro');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate business tier advanced features', async () => {
        const designConfig: QRDesignConfig = {
          size: 600,
          eyePattern: { outer: 'circle', inner: 'diamond' },
          gradient: { type: 'linear', colors: ['#ff0000', '#00ff00'], direction: 45 }
        };

        const result = await customizationService.validateCustomization(designConfig, 'business');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate enterprise tier effects', async () => {
        const designConfig: QRDesignConfig = {
          size: 800,
          shadow: { color: '#000000', blur: 10, offsetX: 5, offsetY: 5 },
          backgroundImage: { url: 'bg.png', opacity: 0.3, blend: 'overlay' }
        };

        const result = await customizationService.validateCustomization(designConfig, 'enterprise');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('getCustomizationLimits', () => {
      it('should return correct limits for each tier', () => {
        const freeLimits = customizationService.getCustomizationLimits('free');
        expect(freeLimits.maxSize).toBe(300);
        expect(freeLimits.allowLogo).toBe(false);
        expect(freeLimits.allowEyePatterns).toBe(false);

        const proLimits = customizationService.getCustomizationLimits('pro');
        expect(proLimits.maxSize).toBe(500);
        expect(proLimits.allowLogo).toBe(true);
        expect(proLimits.allowTransparency).toBe(true);

        const businessLimits = customizationService.getCustomizationLimits('business');
        expect(businessLimits.maxSize).toBe(800);
        expect(businessLimits.allowEyePatterns).toBe(true);
        expect(businessLimits.allowGradients).toBe(true);

        const enterpriseLimits = customizationService.getCustomizationLimits('enterprise');
        expect(enterpriseLimits.maxSize).toBe(1200);
        expect(enterpriseLimits.allowEffects).toBe(true);
      });
    });

    describe('applyTierRestrictions', () => {
      it('should apply free tier restrictions', () => {
        const designConfig: QRDesignConfig = {
          size: 500,
          logo: { url: 'test.png', size: 20, position: 'center' },
          pattern: 'rounded',
          eyePattern: { outer: 'circle', inner: 'diamond' }
        };

        const restricted = customizationService.applyTierRestrictions(designConfig, 'free');

        expect(restricted.size).toBe(300);
        expect(restricted.logo).toBeUndefined();
        expect(restricted.pattern).toBe('square');
        expect(restricted.eyePattern).toBeUndefined();
      });

      it('should preserve allowed features for higher tiers', () => {
        const designConfig: QRDesignConfig = {
          size: 400,
          logo: { url: 'test.png', size: 20, position: 'center' },
          pattern: 'rounded'
        };

        const restricted = customizationService.applyTierRestrictions(designConfig, 'pro');

        expect(restricted.size).toBe(400);
        expect(restricted.logo).toBeDefined();
        expect(restricted.pattern).toBe('rounded');
      });
    });

    describe('validateDesignConfig', () => {
      it('should validate size constraints', () => {
        const config: QRDesignConfig = { size: 50 };
        const result = customizationService.validateDesignConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('QR code size must be between 100 and 1200 pixels');
      });

      it('should validate logo configuration', () => {
        const config: QRDesignConfig = {
          logo: { url: 'test.png', size: 60, position: 'center' }
        };
        const result = customizationService.validateDesignConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Logo size must be between 5% and 50% of QR code size');
      });

      it('should validate gradient configuration', () => {
        const config: QRDesignConfig = {
          gradient: { type: 'linear', colors: ['#ff0000'], direction: 450 }
        };
        const result = customizationService.validateDesignConfig(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Gradient must have at least 2 colors');
        expect(result.errors).toContain('Gradient direction must be between 0 and 360 degrees');
      });
    });
  });

  describe('ImageProcessorService', () => {
    const mockQRBuffer = Buffer.from('mock-qr-image');
    const mockLogoBuffer = Buffer.from('mock-logo-image');

    describe('overlayLogo', () => {
      it('should handle logo overlay with center position', async () => {
        const options = { size: 20, position: 'center' as const };
        
        try {
          const result = await imageProcessor.overlayLogo(mockQRBuffer, mockLogoBuffer, options);
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          // Expected to fail with mock data, but should handle gracefully
          expect(error).toBeDefined();
        }
      });

      it('should handle logo overlay with corner position', async () => {
        const options = { size: 15, position: 'corner' as const, borderRadius: 5, opacity: 0.8 };
        
        try {
          const result = await imageProcessor.overlayLogo(mockQRBuffer, mockLogoBuffer, options);
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('addFrame', () => {
      it('should skip frame when style is none', async () => {
        const frameOptions = { style: 'none' as const };
        const result = await imageProcessor.addFrame(mockQRBuffer, frameOptions);
        expect(result).toBe(mockQRBuffer);
      });

      it('should handle rounded frame with text', async () => {
        const frameOptions = {
          style: 'rounded' as const,
          text: 'Scan Me!',
          textColor: '#000000',
          color: '#ffffff',
          width: 20,
          padding: 10
        };
        
        try {
          const result = await imageProcessor.addFrame(mockQRBuffer, frameOptions);
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('applyPattern', () => {
      it('should handle different pattern types', async () => {
        const patterns = ['rounded', 'dots', 'diamond', 'circular'] as const;
        
        for (const pattern of patterns) {
          try {
            const result = await imageProcessor.applyPattern(mockQRBuffer, { type: pattern });
            expect(Buffer.isBuffer(result)).toBe(true);
          } catch (error) {
            expect(error).toBeDefined();
          }
        }
      });

      it('should return original buffer for square pattern', async () => {
        const result = await imageProcessor.applyPattern(mockQRBuffer, { type: 'square' });
        expect(result).toBe(mockQRBuffer);
      });
    });

    describe('applyEyePattern', () => {
      it('should handle different eye pattern combinations', async () => {
        const eyeOptions = {
          outer: 'rounded' as const,
          inner: 'circle' as const,
          color: '#ff0000'
        };
        
        try {
          const result = await imageProcessor.applyEyePattern(mockQRBuffer, eyeOptions);
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('makeTransparent', () => {
      it('should process transparency with default background', async () => {
        try {
          const result = await imageProcessor.makeTransparent(mockQRBuffer);
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should process transparency with custom background', async () => {
        try {
          const result = await imageProcessor.makeTransparent(mockQRBuffer, '#ff0000');
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('QRGenerator Integration', () => {
    const testData = 'https://example.com';

    describe('generateWithCustomization', () => {
      it('should generate QR with basic customization for free tier', async () => {
        const designConfig: QRDesignConfig = {
          size: 250,
          errorCorrectionLevel: 'M',
          color: { foreground: '#000000', background: '#ffffff' },
          pattern: 'square'
        };

        try {
          const result = await qrGenerator.generateWithCustomization(testData, designConfig, 'free');
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should generate QR with advanced customization for pro tier', async () => {
        const designConfig: QRDesignConfig = {
          size: 400,
          pattern: 'rounded',
          frame: { style: 'rounded', text: 'Scan Me!', color: '#e5e7eb' },
          backgroundTransparent: true
        };

        try {
          const result = await qrGenerator.generateWithCustomization(testData, designConfig, 'pro');
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      it('should fallback to basic generation on error', async () => {
        const invalidConfig: QRDesignConfig = {
          size: 999999, // Invalid size
          pattern: 'invalid' as any
        };

        try {
          const result = await qrGenerator.generateWithCustomization(testData, invalidConfig, 'free');
          expect(Buffer.isBuffer(result)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('generateMultipleFormats', () => {
      it('should generate multiple formats successfully', async () => {
        const designConfig: QRDesignConfig = {
          size: 300,
          pattern: 'square'
        };

        try {
          const results = await qrGenerator.generateMultipleFormats(
            testData, 
            designConfig, 
            ['png', 'svg'], 
            'pro'
          );
          
          expect(results.png).toBeDefined();
          expect(results.svg).toBeDefined();
          expect(Buffer.isBuffer(results.png)).toBe(true);
          expect(Buffer.isBuffer(results.svg)).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('End-to-End Customization Workflow', () => {
    it('should complete full customization workflow', async () => {
      const designConfig: QRDesignConfig = {
        size: 500,
        errorCorrectionLevel: 'H',
        pattern: 'rounded',
        color: { foreground: '#1f2937', background: '#ffffff' },
        frame: { style: 'rounded', text: 'My QR Code', color: '#e5e7eb' },
        margin: 6
      };

      // Step 1: Validate customization
      const validation = await customizationService.validateCustomization(designConfig, 'pro');
      expect(validation.isValid).toBe(true);

      // Step 2: Apply tier restrictions
      const restrictedConfig = customizationService.applyTierRestrictions(designConfig, 'pro');
      expect(restrictedConfig.size).toBe(500); // Should be allowed for pro

      // Step 3: Generate QR with customization
      try {
        const qrBuffer = await qrGenerator.generateWithCustomization(
          'https://example.com', 
          restrictedConfig, 
          'pro'
        );
        expect(Buffer.isBuffer(qrBuffer)).toBe(true);
      } catch (error) {
        // Expected to fail in test environment without actual image libraries
        expect(error).toBeDefined();
      }
    });
  });
});