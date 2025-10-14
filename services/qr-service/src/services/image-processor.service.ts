import sharp from 'sharp';
import { 
  IImageProcessor,
  LogoOverlayOptions,
  FrameOptions,
  PatternOptions,
  EyePatternOptions,
  EffectOptions,
  ILogger
} from '../interfaces';

export class ImageProcessorService implements IImageProcessor {
  constructor(private logger: ILogger) {}

  async overlayLogo(qrBuffer: Buffer, logoBuffer: Buffer, options: LogoOverlayOptions): Promise<Buffer> {
    try {
      const qrImage = sharp(qrBuffer);
      const { width, height } = await qrImage.metadata();
      
      if (!width || !height) {
        throw new Error('Invalid QR code image dimensions');
      }

      const logoSize = Math.floor((width * options.size) / 100);
      
      let processedLogo: sharp.Sharp = sharp(logoBuffer)
        .resize(logoSize, logoSize, { fit: 'contain' });

      if (options.borderRadius) {
        const mask = Buffer.from(
          `<svg><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="${options.borderRadius}" ry="${options.borderRadius}"/></svg>`
        );
        processedLogo = processedLogo.composite([{ input: mask, blend: 'dest-in' }]);
      }

      if (options.opacity && options.opacity < 1) {
        processedLogo = processedLogo.png({ quality: Math.floor(options.opacity * 100) });
      }

      const processedLogoBuffer: Buffer = await processedLogo.png().toBuffer();

      let left: number, top: number;
      
      if (options.position === 'center') {
        left = Math.floor((width - logoSize) / 2);
        top = Math.floor((height - logoSize) / 2);
      } else {
        left = width - logoSize - 10;
        top = 10;
      }

      return await qrImage
        .composite([{
          input: processedLogoBuffer,
          left,
          top,
          blend: 'over'
        }])
        .png()
        .toBuffer();

    } catch (error) {
      this.logger.error('Logo overlay failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async addFrame(imageBuffer: Buffer, frameOptions: FrameOptions): Promise<Buffer> {
    try {
      if (frameOptions.style === 'none') {
        return imageBuffer;
      }

      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();
      
      if (!width || !height) {
        throw new Error('Invalid image dimensions');
      }

      const frameWidth = frameOptions.width || 20;
      const padding = frameOptions.padding || 10;
      const newWidth = width + (2 * frameWidth);
      const newHeight = height + (2 * frameWidth) + (frameOptions.text ? 40 : 0);

      const frameColor = frameOptions.color || '#FFFFFF';
      const textColor = frameOptions.textColor || '#000000';

      let frameSvg = `
        <svg width="${newWidth}" height="${newHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${newWidth}" height="${newHeight}" fill="${frameColor}"`;

      if (frameOptions.style === 'rounded') {
        frameSvg += ` rx="15" ry="15"`;
      } else if (frameOptions.style === 'circle') {
        frameSvg += ` rx="${Math.min(newWidth, newHeight) / 2}" ry="${Math.min(newWidth, newHeight) / 2}"`;
      }

      frameSvg += `/>\n`;

      if (frameOptions.text) {
        const textY = newHeight - 15;
        frameSvg += `
          <text x="${newWidth / 2}" y="${textY}" 
                text-anchor="middle" 
                fill="${textColor}" 
                font-family="Arial, sans-serif" 
                font-size="14" 
                font-weight="bold">${frameOptions.text}</text>
        `;
      }

      frameSvg += `</svg>`;

      const frameBuffer = Buffer.from(frameSvg);
      
      return await sharp(frameBuffer)
        .composite([{
          input: imageBuffer,
          left: frameWidth,
          top: frameWidth,
          blend: 'over'
        }])
        .png()
        .toBuffer();

    } catch (error) {
      this.logger.error('Frame addition failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async applyPattern(qrBuffer: Buffer, pattern: PatternOptions): Promise<Buffer> {
    try {
      const image = sharp(qrBuffer);
      
      switch (pattern.type) {
        case 'rounded':
          return await this.applyRoundedPattern(image, pattern.cornerRadius || 3);
        case 'dots':
          return await this.applyDotPattern(image);
        case 'diamond':
          return await this.applyDiamondPattern(image);
        case 'circular':
          return await this.applyCircularPattern(image);
        default:
          return qrBuffer;
      }
    } catch (error) {
      this.logger.error('Pattern application failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return qrBuffer;
    }
  }

  async applyEyePattern(qrBuffer: Buffer, eyeOptions: EyePatternOptions): Promise<Buffer> {
    try {
      const image = sharp(qrBuffer);
      const { width, height } = await image.metadata();
      
      if (!width || !height) {
        return qrBuffer;
      }

      const eyeSize = Math.floor(width / 7);
      const eyeColor = eyeOptions.color || '#000000';

      const eyeSvg = this.generateEyeSvg(eyeOptions, eyeSize, eyeColor);
      const eyeBuffer = Buffer.from(eyeSvg);

      const positions = [
        { left: 0, top: 0 },
        { left: width - eyeSize, top: 0 },
        { left: 0, top: height - eyeSize }
      ];

      let result = image;
      
      for (const pos of positions) {
        result = result.composite([{
          input: eyeBuffer,
          left: pos.left,
          top: pos.top,
          blend: 'over'
        }]);
      }

      return await result.png().toBuffer();

    } catch (error) {
      this.logger.error('Eye pattern application failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return qrBuffer;
    }
  }

  async makeTransparent(imageBuffer: Buffer, backgroundColor = '#FFFFFF'): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .png({ 
          compressionLevel: 9,
          adaptiveFiltering: false,
          force: false
        })
        .toBuffer();
    } catch (error) {
      this.logger.error('Transparency application failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async applyEffects(imageBuffer: Buffer, effects: EffectOptions): Promise<Buffer> {
    try {
      let result = sharp(imageBuffer);

      if (effects.gradient) {
        result = await this.applyGradient(result, effects.gradient);
      }

      if (effects.shadow) {
        result = await this.applyShadow(result, effects.shadow);
      }

      if (effects.backgroundImage) {
        result = await this.applyBackgroundImage(result, effects.backgroundImage);
      }

      return await result.png().toBuffer();

    } catch (error) {
      this.logger.error('Effects application failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private async applyRoundedPattern(image: sharp.Sharp, radius: number): Promise<Buffer> {
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      return await image.png().toBuffer();
    }

    const mask = Buffer.from(
      `<svg width="${width}" height="${height}">
        <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
       </svg>`
    );

    return await image
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  private async applyDotPattern(image: sharp.Sharp): Promise<Buffer> {
    return await image.png().toBuffer();
  }

  private async applyDiamondPattern(image: sharp.Sharp): Promise<Buffer> {
    return await image.png().toBuffer();
  }

  private async applyCircularPattern(image: sharp.Sharp): Promise<Buffer> {
    const { width, height } = await image.metadata();
    
    if (!width || !height) {
      return await image.png().toBuffer();
    }

    const radius = Math.min(width, height) / 2;
    const mask = Buffer.from(
      `<svg width="${width}" height="${height}">
        <circle cx="${width/2}" cy="${height/2}" r="${radius}" fill="white"/>
       </svg>`
    );

    return await image
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  private generateEyeSvg(eyeOptions: EyePatternOptions, size: number, color: string): string {
    const outerSize = size;
    const innerSize = size * 0.6;
    const center = size / 2;
    const innerCenter = center;

    let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;

    svg += this.generateShapeElement(eyeOptions.outer, center, center, outerSize / 2, color, false);
    svg += this.generateShapeElement(eyeOptions.inner, innerCenter, innerCenter, innerSize / 2, color, true);

    svg += `</svg>`;
    return svg;
  }

  private generateShapeElement(
    shape: 'square' | 'rounded' | 'circle' | 'diamond',
    x: number,
    y: number,
    size: number,
    color: string,
    filled: boolean
  ): string {
    const fillColor = filled ? color : 'none';
    const strokeColor = filled ? 'none' : color;
    const strokeWidth = filled ? 0 : 2;

    switch (shape) {
      case 'circle':
        return `<circle cx="${x}" cy="${y}" r="${size}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      
      case 'rounded':
        const rectSize = size * 2;
        const radius = size * 0.3;
        return `<rect x="${x - size}" y="${y - size}" width="${rectSize}" height="${rectSize}" rx="${radius}" ry="${radius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      
      case 'diamond':
        const points = `${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`;
        return `<polygon points="${points}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
      
      default: // square
        const squareSize = size * 2;
        return `<rect x="${x - size}" y="${y - size}" width="${squareSize}" height="${squareSize}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
    }
  }

  private async applyGradient(image: sharp.Sharp, gradient: any): Promise<sharp.Sharp> {
    return image;
  }

  private async applyShadow(image: sharp.Sharp, shadow: any): Promise<sharp.Sharp> {
    return image;
  }

  private async applyBackgroundImage(image: sharp.Sharp, backgroundImage: any): Promise<sharp.Sharp> {
    return image;
  }
}