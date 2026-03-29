import type { CityOut, PaginatedResponse, PropertySummary, SearchFilters } from '@/app/lib/types/catalog';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

/** FastAPI / Pydantic validation errors use detail: string | array of { loc, msg, ... } */
export function formatApiErrorBody(body: unknown, status: number): string {
  if (!body || typeof body !== 'object') {
    return `Error ${status}`;
  }
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (item && typeof item === 'object' && 'msg' in item) {
        return String((item as { msg: unknown }).msg);
      }
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    });
    return parts.join(' ') || `Error ${status}`;
  }
  if (detail != null && typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  return `Error ${status}`;
}

export async function searchCities(q: string): Promise<CityOut[]> {
  const res = await fetch(`${API_URL}/api/v1/catalog/cities?q=${encodeURIComponent(q)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function getFeaturedProperties(limit = 50): Promise<PropertySummary[]> {
  const res = await fetch(`${API_URL}/api/v1/catalog/properties/featured?limit=${limit}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function searchProperties(
  filters: SearchFilters & { city_id: string }
): Promise<PaginatedResponse<PropertySummary>> {
  const params = new URLSearchParams();

  params.set('checkin', filters.checkin);
  params.set('checkout', filters.checkout);
  params.set('guests', String(filters.guests));
  params.set('city_id', filters.city_id);

  if (filters.min_price != null) params.set('min_price', String(filters.min_price));
  if (filters.max_price != null) params.set('max_price', String(filters.max_price));
  if (filters.amenities) params.set('amenities', filters.amenities);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));

  const res = await fetch(`${API_URL}/api/v1/catalog/properties?${params.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }

  return res.json();
}
