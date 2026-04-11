import api, { setAuthToken } from '../api';

// Handlers registrados al cargar el módulo (index 0 = el único que registramos).
// Tipamos con `any` porque `handlers` no está en el tipo público de axios,
// pero sí existe en el runtime (AxiosInterceptorManager interno).
const requestHandler = (api.interceptors.request as any).handlers[0];
const responseHandler = (api.interceptors.response as any).handlers[0];

describe('api', () => {
  beforeEach(() => {
    setAuthToken(null);
  });

  describe('defaults', () => {
    it('has correct base URL', () => {
      expect(api.defaults.baseURL).toContain('/api');
    });

    it('has 15s timeout', () => {
      expect(api.defaults.timeout).toBe(15_000);
    });

    it('has json content type', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('request interceptor', () => {
    it('adds Authorization header when token is set', () => {
      setAuthToken('my-token');
      const config = { headers: {} } as any;
      const result = requestHandler.fulfilled(config);
      expect(result.headers.Authorization).toBe('Bearer my-token');
    });

    it('does not add Authorization header when token is null', () => {
      setAuthToken(null);
      const config = { headers: {} } as any;
      const result = requestHandler.fulfilled(config);
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('updates header after token change', () => {
      setAuthToken('first');
      const first = requestHandler.fulfilled({ headers: {} } as any);
      expect(first.headers.Authorization).toBe('Bearer first');

      setAuthToken('second');
      const second = requestHandler.fulfilled({ headers: {} } as any);
      expect(second.headers.Authorization).toBe('Bearer second');
    });
  });

  describe('response interceptor', () => {
    it('passes successful responses through unchanged', () => {
      const response = { data: { ok: true }, status: 200 } as any;
      const result = responseHandler.fulfilled(response);
      expect(result).toBe(response);
    });

    it('clears auth token on 401 and rejects with the original error', async () => {
      setAuthToken('will-be-cleared');
      const error = { response: { status: 401 } } as any;

      await expect(responseHandler.rejected(error)).rejects.toBe(error);

      // Verifica que el token se limpió: el siguiente request no lleva Authorization
      const config = requestHandler.fulfilled({ headers: {} } as any);
      expect(config.headers.Authorization).toBeUndefined();
    });

    it('does not clear auth token on non-401 errors (e.g. 500)', async () => {
      setAuthToken('should-remain');
      const error = { response: { status: 500 } } as any;

      await expect(responseHandler.rejected(error)).rejects.toBe(error);

      // El token debe seguir presente
      const config = requestHandler.fulfilled({ headers: {} } as any);
      expect(config.headers.Authorization).toBe('Bearer should-remain');
    });

    it('does not clear auth token on errors without response (network errors)', async () => {
      setAuthToken('should-remain');
      const error = { message: 'Network Error' } as any;

      await expect(responseHandler.rejected(error)).rejects.toBe(error);

      const config = requestHandler.fulfilled({ headers: {} } as any);
      expect(config.headers.Authorization).toBe('Bearer should-remain');
    });
  });
});
