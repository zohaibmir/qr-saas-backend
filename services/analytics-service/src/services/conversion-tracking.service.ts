import { 
  IConversionTrackingService,
  ConversionGoal,
  ConversionEvent,
  ConversionFunnel,
  ConversionAnalytics,
  IAnalyticsRepository,
  ILogger,
  ServiceResponse,
  ValidationError,
  AppError,
  NotFoundError
} from '../interfaces';
import moment from 'moment-timezone';

export class ConversionTrackingService implements IConversionTrackingService {
  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {}

  async createGoal(
    goalData: Omit<ConversionGoal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServiceResponse<ConversionGoal>> {
    try {
      if (!goalData.qrCodeId || !goalData.name || !goalData.type) {
        throw new ValidationError('QR Code ID, name, and type are required');
      }

      const goal: ConversionGoal = {
        id: this.generateId(),
        ...goalData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store goal in database (simulated for now)
      await this.storeConversionGoal(goal);

      this.logger.info('Conversion goal created', { 
        goalId: goal.id,
        qrCodeId: goal.qrCodeId,
        type: goal.type
      });

      return {
        success: true,
        data: goal,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to create conversion goal', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId: goalData.qrCodeId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'GOAL_CREATION_FAILED',
          message: 'Failed to create conversion goal',
          statusCode: 500
        }
      };
    }
  }

  async trackConversion(
    eventData: Omit<ConversionEvent, 'id' | 'createdAt'>
  ): Promise<ServiceResponse<ConversionEvent>> {
    try {
      if (!eventData.goalId || !eventData.scanEventId || !eventData.qrCodeId) {
        throw new ValidationError('Goal ID, scan event ID, and QR Code ID are required');
      }

      const conversionEvent: ConversionEvent = {
        id: this.generateId(),
        ...eventData,
        createdAt: new Date()
      };

      // Store conversion event in database (simulated for now)
      await this.storeConversionEvent(conversionEvent);

      this.logger.info('Conversion tracked', { 
        conversionId: conversionEvent.id,
        goalId: conversionEvent.goalId,
        qrCodeId: conversionEvent.qrCodeId,
        timeToConversion: conversionEvent.timeToConversion
      });

      return {
        success: true,
        data: conversionEvent,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to track conversion', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        goalId: eventData.goalId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CONVERSION_TRACKING_FAILED',
          message: 'Failed to track conversion',
          statusCode: 500
        }
      };
    }
  }

  async getConversionFunnel(
    goalId: string,
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<ServiceResponse<ConversionFunnel>> {
    try {
      if (!goalId) {
        throw new ValidationError('Goal ID is required');
      }

      const defaultTimeRange = {
        startDate: timeRange?.startDate || moment().subtract(30, 'days').toDate(),
        endDate: timeRange?.endDate || new Date()
      };

      // Get goal information
      const goal = await this.getConversionGoalById(goalId);
      if (!goal) {
        throw new NotFoundError('Conversion goal not found');
      }

      // Get conversion events and scan events
      const conversionEvents = await this.getConversionEventsByGoal(goalId, defaultTimeRange);
      const scanEvents = await this.analyticsRepository.getScanEventsByQRCode(
        goal.qrCodeId,
        defaultTimeRange.startDate,
        defaultTimeRange.endDate
      );

      const funnel = await this.buildConversionFunnel(goal, scanEvents, conversionEvents);

      this.logger.info('Conversion funnel generated', { 
        goalId,
        totalScans: scanEvents.length,
        totalConversions: conversionEvents.length,
        conversionRate: funnel.overallConversionRate
      });

      return {
        success: true,
        data: funnel,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to get conversion funnel', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        goalId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'FUNNEL_ANALYSIS_FAILED',
          message: 'Failed to analyze conversion funnel',
          statusCode: 500
        }
      };
    }
  }

  async getConversionAnalytics(
    qrCodeId: string,
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<ServiceResponse<ConversionAnalytics>> {
    try {
      if (!qrCodeId) {
        throw new ValidationError('QR Code ID is required');
      }

      const defaultTimeRange = {
        startDate: timeRange?.startDate || moment().subtract(30, 'days').toDate(),
        endDate: timeRange?.endDate || new Date()
      };

      // Get all goals for this QR code
      const goals = await this.getConversionGoalsByQRCode(qrCodeId);
      
      // Get all conversion events for this QR code
      const allConversions = await this.getConversionEventsByQRCode(qrCodeId, defaultTimeRange);
      
      // Get total scans for conversion rate calculation
      const totalScans = await this.analyticsRepository.getTotalScansForQRCode(qrCodeId);

      const analytics = await this.buildConversionAnalytics(
        goals,
        allConversions,
        totalScans,
        defaultTimeRange
      );

      this.logger.info('Conversion analytics generated', { 
        qrCodeId,
        totalConversions: analytics.totalConversions,
        conversionRate: analytics.conversionRate,
        goalsCount: goals.length
      });

      return {
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to get conversion analytics', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'CONVERSION_ANALYTICS_FAILED',
          message: 'Failed to get conversion analytics',
          statusCode: 500
        }
      };
    }
  }

