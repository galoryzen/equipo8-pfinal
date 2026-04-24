import { _resetMeCache, getMe, loginUser, logoutUser, registerUser } from '@/app/lib/api/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';

function mockFetch(ok: boolean, body: unknown, status = ok ? 200 : 400) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
  _resetMeCache();
});

describe('registerUser', () => {
  const payload = {
    email: 'a@b.com',
    username: 'a',
    phone: '123',
    country_code: 'US',
    password: 'pw',
  };

  it('returns auth response on success', async () => {
    mockFetch(true, { id: '1', email: 'a@b.com', role: 'TRAVELER' });
    const res = await registerUser(payload);
    expect(res.id).toBe('1');
  });

  it('throws with detail message on failure', async () => {
    mockFetch(false, { detail: 'Email already exists' });
    await expect(registerUser(payload)).rejects.toThrow('Email already exists');
  });

  it('throws generic error when body has no detail', async () => {
    mockFetch(false, null, 500);
    await expect(registerUser(payload)).rejects.toThrow('Error 500');
  });
});

describe('loginUser', () => {
  it('returns auth response on success', async () => {
    mockFetch(true, { id: '2', email: 'b@c.com', role: 'TRAVELER' });
    const res = await loginUser('b@c.com', 'pw');
    expect(res.role).toBe('TRAVELER');
  });

  it('throws with detail on failure', async () => {
    mockFetch(false, { detail: 'Invalid credentials' });
    await expect(loginUser('x@y.com', 'bad')).rejects.toThrow('Invalid credentials');
  });

  it('throws generic error when body parse fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.reject(new Error('parse fail')),
    } as unknown as Response);
    await expect(loginUser('x@y.com', 'bad')).rejects.toThrow('Error 401');
  });

  it('primes getMe cache after successful login', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '2', email: 'b@c.com', role: 'TRAVELER' }),
    } as Response);

    await loginUser('b@c.com', 'pw');
    const me = await getMe();

    expect(me).toEqual({ id: '2', email: 'b@c.com', role: 'TRAVELER' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('getMe', () => {
  it('returns user when authenticated', async () => {
    mockFetch(true, { id: '3', email: 'c@d.com', role: 'MANAGER' });
    const res = await getMe();
    expect(res?.role).toBe('MANAGER');
  });

  it('returns null when not authenticated', async () => {
    mockFetch(false, null);
    expect(await getMe()).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    expect(await getMe()).toBeNull();
  });
});

describe('logoutUser', () => {
  it('completes without throwing', async () => {
    mockFetch(true, {});
    await expect(logoutUser()).resolves.toBeUndefined();
  });

  it('swallows network errors silently', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    await expect(logoutUser()).resolves.toBeUndefined();
  });
});
