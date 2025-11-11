export type AdminRole = 'super_admin' | 'content_admin' | 'user_admin' | 'analytics_admin' | 'support_admin';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  permissions: string[];
  is_active: boolean;
  last_login_at?: string;
  login_attempts: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  admin?: {
    id: string;
    email: string;
    fullName: string;  // Backend sends fullName
    role: AdminRole;
    permissions: string[];
    lastLoginAt?: string | Date;  // Backend sends lastLoginAt
  };
  token?: string;
  expiresAt?: string;  // Backend sends expiresAt
}

export interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: AdminRole) => boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Content Management Types
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  template: string;
  status: 'draft' | 'published' | 'archived';
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  url: string;
  alt_text?: string;
  caption?: string;
  uploaded_by: string;
  created_at: string;
}

// Dashboard Statistics
export interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_today: number;
  };
  qr_codes: {
    total: number;
    scans_today: number;
    most_popular: string;
  };
  content: {
    posts: number;
    pages: number;
    media_files: number;
  };
  system: {
    storage_used: string;
    api_calls_today: number;
    uptime: string;
  };
}

// IP Management Types
export interface IPConfig {
  enabled: boolean;
  allowedIPs: string[];
  allowPrivateNetworks: boolean;
  allowLocalhost: boolean;
}

export interface IPTestResult {
  ip: string;
  allowed: boolean;
  reason: string;
}