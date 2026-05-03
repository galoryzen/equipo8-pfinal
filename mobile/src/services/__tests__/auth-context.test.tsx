import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

import { api, setAuthToken } from '@src/services/api';
import {
  AuthError,
  AuthProvider,
  useAuth,
  type AuthErrorCode,
} from '@src/services/auth-context';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

jest.mock('@src/services/api', () => ({
  api: { post: jest.fn() },
  setAuthToken: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedApi = api as jest.Mocked<typeof api>;
const mockedSetAuthToken = setAuthToken as jest.MockedFunction<typeof setAuthToken>;

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

const TRAVELER_RESPONSE = {
  data: {
    id: 'user-1',
    email: 'carlos@example.com',
    role: 'TRAVELER' as const,
    full_name: 'Carlos García',
    token: 'jwt-token',
  },
};

function axiosError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

function networkError() {
  return Object.assign(new Error('Network Error'), {
    isAxiosError: true,
    response: undefined,
  });
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.multiGet.mockResolvedValue([
      ['travelhub.authToken', null],
      ['travelhub.user', null],
    ] as never);
    mockedAsyncStorage.multiSet.mockResolvedValue();
    mockedAsyncStorage.multiRemove.mockResolvedValue();
  });

  describe('hydration', () => {
    it('starts logged out when no session is stored', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();
      expect(mockedSetAuthToken).not.toHaveBeenCalled();
    });

    it('restores a session that includes role', async () => {
      const stored = { id: 'u1', fullName: 'Ana', email: 'ana@example.com', role: 'TRAVELER' };
      mockedAsyncStorage.multiGet.mockResolvedValueOnce([
        ['travelhub.authToken', 'stored-token'],
        ['travelhub.user', JSON.stringify(stored)],
      ] as never);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoggedIn).toBe(true));
      expect(result.current.user).toEqual(stored);
      expect(mockedSetAuthToken).toHaveBeenCalledWith('stored-token');
    });

    it('clears stale sessions that lack role', async () => {
      const legacy = { id: 'u1', fullName: 'Old', email: 'old@example.com' };
      mockedAsyncStorage.multiGet.mockResolvedValueOnce([
        ['travelhub.authToken', 'stale-token'],
        ['travelhub.user', JSON.stringify(legacy)],
      ] as never);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();
      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'travelhub.authToken',
        'travelhub.user',
      ]);
      expect(mockedSetAuthToken).not.toHaveBeenCalled();
    });

    it('starts logged out if AsyncStorage throws', async () => {
      mockedAsyncStorage.multiGet.mockRejectedValueOnce(new Error('storage broken'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isLoggedIn).toBe(false);
    });
  });

  describe('login', () => {
    it('persists session on success and exposes the user with role', async () => {
      mockedApi.post.mockResolvedValueOnce(TRAVELER_RESPONSE);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login('carlos@example.com', 'travelhub');
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/v1/auth/login', {
        email: 'carlos@example.com',
        password: 'travelhub',
      });
      expect(result.current.isLoggedIn).toBe(true);
      expect(result.current.user).toEqual({
        id: 'user-1',
        fullName: 'Carlos García',
        email: 'carlos@example.com',
        role: 'TRAVELER',
      });
      expect(mockedSetAuthToken).toHaveBeenCalledWith('jwt-token');
      expect(mockedAsyncStorage.multiSet).toHaveBeenCalledWith([
        ['travelhub.authToken', 'jwt-token'],
        ['travelhub.user', expect.stringContaining('Carlos García')],
      ]);
    });

    it.each<['HOTEL' | 'AGENCY' | 'ADMIN']>([['HOTEL'], ['AGENCY'], ['ADMIN']])(
      'rejects %s users without persisting',
      async (role) => {
        mockedApi.post.mockResolvedValueOnce({
          data: { ...TRAVELER_RESPONSE.data, role },
        });

        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
          await expect(
            result.current.login('a@b.com', 'whatever123'),
          ).rejects.toMatchObject({ code: 'ROLE_NOT_ALLOWED' as AuthErrorCode });
        });

        expect(result.current.isLoggedIn).toBe(false);
        expect(mockedSetAuthToken).not.toHaveBeenCalled();
        expect(mockedAsyncStorage.multiSet).not.toHaveBeenCalled();
      },
    );

    it('maps 401 to INVALID_CREDENTIALS', async () => {
      mockedApi.post.mockRejectedValueOnce(axiosError(401));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.login('x@y.com', 'badpass')).rejects.toMatchObject({
          code: 'INVALID_CREDENTIALS',
        });
      });
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('maps 422 to VALIDATION', async () => {
      mockedApi.post.mockRejectedValueOnce(axiosError(422));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.login('bad', 'pw')).rejects.toMatchObject({
          code: 'VALIDATION',
        });
      });
    });

    it('maps missing response (network) to NETWORK', async () => {
      mockedApi.post.mockRejectedValueOnce(networkError());

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.login('a@b.com', 'whatever')).rejects.toMatchObject({
          code: 'NETWORK',
        });
      });
    });

    it('maps unexpected status to UNKNOWN', async () => {
      mockedApi.post.mockRejectedValueOnce(axiosError(500));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.login('a@b.com', 'whatever')).rejects.toMatchObject({
          code: 'UNKNOWN',
        });
      });
    });

    it('throws AuthError instances', async () => {
      mockedApi.post.mockRejectedValueOnce(axiosError(401));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.login('a@b.com', 'pw')).rejects.toBeInstanceOf(AuthError);
      });
    });
  });

  describe('signup', () => {
    it('posts the register payload and persists the session', async () => {
      mockedApi.post.mockResolvedValueOnce(TRAVELER_RESPONSE);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signup({
          fullName: 'Carlos García',
          email: 'carlos@example.com',
          password: 'travelhub',
          phone: '+573001112233',
          country_code: 'CO',
        });
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/v1/auth/register', {
        email: 'carlos@example.com',
        username: 'Carlos García',
        phone: '+573001112233',
        country_code: 'CO',
        password: 'travelhub',
      });
      expect(result.current.isLoggedIn).toBe(true);
      expect(result.current.user?.role).toBe('TRAVELER');
    });

    it('maps 409 to EMAIL_ALREADY_EXISTS without persisting', async () => {
      mockedApi.post.mockRejectedValueOnce(axiosError(409));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.signup({
            fullName: 'Dup',
            email: 'taken@example.com',
            password: 'whatever123',
            phone: '+1',
            country_code: 'US',
          }),
        ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS' });
      });
      expect(mockedAsyncStorage.multiSet).not.toHaveBeenCalled();
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('maps 422 to VALIDATION', async () => {
      mockedApi.post.mockRejectedValueOnce(axiosError(422));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.signup({
            fullName: 'X',
            email: 'bad',
            password: '1',
            phone: '',
            country_code: '',
          }),
        ).rejects.toMatchObject({ code: 'VALIDATION' });
      });
    });
  });

  describe('logout', () => {
    it('clears storage, token, and state', async () => {
      mockedApi.post.mockResolvedValueOnce(TRAVELER_RESPONSE);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login('carlos@example.com', 'travelhub');
      });
      expect(result.current.isLoggedIn).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.user).toBeNull();
      expect(mockedSetAuthToken).toHaveBeenLastCalledWith(null);
      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'travelhub.authToken',
        'travelhub.user',
      ]);
    });
  });

  describe('useAuth', () => {
    it('throws when used outside AuthProvider', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
      errorSpy.mockRestore();
    });
  });
});
