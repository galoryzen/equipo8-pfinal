const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

export interface RegisterPayload {
  email: string;
  username: string;
  phone: string;
  country_code: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  role: string;
  hotel_id?: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  country_code?: string | null;
  hotel_id?: string | null;
}

// ── getMe cache ───────────────────────────────────────────────────────────────
// Deduplicates concurrent calls and caches the result for 30 s so navigating
// between protected pages never triggers a redundant network request.
const ME_TTL = 30_000;
let _meCacheSlot: { v: AuthResponse | null; exp: number } | null = null;
let _meCacheInflight: Promise<AuthResponse | null> | null = null;

function _invalidateMeCache(): void {
  _meCacheSlot = null;
  _meCacheInflight = null;
}

/** Exposed for unit tests only — do not call in application code. */
export function _resetMeCache(): void {
  _invalidateMeCache();
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  _invalidateMeCache();
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Error ${res.status}`);
  }

  const user = (await res.json()) as AuthResponse;
  _meCacheSlot = { v: user, exp: Date.now() + ME_TTL };
  return user;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  _invalidateMeCache();
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Error ${res.status}`);
  }

  const user = (await res.json()) as AuthResponse;
  _meCacheSlot = { v: user, exp: Date.now() + ME_TTL };
  return user;
}

export async function getMe(): Promise<AuthResponse | null> {
  if (_meCacheSlot && Date.now() < _meCacheSlot.exp) return _meCacheSlot.v;

  if (!_meCacheInflight) {
    _meCacheInflight = (async (): Promise<AuthResponse | null> => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' });
        const v: AuthResponse | null = res.ok ? ((await res.json()) as AuthResponse) : null;
        _meCacheSlot = { v, exp: Date.now() + ME_TTL };
        return v;
      } catch {
        _meCacheSlot = { v: null, exp: Date.now() + ME_TTL };
        return null;
      } finally {
        _meCacheInflight = null;
      }
    })();
  }
  return _meCacheInflight;
}

export async function getUserById(userId: string): Promise<UserProfileResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/users/${encodeURIComponent(userId)}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Error ${res.status}`);
  }
  return res.json();
}

export async function logoutUser(): Promise<void> {
  _invalidateMeCache();
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best-effort logout; caller should still navigate away.
  }
}
