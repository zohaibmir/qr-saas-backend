import { createContext } from 'react';
import type { AuthContextType } from '../types/admin';

export const AuthContext = createContext<AuthContextType | null>(null);