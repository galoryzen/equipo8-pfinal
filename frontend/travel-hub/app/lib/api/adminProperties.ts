const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

export type AdminProperty = { id: string; name: string };

export class AdminPropertiesFetchError extends Error {
  readonly status?: number;
  readonly kind: 'unauthorized' | 'network' | 'server';

  constructor(
    message: string,
    opts: { status?: number; kind: 'unauthorized' | 'network' | 'server' }
  ) {
    super(message);
    this.name = 'AdminPropertiesFetchError';
    this.status = opts.status;
    this.kind = opts.kind;
  }
}

export async function getAdminProperties(limit = 1000): Promise<AdminProperty[]> {
  let response: Response;
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    response = await fetch(`${API_URL}/api/v1/catalog/admin/properties?${params.toString()}`, {
      credentials: 'include',
    });
  } catch {
    throw new AdminPropertiesFetchError('Error loading properties', { kind: 'network' });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail =
      body && typeof body.detail === 'string' ? body.detail : `Error ${response.status}`;
    const kind = response.status === 403 ? 'unauthorized' : 'server';
    throw new AdminPropertiesFetchError(detail, { status: response.status, kind });
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const src = item as { id?: unknown; name?: unknown };
      const id = typeof src.id === 'string' ? src.id : '';
      const name = typeof src.name === 'string' ? src.name : '';
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((x): x is AdminProperty => x !== null);
}
