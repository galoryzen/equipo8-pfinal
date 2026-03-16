import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthState {
  isLoggedIn: boolean;
  user: { id: string; fullName: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { fullName: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(null);

  const login = async (email: string, _password: string) => {
    // TODO: call auth API
    setUser({ id: '1', fullName: 'Traveler', email });
  };

  const signup = async (data: { fullName: string; email: string; password: string }) => {
    // TODO: call auth API
    setUser({ id: '1', fullName: data.fullName, email: data.email });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
