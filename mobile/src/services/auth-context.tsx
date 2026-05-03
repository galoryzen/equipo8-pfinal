import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, setAuthToken } from '@src/services/api';

const AUTH_TOKEN_KEY = 'travelhub.authToken';
const AUTH_USER_KEY = 'travelhub.user';

export type Role = 'TRAVELER' | 'HOTEL' | 'AGENCY' | 'ADMIN';

export type AuthUser = { id: string; fullName: string; email: string; role: Role };

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'ROLE_NOT_ALLOWED'
  | 'NETWORK'
  | 'VALIDATION'
  | 'UNKNOWN';

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'AuthError';
  }
}

interface SignupData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  country_code: string;
}

interface AuthState {
  isLoggedIn: boolean;
  loading: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthResponse {
  id: string;
  email: string;
  role: Role;
  full_name: string;
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

function mapAxiosError(error: unknown, mapping: Partial<Record<number, AuthErrorCode>>): AuthError {
  if (axios.isAxiosError(error)) {
    if (!error.response) return new AuthError('NETWORK');
    const status = error.response.status;
    const mapped = mapping[status];
    if (mapped) return new AuthError(mapped);
    if (status === 422) return new AuthError('VALIDATION');
  }
  return new AuthError('UNKNOWN');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const [[, token], [, userJson]] = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
        if (token && userJson) {
          const parsed = JSON.parse(userJson) as Partial<AuthUser>;
          // Sessions persisted before role was introduced are stale — force re-login.
          if (!parsed.role) {
            await clearSession();
          } else {
            setAuthToken(token);
            setUser(parsed as AuthUser);
          }
        }
      } catch {
        // AsyncStorage inaccesible: arrancamos en logout.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    let resp;
    try {
      resp = await api.post<AuthResponse>('/v1/auth/login', { email, password });
    } catch (e) {
      throw mapAxiosError(e, { 401: 'INVALID_CREDENTIALS' });
    }

    const { id, email: resolvedEmail, role, full_name, token } = resp.data;

    if (role !== 'TRAVELER') {
      throw new AuthError('ROLE_NOT_ALLOWED');
    }

    const nextUser: AuthUser = { id, fullName: full_name, email: resolvedEmail, role };
    setAuthToken(token);
    await persistSession(token, nextUser);
    setUser(nextUser);
  };

  const signup = async (data: SignupData) => {
    let resp;
    try {
      resp = await api.post<AuthResponse>('/v1/auth/register', {
        email: data.email,
        username: data.fullName,
        phone: data.phone,
        country_code: data.country_code,
        password: data.password,
      });
    } catch (e) {
      throw mapAxiosError(e, { 409: 'EMAIL_ALREADY_EXISTS' });
    }

    const { id, email: resolvedEmail, role, full_name, token } = resp.data;
    const nextUser: AuthUser = { id, fullName: full_name, email: resolvedEmail, role };
    setAuthToken(token);
    await persistSession(token, nextUser);
    setUser(nextUser);
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
