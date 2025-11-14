import { 
  IQRCustomizationService,
  QRDesignConfig,
  CustomizationValidationResult,
  CustomizationLimits,
  ILogger
} from '../interfaces';

export class QRCustomizationService implements IQRCustomizationService {
  constructor(private logger: ILogger) {}

  async validateCustomization(designConfig: QRDesignConfig, subscriptionTier: string): Promise<CustomizationValidationResult> {
    const limits = this.getCustomizationLimits(subscriptionTier);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (designConfig.size && designConfig.size > limits.maxSize) {
      errors.push(`QR code size cannot exceed ${limits.maxSize}px for ${subscriptionTier} tier`);
    }

    if (designConfig.logo && !limits.allowLogo) {
      errors.push(`Logo integration not available for ${subscriptionTier} tier. Upgrade to Pro or higher.`);
    }

    if (designConfig.frame && designConfig.frame.style !== 'none' && !limits.allowFrames) {
      errors.push(`Frame designs not available for ${subscriptionTier} tier. Upgrade to Pro or higher.`);
    }

    if (designConfig.pattern && !limits.allowPatterns.includes(designConfig.pattern)) {
      errors.push(`Pattern '${designConfig.pattern}' not available for ${subscriptionTier} tier`);
    }

    if (designConfig.eyePattern && !limits.allowEyePatterns) {
      errors.push(`Eye pattern customization not available for ${subscriptionTier} tier. Upgrade to Business or higher.`);
    }

    if (designConfig.backgroundTransparent && !limits.allowTransparency) {
      errors.push(`Transparent backgrounds not available for ${subscriptionTier} tier. Upgrade to Pro or higher.`);
    }

    if (designConfig.gradient && !limits.allowGradients) {
      errors.push(`Gradient colors not available for ${subscriptionTier} tier. Upgrade to Business or higher.`);
    }

    if ((designConfig.shadow || designConfig.backgroundImage) && !limits.allowEffects) {
      errors.push(`Advanced effects not available for ${subscriptionTier} tier. Upgrade to Enterprise.`);
    }

    if (subscriptionTier === 'free' && this.hasAdvancedFeatures(designConfig)) {
      warnings.push('Consider upgrading to unlock advanced customization features');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getCustomizationLimits(subscriptionTier: string): CustomizationLimits {
    const limits: Record<string, CustomizationLimits> = {
      free: {
        maxSize: 300,
        allowLogo: false,
        allowFrames: false,
        allowPatterns: ['square'],
        allowEyePatterns: false,
        allowTransparency: false,
        allowGradients: false,
        allowEffects: false
      },
      starter: {
        maxSize: 400,
        allowLogo: true,
        allowFrames: false,
        allowPatterns: ['square', 'rounded'],
        allowEyePatterns: false,
        allowTransparency: false,
        allowGradients: false,
        allowEffects: false
      },
      pro: {
        maxSize: 500,
        allowLogo: true,
        allowFrames: true,
        allowPatterns: ['square', 'rounded', 'dots'],
        allowEyePatterns: false,
        allowTransparency: true,
        allowGradients: false,
        allowEffects: false
      },
      business: {
        maxSize: 800,
        allowLogo: true,
        allowFrames: true,
        allowPatterns: ['square', 'rounded', 'dots', 'diamond', 'circular'],
        allowEyePatterns: true,
        allowTransparency: true,
        allowGradients: true,
        allowEffects: false
      },
      enterprise: {
        maxSize: 1200,
        allowLogo: true,
        allowFrames: true,
        allowPatterns: ['square', 'rounded', 'dots', 'diamond', 'circular'],
        allowEyePatterns: true,
        allowTransparency: true,
        allowGradients: true,
        allowEffects: true
      }
    };

    return limits[subscriptionTier] || limits.free;
  }

  applyTierRestrictions(designConfig: QRDesignConfig, subscriptionTier: string): QRDesignConfig {
    const limits = this.getCustomizationLimits(subscriptionTier);
    const restrictedConfig: QRDesignConfig = { ...designConfig };

    if (restrictedConfig.size && restrictedConfig.size > limits.maxSize) {
      restrictedConfig.size = limits.maxSize;
      this.logger.warn(`Size reduced to ${limits.maxSize}px for ${subscriptionTier} tier`);
    }

    if (!limits.allowLogo) {
      delete restrictedConfig.logo;
      this.logger.warn(`Logo removed for ${subscriptionTier} tier`);
    }

    if (!limits.allowFrames && restrictedConfig.frame) {
      restrictedConfig.frame = { style: 'none' };
      this.logger.warn(`Frame removed for ${subscriptionTier} tier`);
    }

    if (restrictedConfig.pattern && !limits.allowPatterns.includes(restrictedConfig.pattern)) {
      restrictedConfig.pattern = 'square';
      this.logger.warn(`Pattern changed to 'square' for ${subscriptionTier} tier`);
    }

    if (!limits.allowEyePatterns) {
      delete restrictedConfig.eyePattern;
      this.logger.warn(`Eye pattern removed for ${subscriptionTier} tier`);
    }

    if (!limits.allowTransparency) {
      restrictedConfig.backgroundTransparent = false;
      this.logger.warn(`Transparency disabled for ${subscriptionTier} tier`);
    }

    if (!limits.allowGradients) {
      delete restrictedConfig.gradient;
      this.logger.warn(`Gradient removed for ${subscriptionTier} tier`);
    }

    if (!limits.allowEffects) {
      delete restrictedConfig.shadow;
      delete restrictedConfig.backgroundImage;
      this.logger.warn(`Advanced effects removed for ${subscriptionTier} tier`);
    }

    return restrictedConfig;
  }

  private hasAdvancedFeatures(designConfig: QRDesignConfig): boolean {
    return !!(
      designConfig.logo ||
      (designConfig.frame && designConfig.frame.style !== 'none') ||
      (designConfig.pattern && designConfig.pattern !== 'square') ||
      designConfig.eyePattern ||
      designConfig.backgroundTransparent ||
      designConfig.gradient ||
      designConfig.shadow ||
      designConfig.backgroundImage
    );
  }

  validateDesignConfig(designConfig: QRDesignConfig): CustomizationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (designConfig.size && (designConfig.size < 100 || designConfig.size > 1200)) {
      errors.push('QR code size must be between 100 and 1200 pixels');
    }

    if (designConfig.logo) {
      if (designConfig.logo.size && (designConfig.logo.size < 5 || designConfig.logo.size > 50)) {
        errors.push('Logo size must be between 5% and 50% of QR code size');
      }
      
      if (designConfig.logo.opacity && (designConfig.logo.opacity < 0.1 || designConfig.logo.opacity > 1)) {
        errors.push('Logo opacity must be between 0.1 and 1.0');
      }
    }

    if (designConfig.gradient) {
      if (!designConfig.gradient.colors || designConfig.gradient.colors.length < 2) {
        errors.push('Gradient must have at least 2 colors');
      }
      
      if (designConfig.gradient.direction && (designConfig.gradient.direction < 0 || designConfig.gradient.direction > 360)) {
        errors.push('Gradient direction must be between 0 and 360 degrees');
      }
    }

    if (designConfig.frame && designConfig.frame.width && designConfig.frame.width > 50) {
      warnings.push('Large frame widths may affect QR code readability');
    }

    if (designConfig.quality && (designConfig.quality < 10 || designConfig.quality > 100)) {
      errors.push('Quality must be between 10 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getRecommendedSettings(qrType: string, subscriptionTier: string): Partial<QRDesignConfig> {
    const baseSettings: Partial<QRDesignConfig> = {
      size: 300,
      errorCorrectionLevel: 'M',
      margin: 4,
      color: {
        foreground: '#000000',
        background: '#FFFFFF'
      }
    };

    const tierEnhancements: Record<string, Partial<QRDesignConfig>> = {
      pro: {
        size: 400,
        pattern: 'rounded',
        frame: {
          style: 'rounded',
          width: 10,
          padding: 5
        }
      },
      business: {
        size: 500,
        pattern: 'rounded',
        eyePattern: {
          outer: 'rounded',
          inner: 'circle'
        },
        gradient: {
          type: 'linear',
          colors: ['#667eea', '#764ba2'],
          direction: 45
        }
      },
      enterprise: {
        size: 600,
        pattern: 'circular',
        eyePattern: {
          outer: 'circle',
          inner: 'diamond'
        },
        shadow: {
          color: '#00000020',
          blur: 10,
          offsetX: 5,
          offsetY: 5
        }
      }
    };

    return {
      ...baseSettings,
      ...(tierEnhancements[subscriptionTier] || {})
    };
  }
}