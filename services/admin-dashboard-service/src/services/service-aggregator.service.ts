import { config } from '../config/environment.config';
import { logger, logServiceCall, logPerformance } from '../utils/logger';

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  message?: string;
}

export interface ServiceCallOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export class ServiceAggregatorService {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  /**
   * Make HTTP request to service with retry logic
   */
  private static async makeRequest<T = any>(
    serviceName: string,
    url: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<ServiceResponse<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    const {
      method,
      body,
      headers = {},
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = options;

    // Default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'QR-SaaS-Admin-Dashboard/1.0.0',
      ...headers
    };

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: defaultHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        let responseData: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = { message: await response.text() };
        }

        const success = response.ok;
        
        // Log service call
        logServiceCall({
          service: serviceName,
          operation: `${method} ${url}`,
          url,
          method,
          duration,
          statusCode: response.status,
          success,
          error: success ? undefined : responseData.message || 'HTTP Error',
          retries: attempt - 1
        });

        if (success) {
          return {
            success: true,
            data: responseData,
            statusCode: response.status
          };
        } else {
          return {
            success: false,
            error: responseData.message || `HTTP ${response.status}: ${response.statusText}`,
            statusCode: response.status,
            data: responseData
          };
        }

      } catch (error: any) {
        lastError = error;
        const duration = Date.now() - startTime;
        
        // Log failed attempt
        logServiceCall({
          service: serviceName,
          operation: `${method} ${url}`,
          url,
          method,
          duration,
          success: false,
          error: error.name === 'AbortError' ? 'Timeout' : error.message,
          retries: attempt - 1
        });

        // If this is not the last attempt, wait and retry
        if (attempt <= retries) {
          logger.warn(`Service call failed, retrying in ${retryDelay}ms`, {
            service: serviceName,
            url,
            attempt,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // Last attempt failed
        break;
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError?.name === 'AbortError' 
        ? `Service timeout after ${timeout}ms`
        : lastError?.message || 'Service call failed',
      statusCode: 503
    };
  }

  /**
   * Content Service Methods
   */
  public static async getContentPosts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams(params as any).toString();
    const url = `${config.services.contentService}/posts${queryParams ? '?' + queryParams : ''}`;
    
    return this.makeRequest('content-service', url, {
      method: 'GET'
    });
  }

  public static async createContentPost(postData: any): Promise<ServiceResponse> {
    const url = `${config.services.contentService}/posts`;
    
    return this.makeRequest('content-service', url, {
      method: 'POST',
      body: postData
    });
  }

  public static async updateContentPost(postId: string, postData: any): Promise<ServiceResponse> {
    const url = `${config.services.contentService}/posts/${postId}`;
    
    return this.makeRequest('content-service', url, {
      method: 'PUT',
      body: postData
    });
  }

  public static async deleteContentPost(postId: string): Promise<ServiceResponse> {
    const url = `${config.services.contentService}/posts/${postId}`;
    
    return this.makeRequest('content-service', url, {
      method: 'DELETE'
    });
  }

  public static async getContentCategories(): Promise<ServiceResponse> {
    const url = `${config.services.contentService}/categories`;
    
    return this.makeRequest('content-service', url, {
      method: 'GET'
    });
  }

  public static async getMediaLibrary(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams(params as any).toString();
    const url = `${config.services.fileService}/media${queryParams ? '?' + queryParams : ''}`;
    
    return this.makeRequest('file-service', url, {
      method: 'GET'
    });
  }

  /**
   * User Service Methods
   */
  public static async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams(params as any).toString();
    const url = `${config.services.userService}/users${queryParams ? '?' + queryParams : ''}`;
    
    return this.makeRequest('user-service', url, {
      method: 'GET'
    });
  }

  public static async getUserById(userId: string): Promise<ServiceResponse> {
    const url = `${config.services.userService}/users/${userId}`;
    
    return this.makeRequest('user-service', url, {
      method: 'GET'
    });
  }

  public static async updateUserStatus(userId: string, status: string): Promise<ServiceResponse> {
    const url = `${config.services.userService}/users/${userId}/status`;
    
    return this.makeRequest('user-service', url, {
      method: 'PUT',
      body: { status }
    });
  }

  public static async getUserQRCodes(userId: string): Promise<ServiceResponse> {
    const url = `${config.services.qrService}/qr-codes/user/${userId}`;
    
    return this.makeRequest('qr-service', url, {
      method: 'GET'
    });
  }

  /**
   * QR Service Methods
   */
  public static async getQRCodes(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: string;
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams(params as any).toString();
    const url = `${config.services.qrService}/qr-codes${queryParams ? '?' + queryParams : ''}`;
    
    return this.makeRequest('qr-service', url, {
      method: 'GET'
    });
  }

  public static async getQRCodeById(qrCodeId: string): Promise<ServiceResponse> {
    const url = `${config.services.qrService}/qr-codes/${qrCodeId}`;
    
    return this.makeRequest('qr-service', url, {
      method: 'GET'
    });
  }

  /**
   * Analytics Service Methods
   */
  public static async getAnalyticsOverview(dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<ServiceResponse> {
    const queryParams = dateRange ? new URLSearchParams(dateRange).toString() : '';
    const url = `${config.services.analyticsService}/overview${queryParams ? '?' + queryParams : ''}`;
    
    return this.makeRequest('analytics-service', url, {
      method: 'GET'
    });
  }

  public static async getUserAnalytics(userId?: string): Promise<ServiceResponse> {
    const url = `${config.services.analyticsService}/users${userId ? '/' + userId : ''}`;
    
    return this.makeRequest('analytics-service', url, {
      method: 'GET'
    });
  }

  public static async getContentAnalytics(): Promise<ServiceResponse> {
    const url = `${config.services.analyticsService}/content`;
    
    return this.makeRequest('analytics-service', url, {
      method: 'GET'
    });
  }

  public static async getQRCodeAnalytics(): Promise<ServiceResponse> {
    const url = `${config.services.analyticsService}/qr-codes`;
    
    return this.makeRequest('analytics-service', url, {
      method: 'GET'
    });
  }

  /**
   * Notification Service Methods
   */
  public static async sendNotification(notificationData: {
    userId?: string;
    email?: string;
    type: string;
    subject: string;
    content: string;
  }): Promise<ServiceResponse> {
    const url = `${config.services.notificationService}/send`;
    
    return this.makeRequest('notification-service', url, {
      method: 'POST',
      body: notificationData
    });
  }

  public static async getNotificationHistory(params?: {
    page?: number;
    limit?: number;
    userId?: string;
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams(params as any).toString();
    const url = `${config.services.notificationService}/history${queryParams ? '?' + queryParams : ''}`;
    
    return this.makeRequest('notification-service', url, {
      method: 'GET'
    });
  }

  /**
   * Aggregate dashboard data from multiple services
   */
  public static async getDashboardOverview(): Promise<ServiceResponse> {
    const startTime = Date.now();
    
    try {
      // Make parallel requests to get overview data
      const [
        usersResult,
        qrCodesResult,
        contentResult,
        analyticsResult
      ] = await Promise.allSettled([
        this.getUsers({ limit: 1 }), // Just get count
        this.getQRCodes({ limit: 1 }), // Just get count
        this.getContentPosts({ limit: 1 }), // Just get count
        this.getAnalyticsOverview()
      ]);

      const dashboardData = {
        overview: {
          timestamp: new Date().toISOString(),
          services: {
            users: usersResult.status === 'fulfilled' ? usersResult.value.success : false,
            qrCodes: qrCodesResult.status === 'fulfilled' ? qrCodesResult.value.success : false,
            content: contentResult.status === 'fulfilled' ? contentResult.value.success : false,
            analytics: analyticsResult.status === 'fulfilled' ? analyticsResult.value.success : false
          }
        },
        data: {
          users: usersResult.status === 'fulfilled' && usersResult.value.success 
            ? usersResult.value.data 
            : { error: 'Failed to fetch user data' },
          qrCodes: qrCodesResult.status === 'fulfilled' && qrCodesResult.value.success 
            ? qrCodesResult.value.data 
            : { error: 'Failed to fetch QR code data' },
          content: contentResult.status === 'fulfilled' && contentResult.value.success 
            ? contentResult.value.data 
            : { error: 'Failed to fetch content data' },
          analytics: analyticsResult.status === 'fulfilled' && analyticsResult.value.success 
            ? analyticsResult.value.data 
            : { error: 'Failed to fetch analytics data' }
        }
      };

      const duration = Date.now() - startTime;
      
      logPerformance({
        operation: 'getDashboardOverview',
        duration,
        success: true,
        metadata: {
          servicesConnected: Object.values(dashboardData.overview.services).filter(Boolean).length,
          totalServices: Object.keys(dashboardData.overview.services).length
        }
      });

      return {
        success: true,
        data: dashboardData
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logPerformance({
        operation: 'getDashboardOverview',
        duration,
        success: false,
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to aggregate dashboard data',
        statusCode: 500
      };
    }
  }

  /**
   * Health check all connected services
   */
  public static async checkServicesHealth(): Promise<ServiceResponse> {
    const services = [
      { name: 'content-service', url: config.services.contentService },
      { name: 'user-service', url: config.services.userService },
      { name: 'qr-service', url: config.services.qrService },
      { name: 'analytics-service', url: config.services.analyticsService },
      { name: 'file-service', url: config.services.fileService },
      { name: 'notification-service', url: config.services.notificationService }
    ];

    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        const result = await this.makeRequest(service.name, `${service.url}/health`, {
          method: 'GET',
          timeout: 5000,
          retries: 1
        });
        
        return {
          name: service.name,
          url: service.url,
          status: result.success ? 'healthy' : 'unhealthy',
          error: result.error,
          statusCode: result.statusCode
        };
      })
    );

    const healthData = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index].name,
          url: services[index].url,
          status: 'unhealthy',
          error: 'Health check failed'
        };
      }
    });

    const healthyCount = healthData.filter(service => service.status === 'healthy').length;
    
    return {
      success: true,
      data: {
        summary: {
          total: healthData.length,
          healthy: healthyCount,
          unhealthy: healthData.length - healthyCount,
          overallStatus: healthyCount === healthData.length ? 'healthy' : 'degraded'
        },
        services: healthData
      }
    };
  }
}