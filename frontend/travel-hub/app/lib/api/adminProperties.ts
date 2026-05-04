import { API_URL } from '@/app/lib/api/constants';
import {
  AdminProperty,
  GetAdminPropertiesResponse,
  createAdminPropertiesFetchError,
} from '@/app/lib/types/adminProperties';

export async function getAdminProperties(limit = 1000): Promise<AdminProperty[]> {
  let response: Response;
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    response = await fetch(`${API_URL}/api/v1/catalog/admin/properties?${params.toString()}`, {
      credentials: 'include',
    });
  } catch {
    throw createAdminPropertiesFetchError('Error loading properties', { kind: 'network' });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail =
      body && typeof body.detail === 'string' ? body.detail : `Error ${response.status}`;
    const kind = response.status === 403 ? 'unauthorized' : 'server';
    throw createAdminPropertiesFetchError(detail, { status: response.status, kind });
  }

  const payload = (await response.json().catch(() => null)) as GetAdminPropertiesResponse;

  if (!Array.isArray(payload?.items)) return [];

  return payload.items
    .map((item) => {
      return { id: item.id, name: item.name };
    })
    .filter((x): x is AdminProperty => x !== null);
}
