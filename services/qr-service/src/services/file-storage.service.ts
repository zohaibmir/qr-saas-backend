import { ILogger } from '../interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IFileStorageService {
  saveQRImage(qrCodeId: string, imageBuffer: Buffer, format: string): Promise<string>;
  deleteQRImage(imagePath: string): Promise<void>;
  getImagePath(qrCodeId: string, format: string): string;
  imageExists(qrCodeId: string, format: string): Promise<boolean>;
  getFullPath(qrCodeId: string, format: string): string;
}

export class FileStorageService implements IFileStorageService {
  private uploadDir: string;

  constructor(private logger: ILogger) {
    this.uploadDir = process.env.QR_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'qr-images');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      this.logger.info('Creating upload directory', { uploadDir: this.uploadDir });
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveQRImage(qrCodeId: string, imageBuffer: Buffer, format: string = 'png'): Promise<string> {
    try {
      // Ensure upload directory exists before saving
      await this.ensureUploadDir();
      
      const filename = `${qrCodeId}.${format}`;
      const filePath = path.join(this.uploadDir, filename);
      
      await fs.writeFile(filePath, imageBuffer);
      
      // Return the URL path that can be served by the web server
      const imageUrl = `/uploads/qr-images/${filename}`;
      
      this.logger.info('QR image saved', { 
        qrCodeId, 
        filePath,
        imageUrl,
        size: imageBuffer.length 
      });

      return imageUrl;
    } catch (error) {
      this.logger.error('Failed to save QR image', { 
        qrCodeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to save QR image');
    }
  }

  async deleteQRImage(imagePath: string): Promise<void> {
    try {
      // Extract filename from URL path
      const filename = path.basename(imagePath);
      const filePath = path.join(this.uploadDir, filename);
      
      // Check if file exists before attempting to delete
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        this.logger.info('QR image deleted', { filePath });
      } catch (error) {
        // File doesn't exist, which is fine
        this.logger.warn('QR image file not found during deletion', { filePath });
      }
    } catch (error) {
      this.logger.error('Failed to delete QR image', { 
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error for deletion failures to avoid breaking other operations
    }
  }

  getImagePath(qrCodeId: string, format: string = 'png'): string {
    return `/uploads/qr-images/${qrCodeId}.${format}`;
  }

  // Method to generate multiple sizes of the same QR code
  async saveQRImageMultipleSizes(
    qrCodeId: string, 
    imageBuffer: Buffer, 
    format: string = 'png'
  ): Promise<{ [size: string]: string }> {
    const urls: { [size: string]: string } = {};
    
    // Save the original size (assume it's 512px)
    const originalUrl = await this.saveQRImage(qrCodeId, imageBuffer, format);
    urls['original'] = originalUrl;

    // For now, we'll just save one size and generate others dynamically
    // In the future, we could generate multiple sizes here:
    // - 200px for thumbnails
    // - 512px for downloads
    // - 1024px for high-res

    return urls;
  }

  // Method to get full file system path (for internal use)
  getFullPath(qrCodeId: string, format: string = 'png'): string {
    return path.join(this.uploadDir, `${qrCodeId}.${format}`);
  }

  // Check if image file exists
  async imageExists(qrCodeId: string, format: string = 'png'): Promise<boolean> {
    try {
      const filePath = this.getFullPath(qrCodeId, format);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get image file stats
  async getImageStats(qrCodeId: string, format: string = 'png'): Promise<{ size: number; mtime: Date } | null> {
    try {
      const filePath = this.getFullPath(qrCodeId, format);
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch {
      return null;
    }
  }
}