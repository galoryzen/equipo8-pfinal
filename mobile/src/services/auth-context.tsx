import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, setAuthToken } from '@src/services/api';

// TODO SCRUM-170/173: reemplazar por login real con credenciales del form.
// Mientras no exista el login real, el botón de login usa siempre el mismo
// usuario seed para permitir probar SCRUM-123 end-to-end.
const DEV_LOGIN_EMAIL = 'carlos@example.com';
const DEV_LOGIN_PASSWORD = 'travelhub';

const AUTH_TOKEN_KEY = 'travelhub.authToken';
const AUTH_USER_KEY = 'travelhub.user';

type AuthUser = { id: string; fullName: string; email: string };

interface AuthState {
  isLoggedIn: boolean;
  loading: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { fullName: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface LoginResponse {
  id: string;
  email: string;
  role: string;
  token: string;
}

async function persistSession(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(user)],
  ]);
}

async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Hidratar sesión desde AsyncStorage al arrancar (token sobrevive restarts).
  useEffect(() => {
    (async () => {
      try {
        const [[, token], [, userJson]] = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
        if (token && userJson) {
          setAuthToken(token);
          setUser(JSON.parse(userJson) as AuthUser);
        }
      } catch {
        // AsyncStorage inaccesible: arrancamos en logout.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (_email: string, _password: string) => {
    // Dev shortcut: ignora args, siempre loguea al primer usuario seed.
    const resp = await api.post<LoginResponse>('/v1/auth/login', {
      email: DEV_LOGIN_EMAIL,
      password: DEV_LOGIN_PASSWORD,
    });
    const { id, email: resolvedEmail, token } = resp.data;
    const nextUser: AuthUser = { id, fullName: 'Traveler', email: resolvedEmail };
    setAuthToken(token);
    await persistSession(token, nextUser);
    setUser(nextUser);
  };

  const signup = async (data: { fullName: string; email: string; password: string }) => {
    // TODO SCRUM-170: implementar signup real. Por ahora comparte el dev shortcut.
    await login(data.email, data.password);
  };

  const logout = async () => {
    setAuthToken(null);
    await clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, loading, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
