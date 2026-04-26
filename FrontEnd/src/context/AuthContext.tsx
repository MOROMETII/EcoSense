import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { logoutApi } from '../services/authApi';
import { setOnUnauthorized } from '../services/api';
import type { User } from '../models/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string, user_id: number, username: string) => Promise<void>;
  logout: () => Promise<{ ok: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]           = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount.
  useEffect(() => {
    const restore = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
          const rawId   = await SecureStore.getItemAsync('user_id');
          const uname   = await SecureStore.getItemAsync('username');
          setUser({ token, user_id: Number(rawId ?? '0'), username: uname ?? '' });
        }
      } catch {
        // ignore read errors
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  // Register the 401 handler so the api interceptor can clear React state.
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const login = async (token: string, user_id: number, username: string): Promise<void> => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user_id', String(user_id));
    await SecureStore.setItemAsync('username', username);
    setUser({ token, user_id, username });
  };

  const logout = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!user) return { ok: true };
    // Fire logout request but always clear local state regardless of outcome.
    const result = await logoutApi(user.token);
    setUser(null);
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user_id');
    await SecureStore.deleteItemAsync('username');
    await SecureStore.deleteItemAsync('device_id');
    return result;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: user !== null, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
