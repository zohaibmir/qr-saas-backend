'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RealTimeMetrics } from '@qr-saas/shared';
import RealTimeWebSocketService, { 
  ConnectionState, 
  MetricsUpdateCallback, 
  ErrorCallback,
  MetricsUpdate
} from '../services/real-time-websocket.service';

// React Hook for using WebSocket service
export const useRealTimeAnalytics = (qrCodeIds: string[], options?: {
  metricTypes?: string[];
  autoConnect?: boolean;
  onMetricsUpdate?: MetricsUpdateCallback;
  onError?: ErrorCallback;
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [metrics, setMetrics] = useState<Record<string, RealTimeMetrics>>({});
  const [error, setError] = useState<Error | null>(null);
  
  const serviceRef = useRef<RealTimeWebSocketService | null>(null);

  useEffect(() => {
    // Get auth token
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('qr-saas-auth-token') : null;
    
    // Initialize service
    serviceRef.current = new RealTimeWebSocketService({
      authToken: authToken || undefined,
    });

    const service = serviceRef.current;

    // Set up event listeners
    const unsubscribeState = service.onConnectionStateChange(setConnectionState);
    const unsubscribeError = service.onError((err: Error) => {
      setError(err);
      options?.onError?.(err);
    });
    
    const unsubscribeMetrics = service.onMetricsUpdate((update: MetricsUpdate) => {
      setMetrics((prev: Record<string, RealTimeMetrics>) => ({
        ...prev,
        [update.qrCodeId]: update.metrics,
      }));
      options?.onMetricsUpdate?.(update);
    });

    // Auto-connect if enabled
    if (options?.autoConnect !== false && qrCodeIds.length > 0) {
      service.connect().then(() => {
        service.subscribeToMetrics(qrCodeIds, options?.metricTypes);
      }).catch(setError);
    }

    return () => {
      unsubscribeState();
      unsubscribeError();
      unsubscribeMetrics();
      service.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update subscriptions when qrCodeIds change
  useEffect(() => {
    if (serviceRef.current && serviceRef.current.isConnected() && qrCodeIds.length > 0) {
      serviceRef.current.unsubscribeFromMetrics();
      serviceRef.current.subscribeToMetrics(qrCodeIds, options?.metricTypes);
    }
  }, [qrCodeIds, options?.metricTypes]);

  const connect = useCallback(() => {
    return serviceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  const subscribe = useCallback((ids: string[], metricTypes?: string[]) => {
    return serviceRef.current?.subscribeToMetrics(ids, metricTypes);
  }, []);

  const unsubscribe = useCallback((ids?: string[]) => {
    serviceRef.current?.unsubscribeFromMetrics(ids);
  }, []);

  return {
    connectionState,
    metrics,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    isConnected: serviceRef.current?.isConnected() || false,
  };
};

// Hook for managing WebSocket connection state
export const useWebSocketConnection = (authToken?: string) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  
  const serviceRef = useRef<RealTimeWebSocketService | null>(null);

  useEffect(() => {
    serviceRef.current = new RealTimeWebSocketService({
      authToken,
    });

    const service = serviceRef.current;

    const unsubscribeState = service.onConnectionStateChange(setConnectionState);
    const unsubscribeError = service.onError(setError);

    return () => {
      unsubscribeState();
      unsubscribeError();
      service.disconnect();
    };
  }, [authToken]);

  const connect = useCallback(() => {
    return serviceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  return {
    connectionState,
    error,
    connect,
    disconnect,
    isConnected: serviceRef.current?.isConnected() || false,
  };
};

// Hook for specific QR code metrics
export const useQRCodeMetrics = (qrCodeId: string, autoConnect: boolean = true) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { connectionState, connect, subscribe, unsubscribe } = useRealTimeAnalytics(
    [qrCodeId],
    {
      autoConnect,
      onMetricsUpdate: (update) => {
        if (update.qrCodeId === qrCodeId) {
          setMetrics(update.metrics);
          setIsLoading(false);
        }
      },
      onError: setError,
    }
  );

  useEffect(() => {
    if (connectionState === 'connected') {
      setIsLoading(false);
    } else if (connectionState === 'error') {
      setIsLoading(false);
    }
  }, [connectionState]);

  return {
    metrics,
    isLoading,
    error,
    connectionState,
    connect,
    subscribe: () => subscribe([qrCodeId]),
    unsubscribe: () => unsubscribe([qrCodeId]),
  };
};

// Hook for analytics dashboard with multiple QR codes
export const useDashboardMetrics = (qrCodeIds: string[], refreshInterval: number = 5000) => {
  const [allMetrics, setAllMetrics] = useState<Record<string, RealTimeMetrics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { connectionState, metrics, error } = useRealTimeAnalytics(
    qrCodeIds,
    {
      autoConnect: true,
      onMetricsUpdate: () => {
        setLastUpdated(new Date());
        setIsLoading(false);
      },
    }
  );

  useEffect(() => {
    setAllMetrics(metrics);
  }, [metrics]);

  // Calculate aggregate metrics
  const metricsArray = Object.values(allMetrics) as RealTimeMetrics[];
  const aggregateMetrics = {
    totalScans: metricsArray.reduce((sum: number, m: RealTimeMetrics) => sum + (m.scansPerSecond || 0), 0),
    totalViewers: metricsArray.reduce((sum: number, m: RealTimeMetrics) => sum + (m.currentViewers || 0), 0),
    averageResponseTime: metricsArray.reduce((sum: number, m: RealTimeMetrics) => sum + (m.responseTime || 0), 0) / Math.max(metricsArray.length, 1),
    totalQRCodes: qrCodeIds.length,
    activeQRCodes: metricsArray.filter((m: RealTimeMetrics) => m.currentViewers > 0).length,
  };

  return {
    allMetrics,
    aggregateMetrics,
    isLoading,
    error,
    connectionState,
    lastUpdated,
  };
};

// Hook for real-time alerts
export const useRealTimeAlerts = (qrCodeIds: string[]) => {
  const [alerts, setAlerts] = useState<Array<{
    qrCodeId: string;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: Date;
  }>>([]);

  const { metrics } = useRealTimeAnalytics(qrCodeIds, {
    onMetricsUpdate: (update) => {
      const newAlerts = update.metrics.alerts || [];
      if (newAlerts.length > 0) {
        setAlerts((prev: any[]) => [
          ...newAlerts.map((alert: any) => ({
            qrCodeId: update.qrCodeId,
            ...alert,
          })),
          ...prev.slice(0, 49), // Keep last 50 alerts
        ]);
      }
    },
  });

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const dismissAlert = useCallback((index: number) => {
    setAlerts((prev: any[]) => prev.filter((_: any, i: number) => i !== index));
  }, []);

  return {
    alerts,
    clearAlerts,
    dismissAlert,
    hasAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter((a: any) => a.severity === 'critical').length,
  };
};