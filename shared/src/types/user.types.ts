export interface User {
  id: string;
  email: string;
  password?: string; // Optional for responses, required for creation
  name: string;
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise';
  isEmailVerified: boolean;
  isActive: boolean; // Added for auth service
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}