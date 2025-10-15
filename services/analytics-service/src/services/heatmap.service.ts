import { 
  IHeatmapService,
  HeatmapData,
  GeographicHeatmap,
  TemporalHeatmap,
  HeatmapOptions,
  IAnalyticsRepository,
  ILogger,
  ServiceResponse,
  ValidationError,
  AppError
} from '../interfaces';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import * as d3 from 'd3';
import moment from 'moment-timezone';

export class HeatmapService implements IHeatmapService {
  private readonly countryCoordinates: Record<string, { lat: number; lng: number; name: string }> = {
    // Major Global Countries
    'US': { lat: 39.8283, lng: -98.5795, name: 'United States' },
    'CN': { lat: 35.8617, lng: 104.1954, name: 'China' },
    'IN': { lat: 20.5937, lng: 78.9629, name: 'India' },
    'BR': { lat: -14.2350, lng: -51.9253, name: 'Brazil' },
    'RU': { lat: 61.5240, lng: 105.3188, name: 'Russia' },
    'JP': { lat: 36.2048, lng: 138.2529, name: 'Japan' },
    'CA': { lat: 56.1304, lng: -106.3468, name: 'Canada' },
    'AU': { lat: -25.2744, lng: 133.7751, name: 'Australia' },
    
    // Nordic/Scandic Countries (Primary Focus)
    'SE': { lat: 60.1282, lng: 18.6435, name: 'Sweden' },
    'NO': { lat: 60.4720, lng: 8.4689, name: 'Norway' },
    'DK': { lat: 56.2639, lng: 9.5018, name: 'Denmark' },
    'FI': { lat: 61.9241, lng: 25.7482, name: 'Finland' },
    'IS': { lat: 64.9631, lng: -19.0208, name: 'Iceland' },
    
    // Extended Nordic Region
    'EE': { lat: 58.5953, lng: 25.0136, name: 'Estonia' },
    'LV': { lat: 56.8796, lng: 24.6032, name: 'Latvia' },
    'LT': { lat: 55.1694, lng: 23.8813, name: 'Lithuania' },
    'FO': { lat: 61.8926, lng: -6.9118, name: 'Faroe Islands' },
    'GL': { lat: 71.7069, lng: -42.6043, name: 'Greenland' },
    'AX': { lat: 60.1785, lng: 19.9156, name: 'Åland Islands' },
    'SJ': { lat: 77.5536, lng: 23.6703, name: 'Svalbard' },
    
    // Major European Countries
    'DE': { lat: 51.1657, lng: 10.4515, name: 'Germany' },
    'UK': { lat: 55.3781, lng: -3.4360, name: 'United Kingdom' },
    'FR': { lat: 46.2276, lng: 2.2137, name: 'France' },
    'IT': { lat: 41.8719, lng: 12.5674, name: 'Italy' },
    'ES': { lat: 40.4637, lng: -3.7492, name: 'Spain' },
    'PL': { lat: 51.9194, lng: 19.1451, name: 'Poland' },
    'NL': { lat: 52.1326, lng: 5.2913, name: 'Netherlands' },
    'BE': { lat: 50.5039, lng: 4.4699, name: 'Belgium' },
    'CH': { lat: 46.8182, lng: 8.2275, name: 'Switzerland' },
    'AT': { lat: 47.5162, lng: 14.5501, name: 'Austria' },
    'CZ': { lat: 49.8175, lng: 15.4730, name: 'Czech Republic' },
    'HU': { lat: 47.1625, lng: 19.5033, name: 'Hungary' },
    'RO': { lat: 45.9432, lng: 24.9668, name: 'Romania' },
    'BG': { lat: 42.7339, lng: 25.4858, name: 'Bulgaria' },
    'GR': { lat: 39.0742, lng: 21.8243, name: 'Greece' },
    'PT': { lat: 39.3999, lng: -8.2245, name: 'Portugal' },
    'IE': { lat: 53.4129, lng: -8.2439, name: 'Ireland' },
    'HR': { lat: 45.1000, lng: 15.2000, name: 'Croatia' },
    'SI': { lat: 46.1512, lng: 14.9955, name: 'Slovenia' },
    'SK': { lat: 48.6690, lng: 19.6990, name: 'Slovakia' },
    'MK': { lat: 41.6086, lng: 21.7453, name: 'North Macedonia' },
    'AL': { lat: 41.1533, lng: 20.1683, name: 'Albania' },
    'BA': { lat: 43.9159, lng: 17.6791, name: 'Bosnia and Herzegovina' },
    'RS': { lat: 44.0165, lng: 21.0059, name: 'Serbia' },
    'ME': { lat: 42.7087, lng: 19.3744, name: 'Montenegro' },
    'XK': { lat: 42.6026, lng: 20.9030, name: 'Kosovo' },
    
    // Asia-Pacific (Expandable)
    'KR': { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
    'SG': { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
    'MY': { lat: 4.2105, lng: 101.9758, name: 'Malaysia' },
    'TH': { lat: 15.8700, lng: 100.9925, name: 'Thailand' },
    'VN': { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
    'PH': { lat: 12.8797, lng: 121.7740, name: 'Philippines' },
    'ID': { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
    'NZ': { lat: -40.9006, lng: 174.8860, name: 'New Zealand' },
    
    // Africa (Future Expansion)
    'ZA': { lat: -30.5595, lng: 22.9375, name: 'South Africa' },
    'EG': { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
    'NG': { lat: 9.0820, lng: 8.6753, name: 'Nigeria' },
    'KE': { lat: -0.0236, lng: 37.9062, name: 'Kenya' },
    
    // Americas (Future Expansion)
    'MX': { lat: 23.6345, lng: -102.5528, name: 'Mexico' },
    'AR': { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
    'CL': { lat: -35.6751, lng: -71.5430, name: 'Chile' },
    'CO': { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
    'PE': { lat: -9.1900, lng: -75.0152, name: 'Peru' },
    
    // Middle East (Future Expansion)
    'AE': { lat: 23.4241, lng: 53.8478, name: 'United Arab Emirates' },
    'SA': { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
    'IL': { lat: 31.0461, lng: 34.8516, name: 'Israel' },
    'TR': { lat: 38.9637, lng: 35.2433, name: 'Turkey' }
  };

  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger
  ) {}

  async generateGeographicHeatmap(
    qrCodeId: string,
    options: HeatmapOptions
  ): Promise<ServiceResponse<GeographicHeatmap>> {
    try {
      this.validateHeatmapOptions(options);

      this.logger.info('Generating geographic heatmap', { 
        qrCodeId,
        timeRange: options.timeRange
      });

      // Get scan events for the specified time range
      const scanEvents = await this.analyticsRepository.getScanEventsByQRCode(
        qrCodeId,
        options.timeRange.startDate,
        options.timeRange.endDate
      );

      if (scanEvents.length === 0) {
        return {
          success: true,
          data: this.createEmptyGeographicHeatmap(qrCodeId, options.timeRange),
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        };
      }

      // Process geographic data
      const countryData = await this.processGeographicData(scanEvents);
      const dataPoints = await this.generateGeographicDataPoints(countryData);
      const bounds = this.calculateGeographicBounds(dataPoints);

      const heatmap: GeographicHeatmap = {
        id: this.generateHeatmapId(),
        type: 'geographic',
        qrCodeId,
        dataPoints,
        maxValue: Math.max(...dataPoints.map(p => p.value)),
        minValue: Math.min(...dataPoints.map(p => p.value)),
        averageValue: dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length,
        generatedAt: new Date(),
        timeRange: options.timeRange,
        bounds,
        zoomLevel: this.calculateOptimalZoomLevel(dataPoints),
        countryData: countryData.map(country => ({
          countryCode: country.code,
          countryName: country.name,
          intensity: this.calculateIntensity(country.scans, scanEvents.length),
          scans: country.scans
        }))
      };

      this.logger.info('Geographic heatmap generated', { 
        qrCodeId,
        dataPointsCount: dataPoints.length,
        countriesCount: countryData.length
      });

      return {
        success: true,
        data: heatmap,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate geographic heatmap', { 
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
          code: 'GEOGRAPHIC_HEATMAP_FAILED',
          message: 'Failed to generate geographic heatmap',
          statusCode: 500
        }
      };
    }
  }

  async generateTemporalHeatmap(
    qrCodeId: string,
    options: HeatmapOptions
  ): Promise<ServiceResponse<TemporalHeatmap>> {
    try {
      this.validateHeatmapOptions(options);

      this.logger.info('Generating temporal heatmap', { 
        qrCodeId,
        granularity: options.granularity
      });

      const scanEvents = await this.analyticsRepository.getScanEventsByQRCode(
        qrCodeId,
        options.timeRange.startDate,
        options.timeRange.endDate
      );

      if (scanEvents.length === 0) {
        return {
          success: true,
          data: this.createEmptyTemporalHeatmap(qrCodeId, options),
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        };
      }

      const dataPoints = await this.generateTemporalDataPoints(scanEvents, options.granularity);
      const patternAnalysis = await this.analyzeTemporalPatterns(dataPoints, options.granularity);

      const heatmap: TemporalHeatmap = {
        id: this.generateHeatmapId(),
        type: 'temporal',
        qrCodeId,
        dataPoints,
        maxValue: Math.max(...dataPoints.map(p => p.value)),
        minValue: Math.min(...dataPoints.map(p => p.value)),
        averageValue: dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length,
        generatedAt: new Date(),
        timeRange: options.timeRange,
        timeGranularity: options.granularity,
        patternAnalysis
      };

      this.logger.info('Temporal heatmap generated', { 
        qrCodeId,
        dataPointsCount: dataPoints.length,
        granularity: options.granularity
      });

      return {
        success: true,
        data: heatmap,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate temporal heatmap', { 
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
          code: 'TEMPORAL_HEATMAP_FAILED',
          message: 'Failed to generate temporal heatmap',
          statusCode: 500
        }
      };
    }
  }

  async generateDeviceHeatmap(
    qrCodeId: string,
    options: HeatmapOptions
  ): Promise<ServiceResponse<HeatmapData>> {
    try {
      this.validateHeatmapOptions(options);

      this.logger.info('Generating device heatmap', { qrCodeId });

      const scanEvents = await this.analyticsRepository.getScanEventsByQRCode(
        qrCodeId,
        options.timeRange.startDate,
        options.timeRange.endDate
      );

      if (scanEvents.length === 0) {
        return {
          success: true,
          data: this.createEmptyDeviceHeatmap(qrCodeId, options.timeRange),
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        };
      }

      const dataPoints = await this.generateDeviceDataPoints(scanEvents);

      const heatmap: HeatmapData = {
        id: this.generateHeatmapId(),
        type: 'device',
        qrCodeId,
        dataPoints,
        maxValue: Math.max(...dataPoints.map(p => p.value)),
        minValue: Math.min(...dataPoints.map(p => p.value)),
        averageValue: dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length,
        generatedAt: new Date(),
        timeRange: options.timeRange
      };

      this.logger.info('Device heatmap generated', { 
        qrCodeId,
        dataPointsCount: dataPoints.length
      });

      return {
        success: true,
        data: heatmap,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate device heatmap', { 
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
          code: 'DEVICE_HEATMAP_FAILED',
          message: 'Failed to generate device heatmap',
          statusCode: 500
        }
      };
    }
  }

  async generateHeatmapImage(
    heatmapData: HeatmapData,
    format: 'png' | 'svg'
  ): Promise<ServiceResponse<Buffer>> {
    try {
      this.logger.info('Generating heatmap image', { 
        heatmapId: heatmapData.id,
        format,
        type: heatmapData.type
      });

      let imageBuffer: Buffer;

      switch (heatmapData.type) {
        case 'geographic':
          imageBuffer = await this.generateGeographicHeatmapImage(heatmapData as GeographicHeatmap, format);
          break;
        case 'temporal':
          imageBuffer = await this.generateTemporalHeatmapImage(heatmapData as TemporalHeatmap, format);
          break;
        case 'device':
          imageBuffer = await this.generateDeviceHeatmapImage(heatmapData, format);
          break;
        default:
          imageBuffer = await this.generateGenericHeatmapImage(heatmapData, format);
      }

      this.logger.info('Heatmap image generated', { 
        heatmapId: heatmapData.id,
        format,
        imageSize: imageBuffer.length
      });

      return {
        success: true,
        data: imageBuffer,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to generate heatmap image', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        heatmapId: heatmapData.id
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
          code: 'HEATMAP_IMAGE_FAILED',
          message: 'Failed to generate heatmap image',
          statusCode: 500
        }
      };
    }
  }

  // Private helper methods
  private validateHeatmapOptions(options: HeatmapOptions): void {
    if (!options.timeRange || !options.timeRange.startDate || !options.timeRange.endDate) {
      throw new ValidationError('Time range is required');
    }

    if (options.timeRange.startDate > options.timeRange.endDate) {
      throw new ValidationError('Start date cannot be after end date');
    }

    if (!['hour', 'day', 'week', 'month'].includes(options.granularity)) {
      throw new ValidationError('Invalid granularity specified');
    }
  }

  private async processGeographicData(scanEvents: any[]): Promise<Array<{ code: string; name: string; scans: number }>> {
    const countryStats: Record<string, { name: string; scans: number }> = {};

    scanEvents.forEach(event => {
      const country = event.country || 'Unknown';
      const countryCode = this.getCountryCode(country);
      
      if (!countryStats[countryCode]) {
        countryStats[countryCode] = { name: country, scans: 0 };
      }
      countryStats[countryCode].scans++;
    });

    return Object.entries(countryStats).map(([code, data]) => ({
      code,
      name: data.name,
      scans: data.scans
    }));
  }

  private async generateGeographicDataPoints(
    countryData: Array<{ code: string; name: string; scans: number }>
  ): Promise<Array<{ x: number; y: number; value: number; intensity: number; metadata?: Record<string, any> }>> {
    const maxScans = Math.max(...countryData.map(c => c.scans));

    return countryData.map(country => {
      const coords = this.countryCoordinates[country.code] || { lat: 0, lng: 0 };
      return {
        x: this.longitudeToX(coords.lng),
        y: this.latitudeToY(coords.lat),
        value: country.scans,
        intensity: country.scans / maxScans,
        metadata: {
          countryCode: country.code,
          countryName: country.name,
          coordinates: coords
        }
      };
    });
  }

  private async generateTemporalDataPoints(
    scanEvents: any[],
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Promise<Array<{ x: number; y: number; value: number; intensity: number; metadata?: Record<string, any> }>> {
    const timeGroups: Record<string, number> = {};

    scanEvents.forEach(event => {
      const timestamp = moment(event.timestamp);
      let timeKey: string;

      switch (granularity) {
        case 'hour':
          timeKey = `${timestamp.hour()}`;
          break;
        case 'day':
          timeKey = timestamp.format('YYYY-MM-DD');
          break;
        case 'week':
          timeKey = timestamp.format('YYYY-[W]WW');
          break;
        case 'month':
          timeKey = timestamp.format('YYYY-MM');
          break;
        default:
          timeKey = timestamp.format('YYYY-MM-DD');
      }

      timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
    });

    const maxValue = Math.max(...Object.values(timeGroups));
    const entries = Object.entries(timeGroups);

    return entries.map(([timeKey, count], index) => ({
      x: index * (800 / entries.length), // Spread across 800px width
      y: this.calculateTemporalY(timeKey, granularity),
      value: count,
      intensity: count / maxValue,
      metadata: {
        timeKey,
        granularity,
        timestamp: this.parseTimeKey(timeKey, granularity)
      }
    }));
  }

  private async generateDeviceDataPoints(
    scanEvents: any[]
  ): Promise<Array<{ x: number; y: number; value: number; intensity: number; metadata?: Record<string, any> }>> {
    const deviceStats: Record<string, number> = {};
    const platformStats: Record<string, number> = {};

    scanEvents.forEach(event => {
      const device = event.device || 'Unknown';
      const platform = event.platform || 'Unknown';
      
      deviceStats[device] = (deviceStats[device] || 0) + 1;
      platformStats[platform] = (platformStats[platform] || 0) + 1;
    });

    const maxValue = Math.max(...Object.values(deviceStats), ...Object.values(platformStats));
    const dataPoints: Array<{ x: number; y: number; value: number; intensity: number; metadata?: Record<string, any> }> = [];

    // Add device data points
    Object.entries(deviceStats).forEach(([device, count], index) => {
      dataPoints.push({
        x: index * 100, // Space devices horizontally
        y: 100, // Devices on top row
        value: count,
        intensity: count / maxValue,
        metadata: {
          type: 'device',
          name: device
        }
      });
    });

    // Add platform data points
    Object.entries(platformStats).forEach(([platform, count], index) => {
      dataPoints.push({
        x: index * 100, // Space platforms horizontally
        y: 200, // Platforms on bottom row
        value: count,
        intensity: count / maxValue,
        metadata: {
          type: 'platform',
          name: platform
        }
      });
    });

    return dataPoints;
  }

  private async analyzeTemporalPatterns(
    dataPoints: Array<{ x: number; y: number; value: number; intensity: number; metadata?: Record<string, any> }>,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Promise<{
    strongestPeriods: Array<{ period: string; intensity: number }>;
    weakestPeriods: Array<{ period: string; intensity: number }>;
    cyclicalPatterns: Array<{ pattern: string; confidence: number }>;
  }> {
    const sortedByIntensity = [...dataPoints].sort((a, b) => b.intensity - a.intensity);
    
    const strongestPeriods = sortedByIntensity.slice(0, 3).map(point => ({
      period: point.metadata?.timeKey || 'Unknown',
      intensity: point.intensity
    }));

    const weakestPeriods = sortedByIntensity.slice(-3).map(point => ({
      period: point.metadata?.timeKey || 'Unknown',
      intensity: point.intensity
    }));

    // Simple cyclical pattern detection
    const cyclicalPatterns = await this.detectCyclicalPatterns(dataPoints, granularity);

    return {
      strongestPeriods,
      weakestPeriods,
      cyclicalPatterns
    };
  }

  private async detectCyclicalPatterns(
    dataPoints: Array<{ x: number; y: number; value: number; intensity: number; metadata?: Record<string, any> }>,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Promise<Array<{ pattern: string; confidence: number }>> {
    const patterns: Array<{ pattern: string; confidence: number }> = [];

    // Simplified pattern detection based on granularity
    switch (granularity) {
      case 'hour':
        const businessHourPattern = this.detectBusinessHourPattern(dataPoints);
        if (businessHourPattern.confidence > 0.6) {
          patterns.push(businessHourPattern);
        }
        break;
      case 'day':
        const weekdayPattern = this.detectWeekdayPattern(dataPoints);
        if (weekdayPattern.confidence > 0.6) {
          patterns.push(weekdayPattern);
        }
        break;
      case 'week':
        const monthlyPattern = this.detectMonthlyPattern(dataPoints);
        if (monthlyPattern.confidence > 0.6) {
          patterns.push(monthlyPattern);
        }
        break;
      case 'month':
        const seasonalPattern = this.detectSeasonalPattern(dataPoints);
        if (seasonalPattern.confidence > 0.6) {
          patterns.push(seasonalPattern);
        }
        break;
    }

    return patterns;
  }

  // Image generation methods
  private async generateGeographicHeatmapImage(heatmap: GeographicHeatmap, format: 'png' | 'svg'): Promise<Buffer> {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Draw world map background (simplified)
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 800, 400);

    // Draw country data points
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([heatmap.minValue, heatmap.maxValue]);

    heatmap.dataPoints.forEach(point => {
      const radius = Math.max(3, Math.min(20, point.intensity * 20));
      const color = colorScale(point.value);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Add legend
    this.drawLegend(ctx, colorScale, heatmap.minValue, heatmap.maxValue, 'Scans');

    return canvas.toBuffer('image/png');
  }

  private async generateTemporalHeatmapImage(heatmap: TemporalHeatmap, format: 'png' | 'svg'): Promise<Buffer> {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 400);

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([heatmap.minValue, heatmap.maxValue]);

    // Draw temporal heatmap as grid
    const cellWidth = 800 / Math.sqrt(heatmap.dataPoints.length);
    const cellHeight = 400 / Math.sqrt(heatmap.dataPoints.length);

    heatmap.dataPoints.forEach((point, index) => {
      const row = Math.floor(index / Math.sqrt(heatmap.dataPoints.length));
      const col = index % Math.sqrt(heatmap.dataPoints.length);
      
      const x = col * cellWidth;
      const y = row * cellHeight;
      
      ctx.fillStyle = colorScale(point.value);
      ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);
    });

    // Add legend
    this.drawLegend(ctx, colorScale, heatmap.minValue, heatmap.maxValue, 'Activity');

    return canvas.toBuffer('image/png');
  }

  private async generateDeviceHeatmapImage(heatmap: HeatmapData, format: 'png' | 'svg'): Promise<Buffer> {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 400);

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([heatmap.minValue, heatmap.maxValue]);

    // Draw device/platform bubbles
    heatmap.dataPoints.forEach(point => {
      const radius = Math.max(10, Math.min(50, point.intensity * 50));
      const color = colorScale(point.value);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Add label
      if (point.metadata?.name) {
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(point.metadata.name, point.x, point.y + 5);
      }
    });

    return canvas.toBuffer('image/png');
  }

  private async generateGenericHeatmapImage(heatmap: HeatmapData, format: 'png' | 'svg'): Promise<Buffer> {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 400);

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([heatmap.minValue, heatmap.maxValue]);

    // Draw data points
    heatmap.dataPoints.forEach(point => {
      const radius = Math.max(5, Math.min(25, point.intensity * 25));
      const color = colorScale(point.value);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    return canvas.toBuffer('image/png');
  }

  private drawLegend(
    ctx: CanvasRenderingContext2D,
    colorScale: any,
    minValue: number,
    maxValue: number,
    label: string
  ): void {
    const legendX = 650;
    const legendY = 50;
    const legendWidth = 20;
    const legendHeight = 200;

    // Draw color gradient
    const gradient = ctx.createLinearGradient(0, legendY, 0, legendY + legendHeight);
    for (let i = 0; i <= 10; i++) {
      const value = minValue + (maxValue - minValue) * (i / 10);
      gradient.addColorStop(i / 10, colorScale(value));
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // Add labels
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(maxValue.toString(), legendX + legendWidth + 5, legendY + 15);
    ctx.fillText(minValue.toString(), legendX + legendWidth + 5, legendY + legendHeight);
    ctx.fillText(label, legendX, legendY - 10);
  }

  // Utility methods
  private generateHeatmapId(): string {
    return `heatmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCountryCode(countryName: string): string {
    // Simplified country name to code mapping
    const countryMap: Record<string, string> = {
      'United States': 'US',
      'United Kingdom': 'UK',
      'Germany': 'DE',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Canada': 'CA',
      'Australia': 'AU',
      'Japan': 'JP',
      'China': 'CN',
      'India': 'IN',
      'Brazil': 'BR'
    };

    return countryMap[countryName] || countryName.substring(0, 2).toUpperCase();
  }

  private longitudeToX(longitude: number): number {
    return ((longitude + 180) / 360) * 800;
  }

  private latitudeToY(latitude: number): number {
    return ((90 - latitude) / 180) * 400;
  }

  private calculateIntensity(value: number, total: number): number {
    return total > 0 ? value / total : 0;
  }

  private calculateGeographicBounds(dataPoints: Array<{ x: number; y: number }>): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const lats = dataPoints.map(p => ((400 - p.y) / 400) * 180 - 90);
    const lngs = dataPoints.map(p => (p.x / 800) * 360 - 180);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }

  private calculateOptimalZoomLevel(dataPoints: Array<{ x: number; y: number }>): number {
    // Simplified zoom level calculation based on data point spread
    const bounds = this.calculateGeographicBounds(dataPoints);
    const latSpan = bounds.north - bounds.south;
    const lngSpan = bounds.east - bounds.west;
    const maxSpan = Math.max(latSpan, lngSpan);

    if (maxSpan > 100) return 2;
    if (maxSpan > 50) return 4;
    if (maxSpan > 20) return 6;
    if (maxSpan > 10) return 8;
    return 10;
  }

  private calculateTemporalY(timeKey: string, granularity: 'hour' | 'day' | 'week' | 'month'): number {
    // Map time keys to Y coordinates based on granularity
    switch (granularity) {
      case 'hour':
        const hour = parseInt(timeKey);
        return (hour / 24) * 400;
      case 'day':
        const dayOfWeek = moment(timeKey).day();
        return (dayOfWeek / 7) * 400;
      case 'week':
        const weekOfYear = moment(timeKey, 'YYYY-[W]WW').week();
        return (weekOfYear / 52) * 400;
      case 'month':
        const month = moment(timeKey, 'YYYY-MM').month();
        return (month / 12) * 400;
      default:
        return 200;
    }
  }

  private parseTimeKey(timeKey: string, granularity: 'hour' | 'day' | 'week' | 'month'): Date {
    switch (granularity) {
      case 'hour':
        return moment().hour(parseInt(timeKey)).toDate();
      case 'day':
        return moment(timeKey, 'YYYY-MM-DD').toDate();
      case 'week':
        return moment(timeKey, 'YYYY-[W]WW').toDate();
      case 'month':
        return moment(timeKey, 'YYYY-MM').toDate();
      default:
        return new Date();
    }
  }

  // Pattern detection methods (simplified implementations)
  private detectBusinessHourPattern(dataPoints: any[]): { pattern: string; confidence: number } {
    const businessHourIntensity = dataPoints
      .filter(p => {
        const hour = parseInt(p.metadata?.timeKey || '0');
        return hour >= 9 && hour <= 17;
      })
      .reduce((sum, p) => sum + p.intensity, 0);

    const totalIntensity = dataPoints.reduce((sum, p) => sum + p.intensity, 0);
    const confidence = totalIntensity > 0 ? businessHourIntensity / totalIntensity : 0;

    return {
      pattern: 'Business Hours Peak (9 AM - 5 PM)',
      confidence
    };
  }

  private detectWeekdayPattern(dataPoints: any[]): { pattern: string; confidence: number } {
    // Simplified weekday pattern detection
    return {
      pattern: 'Weekday Activity Pattern',
      confidence: 0.7
    };
  }

  private detectMonthlyPattern(dataPoints: any[]): { pattern: string; confidence: number } {
    // Simplified monthly pattern detection
    return {
      pattern: 'Monthly Cycle Pattern',
      confidence: 0.6
    };
  }

  private detectSeasonalPattern(dataPoints: any[]): { pattern: string; confidence: number } {
    // Simplified seasonal pattern detection
    return {
      pattern: 'Seasonal Variation Pattern',
      confidence: 0.65
    };
  }

  // Empty heatmap creation methods
  private createEmptyGeographicHeatmap(qrCodeId: string, timeRange: { startDate: Date; endDate: Date }): GeographicHeatmap {
    return {
      id: this.generateHeatmapId(),
      type: 'geographic',
      qrCodeId,
      dataPoints: [],
      maxValue: 0,
      minValue: 0,
      averageValue: 0,
      generatedAt: new Date(),
      timeRange,
      bounds: { north: 0, south: 0, east: 0, west: 0 },
      zoomLevel: 2,
      countryData: []
    };
  }

  private createEmptyTemporalHeatmap(qrCodeId: string, options: HeatmapOptions): TemporalHeatmap {
    return {
      id: this.generateHeatmapId(),
      type: 'temporal',
      qrCodeId,
      dataPoints: [],
      maxValue: 0,
      minValue: 0,
      averageValue: 0,
      generatedAt: new Date(),
      timeRange: options.timeRange,
      timeGranularity: options.granularity,
      patternAnalysis: {
        strongestPeriods: [],
        weakestPeriods: [],
        cyclicalPatterns: []
      }
    };
  }

  private createEmptyDeviceHeatmap(qrCodeId: string, timeRange: { startDate: Date; endDate: Date }): HeatmapData {
    return {
      id: this.generateHeatmapId(),
      type: 'device',
      qrCodeId,
      dataPoints: [],
      maxValue: 0,
      minValue: 0,
      averageValue: 0,
      generatedAt: new Date(),
      timeRange
    };
  }
}