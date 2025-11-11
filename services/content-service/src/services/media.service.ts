import { ContentMedia } from '../types/content.types';
import * as path from 'path';
import * as fs from 'fs/promises';
import sharp from 'sharp';

export interface ImageProcessingOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

export interface ImageProcessingResult {
    metadata: {
        width: number;
        height: number;
        format: string;
    };
    thumbnails: Array<{
        size: string;
        buffer: Buffer;
        width: number;
        height: number;
    }>;
}

export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
}

export class MediaService {
    private readonly uploadPath: string;
    private readonly allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    private readonly allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov'];
    private readonly allowedDocumentTypes = ['application/pdf', 'text/plain'];
    private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
    private logger = console;

    constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../../uploads');
    this.ensureUploadDirectory();
  }

  validateFile(file: Express.Multer.File): FileValidationResult {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedTypes = [
      ...this.allowedImageTypes,
      ...this.allowedVideoTypes,
      ...this.allowedDocumentTypes
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push('File type not allowed');
    }

    // Additional validation for specific types
    if (file.mimetype.startsWith('image/')) {
      if (file.size < 1024) {
        errors.push('Image file appears to be corrupted or too small');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  sanitizeFilename(filename: string): string {
    // Remove dangerous characters and ensure unique filename
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const timestamp = Date.now();
    return `${sanitized}-${timestamp}${ext}`;
  }

    async processImage(file: Express.Multer.File, options?: ImageProcessingOptions): Promise<{
        processed: Buffer;
        metadata: any;
        thumbnails: {
            size: string;
            buffer: Buffer;
            width: number;
            height: number;
        }[];
    }> {
        try {
            // Process the image with Sharp
            let processor = sharp(file.buffer);
            
            // Apply resizing if specified
            if (options?.maxWidth || options?.maxHeight) {
                processor = processor.resize(options.maxWidth, options.maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }
            
            // Apply quality settings
            if (options?.quality) {
                processor = processor.jpeg({ quality: options.quality });
            }
            
            // Process the main image
            const processed = await processor.toBuffer();
            const metadata = await sharp(processed).metadata();
            
            // Generate thumbnails
            const thumbnails = await this.generateThumbnails(processed);
            
            return {
                processed,
                metadata,
                thumbnails
            };
        } catch (error) {
            this.logger.error('Image processing failed:', error);
            throw new Error('Failed to process image');
        }
    }  async saveFile(buffer: Buffer, filename: string): Promise<string> {
    const filePath = path.join(this.uploadPath, filename);
    await fs.writeFile(filePath, buffer);
    return path.relative(process.cwd(), filePath);
  }

  getFileUrl(filePath: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3011';
    return `${baseUrl}/uploads/${path.basename(filePath)}`;
  }

    async deleteFile(filePath: string): Promise<boolean> {
        try {
            await fs.unlink(path.join(this.uploadPath, filePath));
            return true;
        } catch (error) {
            this.logger.error('Failed to delete file:', error);
            return false;
        }
    }  async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  getMediaType(mimeType: string): 'image' | 'video' | 'document' | 'other' {
    if (this.allowedImageTypes.includes(mimeType)) {
      return 'image';
    }
    if (this.allowedVideoTypes.includes(mimeType)) {
      return 'video';
    }
    if (this.allowedDocumentTypes.includes(mimeType)) {
      return 'document';
    }
    return 'other';
  }

  async optimizeImage(buffer: Buffer, options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<Buffer> {
    // Mock implementation - in real app would use sharp
    return buffer;
  }

  generateThumbnailSizes(): Array<{ name: string; width: number; height: number }> {
    return [
      { name: 'thumb', width: 150, height: 150 },
      { name: 'small', width: 300, height: 200 },
      { name: 'medium', width: 600, height: 400 },
      { name: 'large', width: 1200, height: 800 }
    ];
  }

  async generateThumbnails(imageBuffer: Buffer): Promise<Array<{
    size: string;
    buffer: Buffer;
    width: number;
    height: number;
  }>> {
    // Mock implementation - in real app would use sharp or similar
    const sizes = this.generateThumbnailSizes();
    
    return sizes.map(size => ({
      size: size.name,
      buffer: imageBuffer, // In real implementation, this would be resized
      width: size.width,
      height: size.height
    }));
  }
}