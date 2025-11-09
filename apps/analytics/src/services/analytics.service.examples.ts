import { analyticsService } from './analytics.service';

/**
 * Example usage of Analytics Service
 * This demonstrates how to use the analyticsService in React components
 */

// Example: Get analytics for a specific QR code
export const getQRAnalyticsExample = async (qrId: string) => {
  try {
    const response = await analyticsService.getQRAnalytics(qrId);
    
    if (response.success && response.data) {
      const analytics = response.data;
      console.log('Analytics Data:', {
        totalScans: analytics.totalScans,
        uniqueScans: analytics.uniqueScans,
        platforms: analytics.platformBreakdown,
        countries: analytics.geographicData,
        timeSeries: analytics.timeSeriesData,
      });
      return analytics;
    } else {
      console.error('Failed to fetch analytics:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
};

// Example: Get user's all QR analytics  
export const getUserAnalyticsExample = async () => {
  try {
    const response = await analyticsService.getUserAnalytics();
    
    if (response.success && response.data) {
      const allAnalytics = response.data;
      console.log(`Found analytics for ${allAnalytics.length} QR codes`);
      
      // Calculate totals across all QR codes
      const totalScans = allAnalytics.reduce((sum, analytics) => sum + analytics.totalScans, 0);
      const totalUnique = allAnalytics.reduce((sum, analytics) => sum + analytics.uniqueScans, 0);
      
      console.log('Summary:', { totalScans, totalUnique });
      return allAnalytics;
    } else {
      console.error('Failed to fetch user analytics:', response.error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return [];
  }
};

// Example: Get dashboard summary
export const getDashboardSummaryExample = async (timeRange: string = '30d') => {
  try {
    const response = await analyticsService.getDashboardSummary(timeRange);
    
    if (response.success && response.data) {
      const summary = response.data;
      console.log('Dashboard Summary:', summary);
      return summary;
    } else {
      console.error('Failed to fetch dashboard summary:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return null;
  }
};

// Example: Get heatmap data
export const getHeatmapExample = async (qrId: string, type: 'geographic' | 'temporal' = 'geographic') => {
  try {
    const response = await analyticsService.getHeatmapData(qrId, type);
    
    if (response.success && response.data) {
      const heatmapData = response.data;
      console.log(`${type} heatmap data:`, heatmapData);
      return heatmapData;
    } else {
      console.error('Failed to fetch heatmap data:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return null;
  }
};

// Example: Get real-time analytics
export const getRealTimeExample = async (qrId?: string) => {
  try {
    const response = await analyticsService.getRealtimeAnalytics(qrId);
    
    if (response.success && response.data) {
      const realTimeData = response.data;
      console.log('Real-time analytics:', {
        activeUsers: realTimeData.currentActiveUsers,
        scansLast5Min: realTimeData.scansLast5Minutes,
        scansToday: realTimeData.scansToday,
        recentScans: realTimeData.recentScans?.slice(0, 3), // Show first 3
      });
      return realTimeData;
    } else {
      console.error('Failed to fetch real-time analytics:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    return null;
  }
};

// Example: Export analytics
export const exportAnalyticsExample = async (format: 'csv' | 'excel' | 'pdf' = 'csv') => {
  try {
    const response = await analyticsService.exportAnalytics(format);
    
    if (response.success && response.data) {
      const exportResult = response.data;
      console.log(`Export URL: ${exportResult.download_url}`);
      
      // In a real app, you might trigger a download here
      if (typeof window !== 'undefined') {
        window.open(exportResult.download_url, '_blank');
      }
      
      return exportResult;
    } else {
      console.error('Failed to export analytics:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    return null;
  }
};

// Example: Track a scan (when a QR code is scanned)
export const trackScanExample = async (qrCodeId: string, scanData?: {
  userAgent?: string;
  location?: { city?: string; country?: string };
  platform?: string;
}) => {
  try {
    const trackData = {
      qrCodeId,
      ipAddress: '192.168.1.1', // In real app, get from request
      userAgent: scanData?.userAgent || navigator.userAgent,
      location: scanData?.location,
      platform: scanData?.platform || 'web',
      device: /Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      referrer: typeof window !== 'undefined' ? document.referrer : undefined,
    };

    const response = await analyticsService.trackScan(trackData);
    
    if (response.success && response.data) {
      console.log(`Scan tracked with event ID: ${response.data.eventId}`);
      return response.data.eventId;
    } else {
      console.error('Failed to track scan:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error tracking scan:', error);
    return null;
  }
};

// Example: React Hook usage pattern
export const useAnalyticsData = (qrId: string) => {
  // This would be used in a React component
  // const [analyticsData, setAnalyticsData] = useState(null);
  // const [loading, setLoading] = useState(true);
  
  // useEffect(() => {
  //   const fetchData = async () => {
  //     setLoading(true);
  //     const data = await getQRAnalyticsExample(qrId);
  //     setAnalyticsData(data);
  //     setLoading(false);
  //   };
  //   
  //   fetchData();
  // }, [qrId]);
  
  // return { analyticsData, loading };
};

// Example: Time range helper usage
export const getTimeRangeExample = () => {
  const ranges = ['today', '7days', '30days', '90days'] as const;
  
  ranges.forEach(range => {
    const timeRange = analyticsService.getAnalyticsTimeRange(range);
    console.log(`${range}:`, {
      from: timeRange.startDate.toISOString().split('T')[0],
      to: timeRange.endDate.toISOString().split('T')[0],
    });
  });
};