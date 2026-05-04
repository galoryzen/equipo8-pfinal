import { API_URL } from '@/app/lib/api/constants';

export interface ActiveHotel {
  id: string;
  name: string;
}

export async function getActiveHotels(): Promise<ActiveHotel[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/catalog/admin/hotels/active`, {
      credentials: 'include',
    });
  } catch {
    throw new Error('Error loading active hotels');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail =
      body && typeof body.detail === 'string' ? body.detail : `Error ${response.status}`;
    throw new Error(detail);
  }

  const payload = (await response.json().catch(() => null)) as ActiveHotel[];

  if (!Array.isArray(payload)) return [];

  return payload.map((item) => ({ id: item.id, name: item.name }));
}
