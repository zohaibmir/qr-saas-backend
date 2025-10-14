import QRCode from 'qrcode';
import { 
  IQRGenerator, 
  QRGenerationOptions, 
  ImageFormat,
  QRDesignConfig,
  IImageProcessor,
  IQRCustomizationService,
  ILogger
} from '../interfaces';
import { ImageProcessorService } from '../services/image-processor.service';
import { QRCustomizationService } from '../services/qr-customization.service';
import { Logger } from '../services/logger.service';

export class QRGenerator implements IQRGenerator {
  private imageProcessor: IImageProcessor;
  private customizationService: IQRCustomizationService;
  private logger: ILogger;

  constructor() {
    this.logger = new Logger();
    this.imageProcessor = new ImageProcessorService(this.logger);
    this.customizationService = new QRCustomizationService(this.logger);
  }

  async generate(
    data: string, 
    options?: QRGenerationOptions, 
    format: ImageFormat = 'png'
  ): Promise<Buffer> {
    try {
      const qrOptions: QRCode.QRCodeToBufferOptions = {
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
        type: 'png',
        width: options?.width || 200,
        margin: options?.margin || 4,
        color: {
          dark: options?.color?.dark || '#000000',
          light: options?.color?.light || '#FFFFFF'
        }
      };

      if (format === 'svg') {
        const svgString = await QRCode.toString(data, { 
          ...qrOptions, 
          type: 'svg' 
        });
        return Buffer.from(svgString, 'utf8');
      }

      return await QRCode.toBuffer(data, qrOptions);

    } catch (error) {
      this.logger.error('QR code generation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: data.substring(0, 100) 
      });
      throw error;
    }
  }

  async generateWithLogo(
    data: string,
    options?: QRGenerationOptions,
    logoBuffer?: Buffer
  ): Promise<Buffer> {
    const qrBuffer = await this.generate(data, options, 'png');
    
    if (!logoBuffer) {
      return qrBuffer;
    }

    return await this.imageProcessor.overlayLogo(qrBuffer, logoBuffer, {
      size: 20, // 20% of QR code size
      position: 'center'
    });
  }

  async generateWithCustomization(
    data: string,
    designConfig: QRDesignConfig,
    subscriptionTier: string = 'free',
    logoBuffer?: Buffer
  ): Promise<Buffer> {
    try {
      // Validate and apply tier restrictions
      const validatedConfig = this.customizationService.applyTierRestrictions(
        designConfig, 
        subscriptionTier
      );

      // Generate base QR code
      const baseOptions: QRGenerationOptions = {
        errorCorrectionLevel: validatedConfig.errorCorrectionLevel || 'M',
        width: validatedConfig.size || 300,
        margin: validatedConfig.margin || 4,
        color: {
          dark: validatedConfig.color?.foreground || '#000000',
          light: validatedConfig.backgroundTransparent ? 'transparent' : (validatedConfig.color?.background || '#FFFFFF')
        },
        rendererOpts: {
          quality: validatedConfig.quality || 85
        }
      };

      let qrBuffer = await this.generate(data, baseOptions, validatedConfig.format || 'png');

      // Apply pattern modifications
      if (validatedConfig.pattern && validatedConfig.pattern !== 'square') {
        qrBuffer = await this.imageProcessor.applyPattern(qrBuffer, {
          type: validatedConfig.pattern,
          cornerRadius: validatedConfig.cornerRadius
        });
      }

      // Apply eye pattern customization
      if (validatedConfig.eyePattern) {
        qrBuffer = await this.imageProcessor.applyEyePattern(qrBuffer, validatedConfig.eyePattern);
      }

      // Apply logo overlay
      if (validatedConfig.logo && logoBuffer) {
        qrBuffer = await this.imageProcessor.overlayLogo(qrBuffer, logoBuffer, {
          size: validatedConfig.logo.size || 20,
          position: validatedConfig.logo.position || 'center',
          borderRadius: validatedConfig.logo.borderRadius,
          opacity: validatedConfig.logo.opacity
        });
      }

      // Apply frame
      if (validatedConfig.frame && validatedConfig.frame.style !== 'none') {
        qrBuffer = await this.imageProcessor.addFrame(qrBuffer, validatedConfig.frame);
      }

      // Apply advanced effects
      if (validatedConfig.gradient || validatedConfig.shadow || 
          (validatedConfig.backgroundImage && validatedConfig.backgroundImage.buffer)) {
        qrBuffer = await this.imageProcessor.applyEffects(qrBuffer, {
          gradient: validatedConfig.gradient,
          shadow: validatedConfig.shadow,
          backgroundImage: validatedConfig.backgroundImage?.buffer ? {
            buffer: validatedConfig.backgroundImage.buffer,
            opacity: validatedConfig.backgroundImage.opacity,
            blend: validatedConfig.backgroundImage.blend
          } : undefined
        });
      }

      // Apply transparency if requested
      if (validatedConfig.backgroundTransparent) {
        qrBuffer = await this.imageProcessor.makeTransparent(qrBuffer, validatedConfig.color?.background);
      }

      return qrBuffer;

    } catch (error) {
      this.logger.error('Custom QR generation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        subscriptionTier 
      });
      
      // Fallback to basic QR generation
      return await this.generate(data, {
        width: designConfig.size || 300,
        errorCorrectionLevel: designConfig.errorCorrectionLevel || 'M'
      });
    }
  }

  async generateMultipleFormats(
    data: string,
    designConfig: QRDesignConfig,
    formats: ImageFormat[] = ['png'],
    subscriptionTier: string = 'free',
    logoBuffer?: Buffer
  ): Promise<{ [format: string]: Buffer }> {
    const results: { [format: string]: Buffer } = {};

    for (const format of formats) {
      try {
        const configForFormat = { ...designConfig, format };
        results[format] = await this.generateWithCustomization(
          data, 
          configForFormat, 
          subscriptionTier, 
          logoBuffer
        );
      } catch (error) {
        this.logger.error(`Failed to generate ${format} format`, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        // Fallback to basic generation for this format
        results[format] = await this.generate(data, { width: designConfig.size }, format);
      }
    }

    return results;
  }
}