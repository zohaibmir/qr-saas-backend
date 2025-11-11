import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { LoginRequest, LoginResponse, ApiResponse, AdminUser, DashboardStats, IPConfig, IPTestResult } from '../types/admin';

class AdminApiService {
  private api: AxiosInstance;
  private authApi: AxiosInstance;

  constructor() {
    // Main API instance for authenticated routes
    this.api = axios.create({
      baseURL: '/api', // This will proxy to http://localhost:3013/api
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Separate instance for auth routes (no /api prefix)
    this.authApi = axios.create({
      baseURL: '/', // This will proxy to http://localhost:3013/
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle common errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication APIs
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.authApi.post<LoginResponse>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Network error occurred. Please try again.',
      };
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.authApi.post<ApiResponse>('/auth/logout');
      return response.data;
    } catch {
      // Even if logout fails on server, clear local storage
      return { success: true, message: 'Logged out successfully' };
    }
  }

  async getProfile(): Promise<ApiResponse<AdminUser>> {
    try {
      const response = await this.authApi.get<ApiResponse<AdminUser>>('/auth/me');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to fetch profile',
      };
    }
  }

  async refreshToken(): Promise<LoginResponse> {
    try {
      const response = await this.authApi.post<LoginResponse>('/auth/refresh');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to refresh token',
      };
    }
  }

  // Dashboard APIs
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const response = await this.api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to fetch dashboard statistics',
      };
    }
  }

  // Content Management APIs
  async getContent(type: 'posts' | 'pages', params?: { page?: number; limit?: number; status?: string; search?: string }) {
    try {
      const response = await this.api.get<ApiResponse>(`/content/${type}`, { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Failed to fetch content' };
    }
  }

  async getContentById(type: 'posts' | 'pages', id: string) {
    try {
      const response = await this.api.get<ApiResponse>(`/content/${type}/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return { success: false, message: 'Failed to fetch content item' };
    }
  }

  async createContent(type: 'posts' | 'pages', data: unknown) {
    try {
      const response = await this.api.post(`/content/${type}`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: `Failed to create ${type.slice(0, -1)}`,
      };
    }
  }

  async updateContent(type: 'posts' | 'pages', id: string, data: unknown) {
    try {
      const response = await this.api.put(`/content/${type}/${id}`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: `Failed to update ${type.slice(0, -1)}`,
      };
    }
  }

  async deleteContent(type: 'posts' | 'pages', id: string) {
    try {
      const response = await this.api.delete(`/content/${type}/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: `Failed to delete ${type.slice(0, -1)}`,
      };
    }
  }

  // Media APIs
  async getMediaFiles(params?: { page?: number; limit?: number; type?: string; search?: string }) {
    try {
      const response = await this.api.get('/media', { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to fetch media files',
      };
    }
  }

  async uploadMedia(file: File, metadata?: { alt_text?: string; caption?: string }) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (metadata?.alt_text) {
        formData.append('alt_text', metadata.alt_text);
      }
      if (metadata?.caption) {
        formData.append('caption', metadata.caption);
      }

      const response = await this.api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to upload media file',
      };
    }
  }

  async deleteMedia(id: string) {
    try {
      const response = await this.api.delete(`/media/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to delete media file',
      };
    }
  }

  // User Management APIs
  async getUsers(params?: { page?: number; limit?: number; role?: string; status?: string }) {
    try {
      const response = await this.api.get('/users', { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to fetch users',
      };
    }
  }

  // Analytics APIs
  async getAnalytics(params?: { 
    date_from?: string; 
    date_to?: string; 
    metric?: string; 
  }) {
    try {
      const response = await this.api.get('/analytics', { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to fetch analytics data',
      };
    }
  }

  // IP Management APIs
  async getIPConfig(): Promise<ApiResponse<IPConfig>> {
    try {
      const response = await this.api.get('/admin/ip-config');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to fetch IP configuration',
      };
    }
  }

  async updateIPConfig(config: Partial<IPConfig>): Promise<ApiResponse<IPConfig>> {
    try {
      const response = await this.api.put('/admin/ip-config', config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to update IP configuration',
      };
    }
  }

  async testIP(ip: string): Promise<ApiResponse<IPTestResult>> {
    try {
      const response = await this.api.post('/admin/ip-config/test', { ip });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Failed to test IP address',
      };
    }
  }
}

export const adminApi = new AdminApiService();