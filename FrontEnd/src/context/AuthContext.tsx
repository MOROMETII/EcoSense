import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { logoutApi } from '../services/authApi';
import type { User } from '../models/types';

const STORAGE_KEY = '@auth_user';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string, userData?: Partial<Omit<User, 'token'>>) => void;
  logout: () => Promise<{ ok: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw) as User);
      })
      .catch(() => {/* ignore read errors */})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (token: string, userData?: Partial<Omit<User, 'token'>>) => {
    const newUser: User = {
      id:    userData?.id    ?? '1',
      name:  userData?.name  ?? 'User',
      email: userData?.email ?? '',
      token,
    };
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  const logout = async (): Promise<{ ok: boolean; message?: string }> => {
    if (!user) return { ok: true };
    const deviceName = Device.deviceName ?? 'Unknown Device';
    const result = await logoutApi(user.name, deviceName, user.token);
    if (!result.ok) return result;          // abort — keep user logged in
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    return { ok: true };
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
