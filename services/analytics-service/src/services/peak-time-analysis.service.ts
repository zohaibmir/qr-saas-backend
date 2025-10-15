import { 
  IPeakTimeAnalysisService,
  PeakTimeAnalysis,
  IAnalyticsRepository,
  ILogger,
  ServiceResponse,
  ValidationError,
  AppError
} from '../interfaces';
import moment from 'moment-timezone';

export class PeakTimeAnalysisService implements IPeakTimeAnalysisService {
  private readonly businessHoursStart = 9;
  private readonly businessHoursEnd = 17;
  private readonly weekendDays = [0, 6]; // Sunday and Saturday

  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {}

  async analyzePeakTimes(
    qrCodeId: string, 
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<ServiceResponse<PeakTimeAnalysis>> {
    try {
      if (!qrCodeId) {
        throw new ValidationError('QR Code ID is required');
      }

      const defaultTimeRange = {
        startDate: timeRange?.startDate || moment().subtract(30, 'days').toDate(),
        endDate: timeRange?.endDate || new Date()
      };

      this.logger.info('Starting peak time analysis', { 
        qrCodeId, 
        timeRange: defaultTimeRange 
      });

      const scanEvents = await this.analyticsRepository.getScanEventsByQRCode(
        qrCodeId, 
        defaultTimeRange.startDate, 
        defaultTimeRange.endDate
      );

      if (scanEvents.length === 0) {
        return {
          success: true,
          data: this.getEmptyAnalysis(),
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        };
      }

      const analysis = await this.performTimeAnalysis(scanEvents);
      const recommendations = await this.generateTimeRecommendations(analysis);

      const result: PeakTimeAnalysis = {
        ...analysis,
        recommendations
      };

      this.logger.info('Peak time analysis completed', { 
        qrCodeId,
        totalScans: scanEvents.length,
        peakHoursCount: result.peakHours.length
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to analyze peak times', { 
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
          code: 'PEAK_TIME_ANALYSIS_FAILED',
          message: 'Failed to analyze peak times',
          statusCode: 500
        }
      };
    }
  }

  async generateTimeRecommendations(
    analysis: Omit<PeakTimeAnalysis, 'recommendations'>
  ): Promise<Array<{ type: 'timing' | 'promotion' | 'optimization'; message: string; impact: 'high' | 'medium' | 'low' }>> {
    const recommendations: Array<{ type: 'timing' | 'promotion' | 'optimization'; message: string; impact: 'high' | 'medium' | 'low' }> = [];

    // Analyze hourly patterns for timing recommendations
    const topHours = analysis.hourlyDistribution
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 3);

    const businessHourScans = analysis.hourlyDistribution
      .filter(h => h.isBusinessHour)
      .reduce((sum, h) => sum + h.scans, 0);

    const afterHourScans = analysis.hourlyDistribution
      .filter(h => !h.isBusinessHour)
      .reduce((sum, h) => sum + h.scans, 0);

    // Business hours vs after hours recommendations
    if (afterHourScans > businessHourScans * 0.6) {
      recommendations.push({
        type: 'timing',
        message: 'Significant after-hours activity detected. Consider extending customer support or automated responses during evening hours.',
        impact: 'high'
      });
    }

    // Peak hour optimization
    if (topHours.length > 0) {
      const peakHour = topHours[0];
      recommendations.push({
        type: 'optimization',
        message: `Peak activity occurs at ${peakHour.hour}:00. Consider scheduling promotions or content updates during this time for maximum impact.`,
        impact: 'high'
      });
    }

    // Weekend vs weekday analysis
    const weekendScans = analysis.dailyDistribution
      .filter(d => d.isWeekend)
      .reduce((sum, d) => sum + d.scans, 0);

    const weekdayScans = analysis.dailyDistribution
      .filter(d => !d.isWeekend)
      .reduce((sum, d) => sum + d.scans, 0);

    if (weekendScans > weekdayScans * 0.4) {
      recommendations.push({
        type: 'promotion',
        message: 'Strong weekend engagement detected. Consider weekend-specific campaigns or promotions.',
        impact: 'medium'
      });
    }

    // Seasonal trend recommendations
    const growthTrends = analysis.seasonalTrends
      .filter(trend => Math.abs(trend.growthRate) > 0.1);

    if (growthTrends.length > 0) {
      const strongestTrend = growthTrends
        .sort((a, b) => Math.abs(b.growthRate) - Math.abs(a.growthRate))[0];

      const trendDirection = strongestTrend.growthRate > 0 ? 'increasing' : 'decreasing';
      recommendations.push({
        type: 'optimization',
        message: `${strongestTrend.monthName} shows ${trendDirection} trend (${(strongestTrend.growthRate * 100).toFixed(1)}%). Plan seasonal campaigns accordingly.`,
        impact: 'medium'
      });
    }

    // Low activity period recommendations
    const lowActivityHours = analysis.hourlyDistribution
      .filter(h => h.percentage < 2)
      .map(h => h.hour);

    if (lowActivityHours.length > 6) {
      recommendations.push({
        type: 'optimization',
        message: 'Extended low-activity periods identified. Consider maintenance windows or targeted re-engagement campaigns during these hours.',
        impact: 'low'
      });
    }

    return recommendations;
  }