  private async buildConversionFunnel(
    goal: ConversionGoal,
    scanEvents: any[],
    conversionEvents: ConversionEvent[]
  ): Promise<ConversionFunnel> {
    const totalScans = scanEvents.length;
    const totalConversions = conversionEvents.length;

    // Build funnel stages
    const stages = [
      {
        stage: 'QR Code Scan',
        count: totalScans,
        conversionRate: 100,
        dropOffRate: 0
      },
      {
        stage: 'Initial Interest',
        count: Math.floor(totalScans * 0.8), // Simulated engagement
        conversionRate: 80,
        dropOffRate: 20
      },
      {
        stage: 'Goal Completion',
        count: totalConversions,
        conversionRate: totalScans > 0 ? (totalConversions / totalScans) * 100 : 0,
        dropOffRate: totalScans > 0 ? ((totalScans - totalConversions) / totalScans) * 100 : 0
      }
    ];

    // Calculate average time to conversion
    const averageTimeToConversion = conversionEvents.length > 0 
      ? conversionEvents.reduce((sum, event) => sum + event.timeToConversion, 0) / conversionEvents.length
      : 0;

    // Analyze top converting segments
    const topConvertingSegments = await this.analyzeConvertingSegments(conversionEvents, scanEvents);

    return {
      goalId: goal.id,
      goalName: goal.name,
      stages,
      totalConversions,
      overallConversionRate: totalScans > 0 ? (totalConversions / totalScans) * 100 : 0,
      averageTimeToConversion,
      topConvertingSegments
    };
  }

  private async buildConversionAnalytics(
    goals: ConversionGoal[],
    conversions: ConversionEvent[],
    totalScans: number,
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<ConversionAnalytics> {
    const totalConversions = conversions.length;
    const conversionRate = totalScans > 0 ? (totalConversions / totalScans) * 100 : 0;

    // Calculate average time to conversion
    const averageTimeToConversion = conversions.length > 0
      ? conversions.reduce((sum, event) => sum + event.timeToConversion, 0) / conversions.length
      : 0;

    // Group conversions by goal
    const conversionsByGoal = goals.map(goal => {
      const goalConversions = conversions.filter(c => c.goalId === goal.id);
      return {
        goalId: goal.id,
        goalName: goal.name,
        conversions: goalConversions.length,
        conversionRate: totalScans > 0 ? (goalConversions.length / totalScans) * 100 : 0
      };
    });

    // Generate conversion trends (daily breakdown)
    const conversionTrends = await this.generateConversionTrends(conversions, timeRange);

    // Analyze top converting segments
    const topConvertingSegments = await this.analyzeConvertingSegments(conversions, []);

    return {
      totalConversions,
      conversionRate,
      averageTimeToConversion,
      conversionsByGoal,
      conversionTrends,
      topConvertingSegments
    };
  }

  private async analyzeConvertingSegments(
    conversions: ConversionEvent[],
    scanEvents: any[]
  ): Promise<Array<{ segment: string; conversionRate: number; count: number }>> {
    // This is a simplified implementation
    // In a real scenario, you'd analyze various segments like device types, countries, etc.
    
    const segments = [
      {
        segment: 'Mobile Users',
        count: Math.floor(conversions.length * 0.6),
        conversionRate: 15.2
      },
      {
        segment: 'Desktop Users',
        count: Math.floor(conversions.length * 0.4),
        conversionRate: 12.8
      },
      {
        segment: 'Business Hours',
        count: Math.floor(conversions.length * 0.7),
        conversionRate: 18.5
      }
    ];

    return segments.sort((a, b) => b.conversionRate - a.conversionRate);
  }

  private async generateConversionTrends(
    conversions: ConversionEvent[],
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<Array<{ date: string; conversions: number; conversionRate: number }>> {
    const trends: Array<{ date: string; conversions: number; conversionRate: number }> = [];
    const startDate = moment(timeRange.startDate);
    const endDate = moment(timeRange.endDate);

    // Generate daily trends
    for (let date = startDate.clone(); date.isSameOrBefore(endDate); date.add(1, 'day')) {
      const dayStart = date.clone().startOf('day').toDate();
      const dayEnd = date.clone().endOf('day').toDate();
      
      const dayConversions = conversions.filter(c => 
        c.createdAt >= dayStart && c.createdAt <= dayEnd
      ).length;

      trends.push({
        date: date.format('YYYY-MM-DD'),
        conversions: dayConversions,
        conversionRate: dayConversions > 0 ? (dayConversions / conversions.length) * 100 : 0
      });
    }

    return trends;
  }

  // Database interaction methods (simulated)
  private async storeConversionGoal(goal: ConversionGoal): Promise<void> {
    // In a real implementation, this would save to the database
    this.logger.debug('Storing conversion goal', { goalId: goal.id });
  }

  private async storeConversionEvent(event: ConversionEvent): Promise<void> {
    // In a real implementation, this would save to the database
    this.logger.debug('Storing conversion event', { eventId: event.id });
  }

  private async getConversionGoalById(goalId: string): Promise<ConversionGoal | null> {
    // Simulated goal retrieval
    return {
      id: goalId,
      qrCodeId: 'sample-qr-id',
      name: 'Sample Goal',
      type: 'url_visit',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async getConversionGoalsByQRCode(qrCodeId: string): Promise<ConversionGoal[]> {
    // Simulated goals retrieval
    return [
      {
        id: 'goal-1',
        qrCodeId,
        name: 'Website Visit',
        type: 'url_visit',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private async getConversionEventsByGoal(
    goalId: string,
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<ConversionEvent[]> {
    // Simulated conversion events
    return [];
  }

  private async getConversionEventsByQRCode(
    qrCodeId: string,
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<ConversionEvent[]> {
    // Simulated conversion events
    return [];
  }

  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}