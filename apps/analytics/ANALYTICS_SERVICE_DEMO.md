# Analytics Service - Complete Demonstration Guide

This document provides a comprehensive demonstration of the Analytics Service, showing how to use all features and integrate with your QR SaaS platform.

## 🎯 Table of Contents

1. [Quick Start Demo](#quick-start-demo)
2. [Service Integration Examples](#service-integration-examples)
3. [React Components Demo](#react-components-demo)
4. [Real-time Analytics Demo](#real-time-analytics-demo)
5. [Advanced Features Demo](#advanced-features-demo)
6. [Backend Integration Demo](#backend-integration-demo)
7. [Database Schema & Dummy Data](#database-schema--dummy-data)
8. [Performance Testing](#performance-testing)

## 🚀 Quick Start Demo

### 1. Environment Setup

```bash
# Navigate to analytics app
cd /private/var/www/qrgeneration/apps/analytics

# Install dependencies (if not already done)
npm install

# Copy environment configuration
cp .env.example .env.local

# Edit environment variables
vim .env.local
```

### 2. Basic Service Usage

```typescript
import { analyticsService } from './src/services/analytics.service';

// Demo 1: Get analytics for a specific QR code
async function demoBasicAnalytics() {
  console.log('🔍 Demo: Basic Analytics');
  
  const qrId = 'qr_demo_001';
  const result = await analyticsService.getQRAnalytics(qrId);
  
  if (result.success && result.data) {
    console.log(`📊 QR Code ${qrId} Analytics:`);
    console.log(`   Total Scans: ${result.data.totalScans}`);
    console.log(`   Unique Scans: ${result.data.uniqueScans}`);
    console.log(`   Platform Breakdown:`, result.data.platformBreakdown);
    console.log(`   Geographic Data:`, result.data.geographicData.slice(0, 3));
    console.log(`   Recent Activity:`, result.data.timeSeriesData.slice(0, 5));
  }
}

// Demo 2: Get all user analytics
async function demoUserAnalytics() {
  console.log('👤 Demo: User Analytics');
  
  const result = await analyticsService.getUserAnalytics();
  
  if (result.success && result.data) {
    console.log(`📈 Found ${result.data.length} QR codes with analytics`);
    
    const totalScans = result.data.reduce((sum, analytics) => sum + analytics.totalScans, 0);
    const totalUnique = result.data.reduce((sum, analytics) => sum + analytics.uniqueScans, 0);
    
    console.log(`   Combined Total Scans: ${totalScans}`);
    console.log(`   Combined Unique Scans: ${totalUnique}`);
    console.log(`   Average Scans per QR: ${Math.round(totalScans / result.data.length)}`);
  }
}

// Demo 3: Dashboard summary
async function demoDashboardSummary() {
  console.log('📊 Demo: Dashboard Summary');
  
  const result = await analyticsService.getDashboardSummary('30d');
  
  if (result.success && result.data) {
    const summary = result.data.summary;
    console.log(`   Total QR Codes: ${summary.totalQRCodes}`);
    console.log(`   Total Scans: ${summary.totalScans}`);
    console.log(`   Unique Scans: ${summary.totalUniqueScans}`);
    console.log(`   Avg Conversion Rate: ${summary.averageConversionRate.toFixed(2)}%`);
    console.log(`   Top Performing QR: ${summary.topPerformingQR.qrCodeId} (${summary.topPerformingQR.scans} scans)`);
  }
}

// Run all basic demos
async function runBasicDemos() {
  await demoBasicAnalytics();
  console.log('\n' + '='.repeat(50) + '\n');
  await demoUserAnalytics();
  console.log('\n' + '='.repeat(50) + '\n');
  await demoDashboardSummary();
}
```

## 🧩 Service Integration Examples

### Complete Analytics Dashboard Component

```typescript
import React, { useState, useEffect } from 'react';
import { 
  analyticsService, 
  useRealTimeAnalytics, 
  useDashboardMetrics,
  formatAnalyticsNumber,
  formatAnalyticsPercentage
} from '@qr-saas/analytics-app';

interface AnalyticsDashboardProps {
  qrCodeIds: string[];
  timeRange?: '7d' | '30d' | '90d';
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  qrCodeIds, 
  timeRange = '30d' 
}) => {
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time metrics
  const {
    connectionState,
    metrics,
    error: wsError
  } = useRealTimeAnalytics(qrCodeIds, {
    autoConnect: true,
    onMetricsUpdate: (update) => {
      console.log(`📡 Real-time update for ${update.qrCodeId}:`, update.metrics);
    }
  });

  // Dashboard aggregated metrics
  const {
    aggregateMetrics,
    isLoading: metricsLoading,
    lastUpdated
  } = useDashboardMetrics(qrCodeIds);

  // Load initial analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const results = await analyticsService.getUserAnalytics();
        
        if (results.success && results.data) {
          setAnalyticsData(results.data);
        } else {
          setError(results.error?.message || 'Failed to load analytics');
        }
      } catch (err) {
        setError('Error loading analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeRange]);

  if (loading && metricsLoading) {
    return (
      <div className="analytics-dashboard loading">
        <h2>📊 Analytics Dashboard</h2>
        <p>Loading analytics data...</p>
        <div className="loading-spinner">⏳</div>
      </div>
    );
  }

  if (error || wsError) {
    return (
      <div className="analytics-dashboard error">
        <h2>❌ Analytics Dashboard</h2>
        <p>Error: {error || wsError?.message}</p>
        <button onClick={() => window.location.reload()}>
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <header className="dashboard-header">
        <h2>📊 Analytics Dashboard</h2>
        <div className="connection-status">
          <span className={`status ${connectionState}`}>
            {connectionState === 'connected' ? '🟢' : connectionState === 'connecting' ? '🟡' : '🔴'} 
            {connectionState}
          </span>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <h3>🎯 Total QR Codes</h3>
          <div className="metric">{aggregateMetrics.totalQRCodes}</div>
        </div>
        <div className="card">
          <h3>👥 Active Users</h3>
          <div className="metric">{formatAnalyticsNumber(aggregateMetrics.totalViewers)}</div>
        </div>
        <div className="card">
          <h3>⚡ Scans/Second</h3>
          <div className="metric">{aggregateMetrics.totalScans.toFixed(1)}</div>
        </div>
        <div className="card">
          <h3>⏱️ Avg Response Time</h3>
          <div className="metric">{aggregateMetrics.averageResponseTime.toFixed(0)}ms</div>
        </div>
      </div>

      {/* Individual QR Code Metrics */}
      <div className="qr-codes-grid">
        {analyticsData.map((qrAnalytics, index) => {
          const realTimeMetrics = metrics[`qr_${index + 1}`]; // Assuming QR IDs match
          
          return (
            <div key={`qr_${index + 1}`} className="qr-card">
              <h4>QR Code #{index + 1}</h4>
              
              <div className="metrics-row">
                <div className="metric-item">
                  <span className="label">Total Scans:</span>
                  <span className="value">{formatAnalyticsNumber(qrAnalytics.totalScans)}</span>
                </div>
                <div className="metric-item">
                  <span className="label">Unique Scans:</span>
                  <span className="value">{formatAnalyticsNumber(qrAnalytics.uniqueScans)}</span>
                </div>
              </div>

              {realTimeMetrics && (
                <div className="real-time-metrics">
                  <h5>📡 Live Metrics</h5>
                  <div className="live-stats">
                    <span>👁️ {realTimeMetrics.currentViewers} viewing</span>
                    <span>⚡ {realTimeMetrics.scansPerSecond}/sec</span>
                    <span>📊 {realTimeMetrics.responseTime}ms</span>
                  </div>
                </div>
              )}

              <div className="platform-breakdown">
                <h5>📱 Platforms</h5>
                {Object.entries(qrAnalytics.platformBreakdown).map(([platform, count]) => (
                  <div key={platform} className="platform-stat">
                    <span className="platform-name">{platform}:</span>
                    <span className="platform-count">{formatAnalyticsNumber(count as number)}</span>
                  </div>
                ))}
              </div>

              <div className="geographic-data">
                <h5>🌍 Top Countries</h5>
                {qrAnalytics.geographicData.slice(0, 3).map((geo: any) => (
                  <div key={geo.country} className="geo-stat">
                    <span className="country-name">{geo.country}:</span>
                    <span className="country-count">{formatAnalyticsNumber(geo.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

## ⚡ Real-time Analytics Demo

### WebSocket Connection Demo

```typescript
import { RealTimeWebSocketService } from '@qr-saas/analytics-app';

async function demoRealTimeAnalytics() {
  console.log('🔌 Demo: Real-time Analytics WebSocket');
  
  // Initialize WebSocket service
  const wsService = new RealTimeWebSocketService({
    authToken: localStorage.getItem('qr-saas-auth-token') || undefined,
    autoReconnect: true,
    heartbeatInterval: 30000
  });

  // Set up event listeners
  wsService.onConnectionStateChange((state) => {
    console.log(`🔗 Connection state changed: ${state}`);
  });

  wsService.onMetricsUpdate((update) => {
    console.log(`📊 Metrics update for ${update.qrCodeId}:`, {
      activeUsers: update.metrics.currentViewers,
      scansPerSecond: update.metrics.scansPerSecond,
      responseTime: update.metrics.responseTime,
      timestamp: new Date(update.timestamp).toLocaleTimeString()
    });
  });

  wsService.onSnapshotUpdate((snapshot) => {
    console.log(`📸 Snapshot update:`, {
      qrCodeId: snapshot.qrCodeId,
      totalScans: snapshot.realTimeMetrics.activeScans,
      recentActivity: snapshot.recentActivity.length
    });
  });

  wsService.onError((error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  try {
    // Connect to WebSocket server
    console.log('🔌 Connecting to WebSocket...');
    await wsService.connect();
    
    // Subscribe to multiple QR codes
    const qrCodeIds = ['qr_demo_001', 'qr_demo_002', 'qr_demo_003'];
    wsService.subscribeToMetrics(qrCodeIds, ['scans', 'conversions', 'geographic']);
    
    console.log(`📡 Subscribed to metrics for: ${qrCodeIds.join(', ')}`);
    console.log('⏳ Listening for real-time updates...');
    
    // Simulate running for 30 seconds
    setTimeout(() => {
      console.log('🛑 Stopping real-time demo...');
      wsService.unsubscribeFromMetrics();
      wsService.disconnect();
    }, 30000);
    
  } catch (error) {
    console.error('❌ Failed to connect:', error);
  }
}
```

## 🎨 Advanced Features Demo

### Heatmap Data Demo

```typescript
async function demoHeatmapAnalytics() {
  console.log('🗺️ Demo: Heatmap Analytics');
  
  const qrId = 'qr_demo_001';
  
  // Geographic Heatmap
  console.log('\n📍 Geographic Heatmap:');
  const geoHeatmap = await analyticsService.getHeatmapData(qrId, 'geographic');
  if (geoHeatmap.success && geoHeatmap.data) {
    console.log(`   QR Code: ${geoHeatmap.data.qrCodeId}`);
    console.log(`   Type: ${geoHeatmap.data.type}`);
    console.log(`   Data Points: ${geoHeatmap.data.points?.length || 0}`);
    
    // Show sample points
    if (geoHeatmap.data.points) {
      console.log('   Sample Geographic Points:');
      geoHeatmap.data.points.slice(0, 5).forEach((point: any, i: number) => {
        console.log(`     ${i + 1}. Lat: ${point.lat.toFixed(4)}, Lng: ${point.lng.toFixed(4)}, Intensity: ${point.intensity.toFixed(3)}`);
      });
    }
  }
  
  // Temporal Heatmap
  console.log('\n⏰ Temporal Heatmap:');
  const tempHeatmap = await analyticsService.getHeatmapData(qrId, 'temporal');
  if (tempHeatmap.success && tempHeatmap.data) {
    console.log(`   QR Code: ${tempHeatmap.data.qrCodeId}`);
    console.log(`   Type: ${tempHeatmap.data.type}`);
    
    if (tempHeatmap.data.hours) {
      console.log('   Hourly Intensity (top 5):');
      tempHeatmap.data.hours
        .sort((a: any, b: any) => b.intensity - a.intensity)
        .slice(0, 5)
        .forEach((hour: any, i: number) => {
          console.log(`     ${i + 1}. Hour ${hour.hour}:00 - Intensity: ${hour.intensity.toFixed(3)}`);
        });
    }
  }
}
```

### Peak Time Analysis Demo

```typescript
async function demoPeakTimeAnalysis() {
  console.log('⏰ Demo: Peak Time Analysis');
  
  const qrId = 'qr_demo_001';
  const result = await analyticsService.getPeakTimeAnalysis(qrId);
  
  if (result.success && result.data) {
    console.log(`📊 Peak Time Analysis for ${qrId}:`);
    
    // Peak Hours
    console.log('\n🌅 Peak Hours:');
    result.data.peakHours
      .sort((a: any, b: any) => b.scans - a.scans)
      .slice(0, 5)
      .forEach((hour: any, i: number) => {
        const timeStr = `${hour.hour.toString().padStart(2, '0')}:00`;
        console.log(`   ${i + 1}. ${timeStr} - ${hour.scans} scans`);
      });
    
    // Peak Days
    console.log('\n📅 Peak Days:');
    result.data.peakDays
      .sort((a: any, b: any) => b.scans - a.scans)
      .forEach((day: any, i: number) => {
        console.log(`   ${i + 1}. ${day.day} - ${day.scans} scans`);
      });
  }
}
```

### Conversion Tracking Demo

```typescript
async function demoConversionAnalytics() {
  console.log('🎯 Demo: Conversion Analytics');
  
  const qrId = 'qr_demo_001';
  const result = await analyticsService.getConversionTracking(qrId);
  
  if (result.success && result.data) {
    console.log(`📈 Conversion Analytics for ${qrId}:`);
    console.log(`   Total Conversions: ${result.data.totalConversions}`);
    console.log(`   Conversion Rate: ${result.data.conversionRate.toFixed(2)}%`);
    
    console.log('\n🎯 Conversions by Goal:');
    result.data.conversionsByGoal.forEach((goal: any, i: number) => {
      console.log(`   ${i + 1}. ${goal.goal}: ${goal.conversions} conversions`);
    });
  }
}
```

### Export Functionality Demo

```typescript
async function demoExportFeatures() {
  console.log('📤 Demo: Export Features');
  
  const formats = ['csv', 'excel', 'pdf'] as const;
  
  for (const format of formats) {
    console.log(`\n📊 Exporting as ${format.toUpperCase()}:`);
    
    const result = await analyticsService.exportAnalytics(format);
    if (result.success && result.data) {
      console.log(`   ✅ Export successful!`);
      console.log(`   📁 Download URL: ${result.data.download_url}`);
      console.log(`   🕒 Generated at: ${new Date().toLocaleTimeString()}`);
      
      // In a real app, you would trigger the download
      // window.open(result.data.download_url, '_blank');
    } else {
      console.log(`   ❌ Export failed: ${result.error?.message}`);
    }
  }
}
```

## 🗃️ Database Integration Demo

### Scan Tracking Simulation

```typescript
async function demoScanTracking() {
  console.log('📱 Demo: Scan Tracking Simulation');
  
  const qrCodes = ['qr_demo_001', 'qr_demo_002', 'qr_demo_003'];
  const platforms = ['mobile', 'desktop', 'tablet'];
  const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France'];
  const devices = ['iPhone', 'Android', 'Chrome Desktop', 'Safari Desktop', 'iPad'];
  
  console.log('🚀 Simulating 10 scan events...');
  
  for (let i = 0; i < 10; i++) {
    const scanData = {
      qrCodeId: qrCodes[Math.floor(Math.random() * qrCodes.length)],
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: `Mozilla/5.0 (Demo User Agent ${i + 1})`,
      location: {
        country: countries[Math.floor(Math.random() * countries.length)],
        city: 'Demo City',
        latitude: 40.7128 + (Math.random() - 0.5) * 10,
        longitude: -74.0060 + (Math.random() - 0.5) * 10
      },
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      device: devices[Math.floor(Math.random() * devices.length)],
      referrer: i % 3 === 0 ? 'https://google.com' : undefined
    };
    
    const result = await analyticsService.trackScan(scanData);
    if (result.success) {
      console.log(`   ✅ Scan ${i + 1}: ${scanData.qrCodeId} from ${scanData.location.country} (${result.data.eventId})`);
    } else {
      console.log(`   ❌ Scan ${i + 1}: Failed to track`);
    }
    
    // Small delay between scans
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ Scan tracking simulation completed!');
}
```

## 🧪 Performance Testing Demo

```typescript
async function demoPerformanceTesting() {
  console.log('⚡ Demo: Performance Testing');
  
  const startTime = Date.now();
  const qrId = 'qr_demo_001';
  
  console.log('🚀 Running performance tests...');
  
  // Test 1: Multiple concurrent analytics requests
  console.log('\n📊 Test 1: Concurrent Analytics Requests');
  const promises = Array.from({ length: 5 }, (_, i) => 
    analyticsService.getQRAnalytics(`qr_demo_${i.toString().padStart(3, '0')}`)
  );
  
  const concurrentStart = Date.now();
  const results = await Promise.all(promises);
  const concurrentTime = Date.now() - concurrentStart;
  
  console.log(`   ✅ Completed 5 concurrent requests in ${concurrentTime}ms`);
  console.log(`   📈 Success rate: ${results.filter(r => r.success).length}/5`);
  
  // Test 2: Rapid sequential requests
  console.log('\n⚡ Test 2: Rapid Sequential Requests');
  const sequentialStart = Date.now();
  
  for (let i = 0; i < 5; i++) {
    const result = await analyticsService.getQRAnalytics(qrId);
    if (result.success) {
      console.log(`   Request ${i + 1}: ✅ ${Date.now() - sequentialStart}ms`);
    } else {
      console.log(`   Request ${i + 1}: ❌ Failed`);
    }
  }
  
  const sequentialTime = Date.now() - sequentialStart;
  console.log(`   ⏱️ Total sequential time: ${sequentialTime}ms`);
  
  // Test 3: Different service methods
  console.log('\n🎯 Test 3: Service Methods Performance');
  const methods = [
    { name: 'getUserAnalytics', fn: () => analyticsService.getUserAnalytics() },
    { name: 'getDashboardSummary', fn: () => analyticsService.getDashboardSummary() },
    { name: 'getPeakTimeAnalysis', fn: () => analyticsService.getPeakTimeAnalysis(qrId) },
    { name: 'getRealtimeAnalytics', fn: () => analyticsService.getRealtimeAnalytics(qrId) }
  ];
  
  for (const method of methods) {
    const methodStart = Date.now();
    const result = await method.fn();
    const methodTime = Date.now() - methodStart;
    
    console.log(`   ${method.name}: ${result.success ? '✅' : '❌'} ${methodTime}ms`);
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`\n🏁 Performance testing completed in ${totalTime}ms`);
}
```

## 🎮 Interactive Demo Runner

```typescript
// Main demo runner function
export async function runAnalyticsDemo(options: {
  includeBasic?: boolean;
  includeRealTime?: boolean;
  includeAdvanced?: boolean;
  includePerformance?: boolean;
  includeScanTracking?: boolean;
} = {}) {
  const {
    includeBasic = true,
    includeRealTime = true,
    includeAdvanced = true,
    includePerformance = false,
    includeScanTracking = true
  } = options;

  console.log('🎯 Starting Analytics Service Demonstration');
  console.log('=' * 60);

  try {
    if (includeBasic) {
      console.log('\n🚀 BASIC ANALYTICS DEMO');
      console.log('-' * 30);
      await runBasicDemos();
    }

    if (includeScanTracking) {
      console.log('\n📱 SCAN TRACKING DEMO');
      console.log('-' * 30);
      await demoScanTracking();
    }

    if (includeAdvanced) {
      console.log('\n🎨 ADVANCED FEATURES DEMO');
      console.log('-' * 30);
      await demoHeatmapAnalytics();
      await demoPeakTimeAnalysis();
      await demoConversionAnalytics();
      await demoExportFeatures();
    }

    if (includeRealTime) {
      console.log('\n⚡ REAL-TIME ANALYTICS DEMO');
      console.log('-' * 30);
      console.log('⚠️  Note: Real-time demo will run for 30 seconds');
      await demoRealTimeAnalytics();
    }

    if (includePerformance) {
      console.log('\n🧪 PERFORMANCE TESTING DEMO');
      console.log('-' * 30);
      await demoPerformanceTesting();
    }

    console.log('\n🎉 All demonstrations completed successfully!');
    console.log('=' * 60);

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Usage examples:
// runAnalyticsDemo(); // Run all demos
// runAnalyticsDemo({ includeRealTime: false }); // Skip real-time demo
// runAnalyticsDemo({ includePerformance: true }); // Include performance tests
```

## 💻 CSS Styles for Demo Components

```css
/* Analytics Dashboard Styles */
.analytics-dashboard {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.connection-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 14px;
}

.status {
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.status.connected { background: #d1fae5; color: #065f46; }
.status.connecting { background: #fef3c7; color: #92400e; }
.status.disconnected { background: #fee2e2; color: #991b1b; }

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.card h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

.card .metric {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.qr-codes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.qr-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.qr-card h4 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #111827;
  font-weight: 600;
}

.metrics-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.metric-item {
  display: flex;
  flex-direction: column;
}

.metric-item .label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.metric-item .value {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.real-time-metrics {
  background: #f3f4f6;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.real-time-metrics h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #374151;
  font-weight: 600;
}

.live-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.live-stats span {
  background: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  border: 1px solid #d1d5db;
}

.platform-breakdown, .geographic-data {
  margin-top: 16px;
}

.platform-breakdown h5, .geographic-data h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #374151;
  font-weight: 600;
}

.platform-stat, .geo-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.platform-stat:last-child, .geo-stat:last-child {
  border-bottom: none;
}

.platform-name, .country-name {
  font-size: 14px;
  color: #6b7280;
}

.platform-count, .country-count {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.loading-spinner {
  animation: spin 1s linear infinite;
  font-size: 24px;
  text-align: center;
  margin: 20px 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error {
  text-align: center;
  color: #dc2626;
  padding: 40px;
}

.error button {
  background: #dc2626;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 16px;
}

.error button:hover {
  background: #b91c1c;
}
```

This comprehensive demonstration guide shows every aspect of the Analytics Service with practical examples, interactive demos, and production-ready React components!