  private async performTimeAnalysis(scanEvents: any[]): Promise<Omit<PeakTimeAnalysis, 'recommendations'>> {
    const totalScans = scanEvents.length;

    // Hourly distribution analysis
    const hourlyDistribution = this.analyzeHourlyDistribution(scanEvents, totalScans);
    
    // Daily distribution analysis
    const dailyDistribution = this.analyzeDailyDistribution(scanEvents, totalScans);
    
    // Seasonal trends analysis
    const seasonalTrends = this.analyzeSeasonalTrends(scanEvents, totalScans);
    
    // Peak hours identification
    const peakHours = this.identifyPeakHours(hourlyDistribution);

    return {
      hourlyDistribution,
      dailyDistribution,
      seasonalTrends,
      peakHours
    };
  }

  private analyzeHourlyDistribution(scanEvents: any[], totalScans: number) {
    const hourCounts = new Array(24).fill(0);
    
    scanEvents.forEach(event => {
      const hour = moment(event.timestamp).hour();
      hourCounts[hour]++;
    });

    return hourCounts.map((count, hour) => ({
      hour,
      scans: count,
      percentage: totalScans > 0 ? (count / totalScans) * 100 : 0,
      isBusinessHour: hour >= this.businessHoursStart && hour < this.businessHoursEnd
    }));
  }

  private analyzeDailyDistribution(scanEvents: any[], totalScans: number) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    
    scanEvents.forEach(event => {
      const dayOfWeek = moment(event.timestamp).day();
      dayCounts[dayOfWeek]++;
    });

    return dayCounts.map((count, dayOfWeek) => ({
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      scans: count,
      percentage: totalScans > 0 ? (count / totalScans) * 100 : 0,
      isWeekend: this.weekendDays.includes(dayOfWeek)
    }));
  }

  private analyzeSeasonalTrends(scanEvents: any[], totalScans: number) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthCounts = new Array(12).fill(0);
    const currentMonth = moment().month();
    
    scanEvents.forEach(event => {
      const month = moment(event.timestamp).month();
      monthCounts[month]++;
    });

    return monthCounts.map((count, month) => {
      const percentage = totalScans > 0 ? (count / totalScans) * 100 : 0;
      const previousMonthIndex = month === 0 ? 11 : month - 1;
      const previousMonthCount = monthCounts[previousMonthIndex];
      
      let growthRate = 0;
      if (previousMonthCount > 0) {
        growthRate = (count - previousMonthCount) / previousMonthCount;
      }

      return {
        month,
        monthName: monthNames[month],
        scans: count,
        percentage,
        growthRate
      };
    });
  }

  private identifyPeakHours(hourlyDistribution: any[]) {
    const averageScans = hourlyDistribution.reduce((sum, h) => sum + h.scans, 0) / 24;
    const threshold = averageScans * 1.5; // 50% above average

    return hourlyDistribution
      .filter(h => h.scans >= threshold)
      .map(h => ({
        hour: h.hour,
        scans: h.scans,
        efficiency: h.scans / averageScans
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
  }

  private getEmptyAnalysis(): PeakTimeAnalysis {
    return {
      hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        scans: 0,
        percentage: 0,
        isBusinessHour: hour >= this.businessHoursStart && hour < this.businessHoursEnd
      })),
      dailyDistribution: [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
      ].map((dayName, dayOfWeek) => ({
        dayOfWeek,
        dayName,
        scans: 0,
        percentage: 0,
        isWeekend: this.weekendDays.includes(dayOfWeek)
      })),
      seasonalTrends: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ].map((monthName, month) => ({
        month,
        monthName,
        scans: 0,
        percentage: 0,
        growthRate: 0
      })),
      peakHours: [],
      recommendations: []
    };
  }
}