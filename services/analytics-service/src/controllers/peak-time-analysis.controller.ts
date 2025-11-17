import { Request, Response, NextFunction } from 'express';
import { PeakTimeAnalysisService } from '../services/peak-time-analysis.service';
import { Logger } from '../services/logger.service';
import { AppError } from '../interfaces';

/**
 * Peak Time Analysis Controller
 * 
 * Handles HTTP requests for peak time analysis
 * - Peak usage time analysis
 * - Optimal posting time recommendations
 * - Time-based performance metrics
 */
export class PeakTimeAnalysisController {
  constructor(
    private peakTimeService: PeakTimeAnalysisService,
    private logger: Logger
  ) {}

  /**
   * Get peak time analysis
   * GET /peak-time/analysis
   */
  getPeakTimeAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeId, startDate, endDate } = req.query;
      const timeRange = (startDate && endDate) ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : undefined;
      
      const result = await this.peakTimeService.analyzePeakTimes(
        qrCodeId as string,
        timeRange
      );
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'PEAK_TIME_ANALYSIS_FAILED');
    }
  };

  /**
   * Get optimal posting times
   * GET /peak-time/optimal
   */
  getOptimalTimes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeId } = req.query;
      // Use the same method as it provides optimal time insights
      const result = await this.peakTimeService.analyzePeakTimes(qrCodeId as string);
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'OPTIMAL_TIMES_FAILED');
    }
  };

  /**
   * Get hourly activity patterns
   * GET /peak-time/hourly
   */
  getHourlyActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { qrCodeId, date } = req.query;
      const timeRange = date ? {
        startDate: new Date(date as string),
        endDate: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000) // Add 24 hours
      } : undefined;
      
      const result = await this.peakTimeService.analyzePeakTimes(
        qrCodeId as string,
        timeRange
      );
      const statusCode = result.success ? 200 : (result.error?.statusCode || 500);
      res.status(statusCode).json(result);
    } catch (error) {
      this.handleControllerError(error, res, next, 'HOURLY_ACTIVITY_FAILED');
    }
  };

  private handleControllerError(
    error: any,
    res: Response,
    next: NextFunction,
    defaultCode: string
  ): void {
    this.logger.error('Peak time analysis controller error', { 
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
 * Factory function to create peak time analysis controller with dependencies
 */
export const createPeakTimeAnalysisController = (
  peakTimeService: PeakTimeAnalysisService,
  logger: Logger
): PeakTimeAnalysisController => {
  return new PeakTimeAnalysisController(peakTimeService, logger);
};