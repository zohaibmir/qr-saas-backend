import { Request, Response, NextFunction } from 'express';
import { HeatmapService } from '../services/heatmap.service';
import { Logger } from '../services/logger.service';
import { AppError } from '../interfaces';

/**
 * Heatmap Controller
 * 
 * Handles HTTP requests for heatmap analytics
 * - Geographic heatmap generation
 * - Time-based heatmap analytics
 * - Device and browser heatmaps
 */
export class HeatmapController {
  constructor(
    private heatmapService: HeatmapService,
    private logger: Logger
  ) {}

  /**
   * Get geographic heatmap data
   * GET /heatmap/geographic
   */
  getGeographicHeatmap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeId, startDate, endDate, granularity, includeMetadata, minIntensity, maxIntensity, colorScheme } = req.query;
      
      if (!qrCodeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QR_CODE_ID',
            message: 'QR Code ID is required',
            statusCode: 400
          }
        });
        return;
      }
      
      const options = {
        timeRange: {
          startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate ? new Date(endDate as string) : new Date()
        },
        granularity: (granularity as 'hour' | 'day' | 'week' | 'month') || 'day',
        includeMetadata: includeMetadata === 'true',
        minIntensity: minIntensity ? parseFloat(minIntensity as string) : undefined,
        maxIntensity: maxIntensity ? parseFloat(maxIntensity as string) : undefined,
        colorScheme: (colorScheme as any) || 'viridis'
      };
      
      const result = await this.heatmapService.generateGeographicHeatmap(qrCodeId as string, options);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'GEOGRAPHIC_HEATMAP_FAILED');
    }
  };

  /**
   * Get temporal heatmap data
   * GET /heatmap/temporal
   */
  getTemporalHeatmap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeId, startDate, endDate, granularity, includeMetadata } = req.query;
      
      if (!qrCodeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QR_CODE_ID',
            message: 'QR Code ID is required',
            statusCode: 400
          }
        });
        return;
      }
      
      const options = {
        timeRange: {
          startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: endDate ? new Date(endDate as string) : new Date()
        },
        granularity: (granularity as 'hour' | 'day' | 'week' | 'month') || 'hour',
        includeMetadata: includeMetadata === 'true'
      };
      
      const result = await this.heatmapService.generateTemporalHeatmap(qrCodeId as string, options);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'TEMPORAL_HEATMAP_FAILED');
    }
  };

  /**
   * Get device heatmap data
   * GET /heatmap/device
   */
  getDeviceHeatmap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeId, startDate, endDate, granularity, includeMetadata } = req.query;
      
      if (!qrCodeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QR_CODE_ID',
            message: 'QR Code ID is required',
            statusCode: 400
          }
        });
        return;
      }
      
      const options = {
        timeRange: {
          startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate ? new Date(endDate as string) : new Date()
        },
        granularity: (granularity as 'hour' | 'day' | 'week' | 'month') || 'day',
        includeMetadata: includeMetadata === 'true'
      };
      
      const result = await this.heatmapService.generateDeviceHeatmap(qrCodeId as string, options);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'DEVICE_HEATMAP_FAILED');
    }
  };

  private handleControllerError(
    error: any,
    res: Response,
    next: NextFunction,
    defaultCode: string
  ): void {
    this.logger.error('Heatmap controller error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      code: defaultCode 
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: defaultCode,
          message: 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
}

/**
 * Factory function to create heatmap controller with dependencies
 */
export const createHeatmapController = (
  heatmapService: HeatmapService,
  logger: Logger
): HeatmapController => {
  return new HeatmapController(heatmapService, logger);
};