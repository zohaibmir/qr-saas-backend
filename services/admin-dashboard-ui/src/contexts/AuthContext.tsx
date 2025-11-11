import React, { useState, useEffect, ReactNode } from 'react';
import type { AdminUser, AuthContextType, AdminRole } from '../types/admin';
import { adminApi } from '../services/adminApi';
import { message } from 'antd';
import { AuthContext } from './AuthContextDef';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('admin_token');
      const savedAdmin = localStorage.getItem('admin_user');

      if (savedToken && savedAdmin) {
        try {
          setToken(savedToken);
          setAdmin(JSON.parse(savedAdmin));
          
          // Verify token is still valid
          const profileResponse = await adminApi.getProfile();
          if (!profileResponse.success) {
            // Token is invalid, clear auth state
            clearAuthState();
          } else if (profileResponse.data) {
            // Update admin data with latest from server
            setAdmin(profileResponse.data);
            localStorage.setItem('admin_user', JSON.stringify(profileResponse.data));
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          clearAuthState();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const clearAuthState = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await adminApi.login({ email, password });
      
      if (response.success && response.admin && response.token) {
        const adminUser: AdminUser = {
          id: response.admin.id,
          email: response.admin.email,
          full_name: response.admin.fullName,  // Map fullName to full_name
          role: response.admin.role,
          permissions: response.admin.permissions || [],
          is_active: true,
          login_attempts: 0,
          created_at: '',
          updated_at: '',
          last_login_at: response.admin.lastLoginAt ? 
            (typeof response.admin.lastLoginAt === 'string' ? 
              response.admin.lastLoginAt : 
              response.admin.lastLoginAt.toISOString()
            ) : undefined,
        };

        setAdmin(adminUser);
        setToken(response.token);
        localStorage.setItem('admin_token', response.token);
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
        
        message.success('Login successful!');
      } else {
        message.error(response.message || 'Login failed');
      }
      
      setLoading(false);
      return response;
    } catch {
      const errorMessage = 'Login failed. Please try again.';
      message.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await adminApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
      setLoading(false);
      message.success('Logged out successfully');
      window.location.href = '/login';
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    return admin.permissions.includes(permission) || admin.role === 'super_admin';
  };

  const hasRole = (role: AdminRole): boolean => {
    if (!admin) return false;
    return admin.role === role || admin.role === 'super_admin';
  };

  const contextValue: AuthContextType = {
    admin,
    token,
    login,
    logout,
    loading,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};