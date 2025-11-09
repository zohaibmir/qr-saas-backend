import { RealTimeMetrics, AnalyticsSnapshot } from '@qr-saas/shared';
import { getWebSocketUrl, features } from '../config/analytics.config';

// WebSocket Event Types
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'metrics_update' | 'snapshot_update' | 'error' | 'ping' | 'pong';
  payload?: any;
  requestId?: string;
  timestamp: number;
}

export interface SubscriptionRequest {
  qrCodeIds: string[];
  metricTypes?: string[];
  updateInterval?: number;
}

export interface MetricsUpdate {
  qrCodeId: string;
  metrics: RealTimeMetrics;
  timestamp: number;
}

export interface SnapshotUpdate {
  qrCodeId: string;
  snapshot: AnalyticsSnapshot;
  timestamp: number;
}

export interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  authToken?: string;
}

// WebSocket Connection States
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// Event Callbacks
export type MetricsUpdateCallback = (update: MetricsUpdate) => void;
export type SnapshotUpdateCallback = (update: SnapshotUpdate) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;
export type ErrorCallback = (error: Error) => void;

// Real-time WebSocket Service following existing patterns
class RealTimeWebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Set<string>();
  
  // Event listeners
  private metricsUpdateCallbacks = new Set<MetricsUpdateCallback>();
  private snapshotUpdateCallbacks = new Set<SnapshotUpdateCallback>();
  private connectionStateCallbacks = new Set<ConnectionStateCallback>();
  private errorCallbacks = new Set<ErrorCallback>();

  constructor(config?: WebSocketConfig) {
    this.config = {
      url: config?.url || this.getWebSocketUrl(),
      reconnectInterval: config?.reconnectInterval || 5000,
      maxReconnectAttempts: config?.maxReconnectAttempts || 10,
      heartbeatInterval: config?.heartbeatInterval || 30000,
      authToken: config?.authToken,
    };
  }

  /**
   * Get WebSocket URL from environment or default
   */
  private getWebSocketUrl(): string {
    return getWebSocketUrl();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.setConnectionState('connecting');
        
        const wsUrl = new URL(this.config.url!);
        if (this.config.authToken) {
          wsUrl.searchParams.set('token', this.config.authToken);
        }

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log('WebSocket connected to analytics service');
          this.setConnectionState('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.setConnectionState('disconnected');
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.notifyError(new Error('WebSocket connection error'));
          reject(error);
        };

      } catch (error) {
        this.notifyError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setConnectionState('disconnected');
    this.subscriptions.clear();
  }

  /**
   * Subscribe to real-time metrics for QR codes
   */
  async subscribeToMetrics(qrCodeIds: string[], metricTypes?: string[]): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const request: SubscriptionRequest = {
      qrCodeIds,
      metricTypes: metricTypes || ['scans', 'viewers', 'conversions'],
      updateInterval: 1000, // 1 second updates
    };

    this.sendMessage({
      type: 'subscribe',
      payload: request,
      timestamp: Date.now(),
    });

    // Track subscriptions
    qrCodeIds.forEach(id => this.subscriptions.add(id));
  }

  /**
   * Unsubscribe from real-time metrics
   */
  unsubscribeFromMetrics(qrCodeIds?: string[]): void {
    if (!this.isConnected()) {
      return;
    }

    const unsubscribeIds = qrCodeIds || Array.from(this.subscriptions);

    this.sendMessage({
      type: 'unsubscribe',
      payload: { qrCodeIds: unsubscribeIds },
      timestamp: Date.now(),
    });

    // Remove from subscriptions
    if (qrCodeIds) {
      qrCodeIds.forEach(id => this.subscriptions.delete(id));
    } else {
      this.subscriptions.clear();
    }
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: MetricsUpdateCallback): () => void {
    this.metricsUpdateCallbacks.add(callback);
    return () => this.metricsUpdateCallbacks.delete(callback);
  }

  /**
   * Subscribe to snapshot updates
   */
  onSnapshotUpdate(callback: SnapshotUpdateCallback): () => void {
    this.snapshotUpdateCallbacks.add(callback);
    return () => this.snapshotUpdateCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.connectionStateCallbacks.add(callback);
    return () => this.connectionStateCallbacks.delete(callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Update authentication token
   */
  updateAuthToken(token: string): void {
    this.config.authToken = token;
    
    // Reconnect if currently connected to update token
    if (this.isConnected()) {
      this.disconnect();
      this.connect();
    }
  }

  // Private Methods

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'metrics_update':
          this.handleMetricsUpdate(message.payload);
          break;
        
        case 'snapshot_update':
          this.handleSnapshotUpdate(message.payload);
          break;
        
        case 'error':
          this.notifyError(new Error(message.payload?.message || 'WebSocket error'));
          break;
        
        case 'pong':
          // Heartbeat response received
          break;
        
        default:
          console.warn('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.notifyError(new Error('Failed to parse WebSocket message'));
    }
  }

  /**
   * Handle metrics update messages
   */
  private handleMetricsUpdate(payload: MetricsUpdate): void {
    this.metricsUpdateCallbacks.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Error in metrics update callback:', error);
      }
    });
  }

  /**
   * Handle snapshot update messages
   */
  private handleSnapshotUpdate(payload: SnapshotUpdate): void {
    this.snapshotUpdateCallbacks.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Error in snapshot update callback:', error);
      }
    });
  }

  /**
   * Send message to WebSocket server
   */
  private sendMessage(message: WebSocketMessage): void {
    if (!this.isConnected()) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.notifyError(new Error('Failed to send WebSocket message'));
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.connectionStateCallbacks.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('Error in connection state callback:', error);
        }
      });
    }
  }

  /**
   * Notify error listeners
   */
  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({
          type: 'ping',
          timestamp: Date.now(),
        });
      }
    }, this.config.heartbeatInterval!);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      try {
        await this.connect();
        
        // Re-establish subscriptions
        if (this.subscriptions.size > 0) {
          await this.subscribeToMetrics(Array.from(this.subscriptions));
        }
      } catch (error) {
        console.error('Reconnect attempt failed:', error);
        
        if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
          this.scheduleReconnect();
        } else {
          this.setConnectionState('error');
          this.notifyError(new Error('Max reconnection attempts reached'));
        }
      }
    }, delay);
  }
}

// Note: React hooks are defined in a separate hooks file to avoid dependency issues

// Create and export service instance
export const realTimeWebSocketService = new RealTimeWebSocketService();

export default RealTimeWebSocketService;