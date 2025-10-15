import { 
  IRealTimeAnalyticsService,
  RealTimeMetrics,
  AnalyticsSnapshot,
  IAnalyticsRepository,
  ILogger,
  ServiceResponse,
  ValidationError,
  AppError
} from '../interfaces';
import WebSocket from 'ws';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  subscribedQRCodes: Set<string>;
  subscribedMetrics: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

interface MetricUpdate {
  qrCodeId: string;
  metricType: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class RealTimeAnalyticsService extends EventEmitter implements IRealTimeAnalyticsService {
  private websocketServer: WebSocket.Server;
  private connections: Map<string, WebSocketConnection>;
  private redis: Redis;
  private metricsBuffer: Map<string, MetricUpdate[]>;
  private updateInterval: NodeJS.Timeout | null;
  private isRunning: boolean = false;

  private readonly METRICS_BUFFER_SIZE = 1000;
  private readonly UPDATE_INTERVAL_MS = 5000; // 5 seconds
  private readonly CONNECTION_TIMEOUT_MS = 300000; // 5 minutes
  private readonly MAX_CONNECTIONS = 1000;

  constructor(
    private analyticsRepository: IAnalyticsRepository,
    private logger: ILogger,
    private port: number = 8080,
    private redisConfig: { host: string; port: number; password?: string }
  ) {
    super();
    this.connections = new Map();
    this.metricsBuffer = new Map();
    this.updateInterval = null;
    
    this.redis = new Redis({
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password,
      maxRetriesPerRequest: 3
    });

    this.websocketServer = new WebSocket.Server({ 
      port: this.port,
      maxPayload: 16 * 1024 // 16KB max payload
    });

    this.setupWebSocketServer();
    this.setupRedisSubscriptions();
  }

  async startRealTimeEngine(): Promise<ServiceResponse<void>> {
    try {
      if (this.isRunning) {
        return {
          success: false,
          error: {
            code: 'ENGINE_ALREADY_RUNNING',
            message: 'Real-time analytics engine is already running',
            statusCode: 409
          }
        };
      }

      this.logger.info('Starting real-time analytics engine', { port: this.port });

      // Start periodic metrics update
      this.updateInterval = setInterval(() => {
        this.processMetricsBuffer();
      }, this.UPDATE_INTERVAL_MS);

      // Start connection cleanup
      setInterval(() => {
        this.cleanupStaleConnections();
      }, 60000); // Every minute

      this.isRunning = true;

      this.logger.info('Real-time analytics engine started successfully');

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to start real-time analytics engine', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'ENGINE_START_FAILED',
          message: 'Failed to start real-time analytics engine',
          statusCode: 500
        }
      };
    }
  }

  async stopRealTimeEngine(): Promise<ServiceResponse<void>> {
    try {
      if (!this.isRunning) {
        return {
          success: false,
          error: {
            code: 'ENGINE_NOT_RUNNING',
            message: 'Real-time analytics engine is not running',
            statusCode: 409
          }
        };
      }

      this.logger.info('Stopping real-time analytics engine');

      // Clear update interval
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Close all WebSocket connections
      this.connections.forEach(connection => {
        connection.socket.close(1001, 'Server shutdown');
      });
      this.connections.clear();

      // Close WebSocket server
      this.websocketServer.close();

      // Close Redis connection
      await this.redis.quit();

      this.isRunning = false;

      this.logger.info('Real-time analytics engine stopped successfully');

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to stop real-time analytics engine', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'ENGINE_STOP_FAILED',
          message: 'Failed to stop real-time analytics engine',
          statusCode: 500
        }
      };
    }
  }

  async getRealTimeMetrics(qrCodeId: string): Promise<ServiceResponse<RealTimeMetrics>> {
    try {
      this.logger.info('Getting real-time metrics', { qrCodeId });

      // Get cached metrics from Redis
      const cachedMetrics = await this.redis.get(`realtime:metrics:${qrCodeId}`);
      
      if (cachedMetrics) {
        const metrics: RealTimeMetrics = JSON.parse(cachedMetrics);
        return {
          success: true,
          data: metrics,
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0',
            cached: true
          }
        };
      }

      // Generate fresh metrics
      const metrics = await this.generateCurrentMetrics(qrCodeId);

      // Cache for 30 seconds
      await this.redis.setex(`realtime:metrics:${qrCodeId}`, 30, JSON.stringify(metrics));

      this.logger.info('Real-time metrics generated', { 
        qrCodeId,
        activeScans: metrics.activeScans,
        currentViewers: metrics.currentViewers
      });

      return {
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to get real-time metrics', { 
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
          code: 'REALTIME_METRICS_FAILED',
          message: 'Failed to get real-time metrics',
          statusCode: 500
        }
      };
    }
  }

  async subscribeToMetrics(
    connectionId: string,
    qrCodeIds: string[],
    metricTypes: string[]
  ): Promise<ServiceResponse<void>> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return {
          success: false,
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'WebSocket connection not found',
            statusCode: 404
          }
        };
      }

      this.logger.info('Subscribing to metrics', { 
        connectionId,
        qrCodeIds,
        metricTypes
      });

      // Update subscription sets
      qrCodeIds.forEach(qrCodeId => connection.subscribedQRCodes.add(qrCodeId));
      metricTypes.forEach(metricType => connection.subscribedMetrics.add(metricType));

      // Send initial metrics for subscribed QR codes
      for (const qrCodeId of qrCodeIds) {
        const metricsResponse = await this.getRealTimeMetrics(qrCodeId);
        if (metricsResponse.success) {
          this.sendToConnection(connection, {
            type: 'metrics_update',
            qrCodeId,
            metrics: metricsResponse.data,
            timestamp: new Date().toISOString()
          });
        }
      }

      this.logger.info('Successfully subscribed to metrics', { 
        connectionId,
        totalQRCodes: connection.subscribedQRCodes.size,
        totalMetrics: connection.subscribedMetrics.size
      });

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to subscribe to metrics', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId
      });

      return {
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to metrics',
          statusCode: 500
        }
      };
    }
  }

  async unsubscribeFromMetrics(
    connectionId: string,
    qrCodeIds?: string[],
    metricTypes?: string[]
  ): Promise<ServiceResponse<void>> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return {
          success: false,
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'WebSocket connection not found',
            statusCode: 404
          }
        };
      }

      this.logger.info('Unsubscribing from metrics', { 
        connectionId,
        qrCodeIds,
        metricTypes
      });

      if (qrCodeIds) {
        qrCodeIds.forEach(qrCodeId => connection.subscribedQRCodes.delete(qrCodeId));
      } else {
        connection.subscribedQRCodes.clear();
      }

      if (metricTypes) {
        metricTypes.forEach(metricType => connection.subscribedMetrics.delete(metricType));
      } else {
        connection.subscribedMetrics.clear();
      }

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to unsubscribe from metrics', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId
      });

      return {
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from metrics',
          statusCode: 500
        }
      };
    }
  }

  async broadcastMetricUpdate(qrCodeId: string, metricUpdate: MetricUpdate): Promise<ServiceResponse<void>> {
    try {
      this.logger.debug('Broadcasting metric update', { 
        qrCodeId,
        metricType: metricUpdate.metricType,
        value: metricUpdate.value
      });

      // Add to buffer for batch processing
      if (!this.metricsBuffer.has(qrCodeId)) {
        this.metricsBuffer.set(qrCodeId, []);
      }

      const buffer = this.metricsBuffer.get(qrCodeId)!;
      buffer.push(metricUpdate);

      // Keep buffer size under control
      if (buffer.length > this.METRICS_BUFFER_SIZE) {
        buffer.splice(0, buffer.length - this.METRICS_BUFFER_SIZE);
      }

      // Publish to Redis for other service instances
      await this.redis.publish('analytics:metric_update', JSON.stringify({
        qrCodeId,
        update: metricUpdate
      }));

      // Immediate broadcast for critical updates
      if (this.isCriticalUpdate(metricUpdate)) {
        await this.broadcastToSubscribers(qrCodeId, metricUpdate);
      }

      return {
        success: true,
        data: undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to broadcast metric update', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId
      });

      return {
        success: false,
        error: {
          code: 'BROADCAST_FAILED',
          message: 'Failed to broadcast metric update',
          statusCode: 500
        }
      };
    }
  }

  async getAnalyticsSnapshot(qrCodeId: string): Promise<ServiceResponse<AnalyticsSnapshot>> {
    try {
      this.logger.info('Getting analytics snapshot', { qrCodeId });

      const [
        realtimeMetrics,
        recentScans,
        topCountries,
        deviceBreakdown
      ] = await Promise.all([
        this.generateCurrentMetrics(qrCodeId),
        this.getRecentScans(qrCodeId, 24), // Last 24 hours
        this.getTopCountries(qrCodeId, 10),
        this.getDeviceBreakdown(qrCodeId)
      ]);

      const snapshot: AnalyticsSnapshot = {
        qrCodeId,
        timestamp: new Date(),
        realTimeMetrics: realtimeMetrics,
        quickStats: {
          totalScans: recentScans.length,
          scansLast24h: recentScans.filter(scan => 
            new Date(scan.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length,
          scansLastHour: recentScans.filter(scan => 
            new Date(scan.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
          ).length,
          uniqueCountries: topCountries.length,
          topDevice: deviceBreakdown.length > 0 ? deviceBreakdown[0].device : 'Unknown'
        },
        recentActivity: recentScans.slice(0, 50), // Last 50 scans
        performanceIndicators: {
          averageResponseTime: await this.getAverageResponseTime(qrCodeId),
          errorRate: await this.getErrorRate(qrCodeId),
          peakConcurrency: realtimeMetrics.peakConcurrency,
          dataFreshness: new Date()
        }
      };

      // Cache snapshot for 1 minute
      await this.redis.setex(
        `analytics:snapshot:${qrCodeId}`, 
        60, 
        JSON.stringify(snapshot)
      );

      this.logger.info('Analytics snapshot generated', { 
        qrCodeId,
        totalScans: snapshot.quickStats.totalScans,
        scansLast24h: snapshot.quickStats.scansLast24h
      });

      return {
        success: true,
        data: snapshot,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Failed to get analytics snapshot', { 
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
          code: 'SNAPSHOT_FAILED',
          message: 'Failed to get analytics snapshot',
          statusCode: 500
        }
      };
    }
  }

  // Private helper methods
  private setupWebSocketServer(): void {
    this.websocketServer.on('connection', (socket: WebSocket, request) => {
      const connectionId = this.generateConnectionId();
      const connection: WebSocketConnection = {
        id: connectionId,
        socket,
        subscribedQRCodes: new Set(),
        subscribedMetrics: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date()
      };

      // Check connection limit
      if (this.connections.size >= this.MAX_CONNECTIONS) {
        socket.close(1008, 'Server at capacity');
        return;
      }

      this.connections.set(connectionId, connection);

      this.logger.info('WebSocket connection established', { 
        connectionId,
        totalConnections: this.connections.size
      });

      socket.on('message', (data) => {
        this.handleWebSocketMessage(connection, data);
      });

      socket.on('close', () => {
        this.connections.delete(connectionId);
        this.logger.info('WebSocket connection closed', { 
          connectionId,
          totalConnections: this.connections.size
        });
      });

      socket.on('error', (error) => {
        this.logger.error('WebSocket connection error', { 
          connectionId,
          error: error.message
        });
        this.connections.delete(connectionId);
      });

      // Send welcome message
      this.sendToConnection(connection, {
        type: 'welcome',
        connectionId,
        serverTime: new Date().toISOString()
      });
    });

    this.websocketServer.on('error', (error) => {
      this.logger.error('WebSocket server error', { error: error.message });
    });
  }

  private setupRedisSubscriptions(): void {
    const subscriber = this.redis.duplicate();

    subscriber.subscribe('analytics:metric_update', (error, count) => {
      if (error) {
        this.logger.error('Redis subscription error', { error: error.message });
      } else {
        this.logger.info('Subscribed to Redis analytics channel', { count });
      }
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'analytics:metric_update') {
        const { qrCodeId, update } = JSON.parse(message);
        this.broadcastToSubscribers(qrCodeId, update).catch(error => {
          this.logger.error('Failed to broadcast Redis message', { error: error.message });
        });
      }
    });
  }

  private handleWebSocketMessage(connection: WebSocketConnection, data: WebSocket.Data): void {
    try {
      connection.lastActivity = new Date();

      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          this.subscribeToMetrics(
            connection.id,
            message.qrCodeIds || [],
            message.metricTypes || []
          );
          break;

        case 'unsubscribe':
          this.unsubscribeFromMetrics(
            connection.id,
            message.qrCodeIds,
            message.metricTypes
          );
          break;

        case 'ping':
          this.sendToConnection(connection, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;

        case 'get_snapshot':
          if (message.qrCodeId) {
            this.getAnalyticsSnapshot(message.qrCodeId).then(response => {
              this.sendToConnection(connection, {
                type: 'snapshot',
                qrCodeId: message.qrCodeId,
                data: response.data,
                success: response.success
              });
            });
          }
          break;

        default:
          this.sendToConnection(connection, {
            type: 'error',
            message: 'Unknown message type',
            originalMessage: message
          });
      }

    } catch (error) {
      this.logger.error('Error handling WebSocket message', { 
        connectionId: connection.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.sendToConnection(connection, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  private sendToConnection(connection: WebSocketConnection, message: any): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Failed to send message to connection', { 
          connectionId: connection.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async broadcastToSubscribers(qrCodeId: string, metricUpdate: MetricUpdate): Promise<void> {
    const message = {
      type: 'metric_update',
      qrCodeId,
      metricType: metricUpdate.metricType,
      value: metricUpdate.value,
      timestamp: metricUpdate.timestamp.toISOString(),
      metadata: metricUpdate.metadata
    };

    const subscribedConnections = Array.from(this.connections.values())
      .filter(connection => 
        connection.subscribedQRCodes.has(qrCodeId) &&
        (connection.subscribedMetrics.has(metricUpdate.metricType) || 
         connection.subscribedMetrics.has('all'))
      );

    subscribedConnections.forEach(connection => {
      this.sendToConnection(connection, message);
    });

    this.logger.debug('Broadcasted metric update', { 
      qrCodeId,
      metricType: metricUpdate.metricType,
      subscribersCount: subscribedConnections.length
    });
  }

  private async processMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.size === 0) return;

    this.logger.debug('Processing metrics buffer', { 
      qrCodesCount: this.metricsBuffer.size
    });

    for (const [qrCodeId, updates] of this.metricsBuffer) {
      if (updates.length === 0) continue;

      // Process aggregated updates
      const aggregatedMetrics = this.aggregateMetricUpdates(updates);
      
      // Update cached metrics
      const currentMetrics = await this.generateCurrentMetrics(qrCodeId);
      await this.redis.setex(
        `realtime:metrics:${qrCodeId}`, 
        30, 
        JSON.stringify(currentMetrics)
      );

      // Broadcast aggregated updates
      for (const update of aggregatedMetrics) {
        await this.broadcastToSubscribers(qrCodeId, update);
      }

      // Clear processed updates
      this.metricsBuffer.set(qrCodeId, []);
    }
  }

  private aggregateMetricUpdates(updates: MetricUpdate[]): MetricUpdate[] {
    const aggregated = new Map<string, MetricUpdate>();

    updates.forEach(update => {
      const key = update.metricType;
      if (!aggregated.has(key)) {
        aggregated.set(key, { ...update });
      } else {
        const existing = aggregated.get(key)!;
        existing.value += update.value;
        existing.timestamp = update.timestamp; // Use latest timestamp
      }
    });

    return Array.from(aggregated.values());
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleConnections: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      const inactiveMs = now.getTime() - connection.lastActivity.getTime();
      if (inactiveMs > this.CONNECTION_TIMEOUT_MS) {
        staleConnections.push(connectionId);
      }
    });

    staleConnections.forEach(connectionId => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.socket.close(1000, 'Connection timeout');
        this.connections.delete(connectionId);
      }
    });

    if (staleConnections.length > 0) {
      this.logger.info('Cleaned up stale connections', { 
        count: staleConnections.length,
        totalConnections: this.connections.size
      });
    }
  }

  private isCriticalUpdate(update: MetricUpdate): boolean {
    const criticalMetrics = ['error_rate', 'response_time', 'active_scans'];
    return criticalMetrics.includes(update.metricType);
  }

  private async generateCurrentMetrics(qrCodeId: string): Promise<RealTimeMetrics> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      recentScans,
      activeScans,
      currentViewers,
      peakConcurrency,
      topCountries,
      topDevices
    ] = await Promise.all([
      this.analyticsRepository.getScanEventsByQRCode(qrCodeId, hourAgo, now),
      this.getActiveScansCount(qrCodeId),
      this.getCurrentViewersCount(qrCodeId),
      this.getPeakConcurrency(qrCodeId),
      this.getTopCountries(qrCodeId, 5),
      this.getDeviceBreakdown(qrCodeId)
    ]);

    return {
      qrCodeId,
      timestamp: now,
      activeScans,
      currentViewers,
      scansPerSecond: this.calculateScansPerSecond(recentScans),
      peakConcurrency,
      responseTime: await this.getAverageResponseTime(qrCodeId),
      errorRate: await this.getErrorRate(qrCodeId),
      dataTransfer: await this.getDataTransferRate(qrCodeId),
      connectionStatus: 'connected',
      lastUpdated: now,
      topCountries: topCountries.map(country => ({ country: country.country || 'Unknown', count: country.count })),
      topDevices: topDevices.slice(0, 5).map(device => ({ device: device.device || 'Unknown', count: device.count })),
      recentScans: recentScans.slice(0, 10).map(scan => ({
        id: scan.id || 'unknown',
        timestamp: new Date(scan.timestamp),
        country: scan.location?.country || 'Unknown',
        device: scan.device || 'Unknown',
        platform: scan.platform || 'Unknown'
      })),
      alerts: [] // TODO: Implement alert system
    };
  }

  private async getActiveScansCount(qrCodeId: string): Promise<number> {
    const activeKey = `active:scans:${qrCodeId}`;
    return parseInt(await this.redis.get(activeKey) || '0');
  }

  private async getCurrentViewersCount(qrCodeId: string): Promise<number> {
    const viewersKey = `viewers:${qrCodeId}`;
    return parseInt(await this.redis.get(viewersKey) || '0');
  }

  private async getPeakConcurrency(qrCodeId: string): Promise<number> {
    const peakKey = `peak:concurrency:${qrCodeId}`;
    return parseInt(await this.redis.get(peakKey) || '0');
  }

  private calculateScansPerSecond(scans: any[]): number {
    if (scans.length < 2) return 0;
    
    const timeSpan = new Date(scans[scans.length - 1].timestamp).getTime() - 
                    new Date(scans[0].timestamp).getTime();
    
    return timeSpan > 0 ? (scans.length / (timeSpan / 1000)) : 0;
  }

  private async getAverageResponseTime(qrCodeId: string): Promise<number> {
    const responseTimeKey = `response_time:${qrCodeId}`;
    const responseTimeStr = await this.redis.get(responseTimeKey);
    return responseTimeStr ? parseFloat(responseTimeStr) : 0;
  }

  private async getErrorRate(qrCodeId: string): Promise<number> {
    const errorRateKey = `error_rate:${qrCodeId}`;
    const errorRateStr = await this.redis.get(errorRateKey);
    return errorRateStr ? parseFloat(errorRateStr) : 0;
  }

  private async getDataTransferRate(qrCodeId: string): Promise<number> {
    const transferKey = `data_transfer:${qrCodeId}`;
    const transferStr = await this.redis.get(transferKey);
    return transferStr ? parseFloat(transferStr) : 0;
  }

  private async getRecentScans(qrCodeId: string, hours: number): Promise<any[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
    return this.analyticsRepository.getScanEventsByQRCode(qrCodeId, startTime, endTime);
  }

  private async getTopCountries(qrCodeId: string, limit: number): Promise<Array<{ country: string; count: number }>> {
    // This would typically query the repository for country statistics
    // For now, return empty array as placeholder
    return [];
  }

  private async getDeviceBreakdown(qrCodeId: string): Promise<Array<{ device: string; count: number }>> {
    // This would typically query the repository for device statistics
    // For now, return empty array as placeholder
    return [];
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Backward compatibility methods for the old interface
  async getCurrentMetrics(qrCodeId: string): Promise<ServiceResponse<RealTimeMetrics>> {
    return this.getRealTimeMetrics(qrCodeId);
  }

  async subscribeToUpdates(connectionId: string, qrCodeIds: string[]): Promise<ServiceResponse<void>> {
    return this.subscribeToMetrics(connectionId, qrCodeIds, ['all']);
  }

  async unsubscribeFromUpdates(connectionId: string, qrCodeIds?: string[]): Promise<ServiceResponse<void>> {
    return this.unsubscribeFromMetrics(connectionId, qrCodeIds);
  }

  async broadcastUpdate(qrCodeId: string, metrics: RealTimeMetrics): Promise<ServiceResponse<void>> {
    const update: MetricUpdate = {
      qrCodeId,
      metricType: 'all_metrics',
      value: metrics.currentViewers,
      timestamp: new Date(),
      metadata: { fullMetrics: metrics }
    };
    return this.broadcastMetricUpdate(qrCodeId, update);
  }
}