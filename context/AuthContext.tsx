'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStoredToken, setStoredUser, logout as authLogout, login as authLogin, type LoginPayload } from '@/lib/auth';
import { api } from '@/lib/axios';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState({ user: null, token: null, loading: false });
      return;
    }
    api
      .get<User>('/api/auth/me')
      .then((res) => setState({ user: res.data, token, loading: false }))
      .catch(() => setState({ user: null, token: null, loading: false }));
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authLogin(payload);
    if (res.success && res.user && res.token) {
      setState({ user: res.user, token: res.token, loading: false });
      return { success: true };
    }
    return { success: false, message: res.message || 'خطا در ورود' };
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, token: null, loading: false });
    authLogout();
  }, []);

  const updateUser = useCallback((user: User) => {
    setStoredUser(user);
    setState((prev) => ({ ...prev, user }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    updateUser,
    isAuthenticated: !!state.token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
