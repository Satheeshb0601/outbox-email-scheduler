'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  setToken: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch {
      setUser(null);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchMe();
    } else {
      setIsLoading(false);
    }
  }, [fetchMe]);

  const setToken = useCallback((token: string, userData: User) => {
    localStorage.setItem('auth_token', token);
    setUser(userData);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: userData, token } = await authApi.login(email, password);
    setToken(token, userData);
  }, [setToken]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { user: userData, token } = await authApi.register(email, password, name);
    setToken(token, userData);
  }, [setToken]);

  const loginWithGoogle = useCallback(() => {
    authApi.googleLogin();
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      loginWithGoogle,
      logout,
      setToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
