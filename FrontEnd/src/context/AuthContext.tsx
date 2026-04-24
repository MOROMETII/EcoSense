import React, { createContext, useContext, useState } from 'react';
import type { User } from '../models/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string, userData?: Partial<Omit<User, 'token'>>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (token: string, userData?: Partial<Omit<User, 'token'>>) => {
    setUser({
      id: userData?.id ?? '1',
      name: userData?.name ?? 'User',
      email: userData?.email ?? '',
      token,
    });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ isAuthenticated: user !== null, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
