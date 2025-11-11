import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContextDef';
import type { AuthContextType } from '../types/admin';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};