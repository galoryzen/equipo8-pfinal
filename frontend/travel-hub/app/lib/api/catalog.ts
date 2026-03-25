import type { PaginatedResponse, PropertySummary, SearchFilters } from '@/app/lib/types/catalog';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

export async function searchProperties(
  filters: SearchFilters
): Promise<PaginatedResponse<PropertySummary>> {
  const params = new URLSearchParams();

  params.set('checkin', filters.checkin);
  params.set('checkout', filters.checkout);
  params.set('guests', String(filters.guests));

  if (filters.city_id) params.set('city_id', filters.city_id);
  if (filters.min_price != null) params.set('min_price', String(filters.min_price));
  if (filters.max_price != null) params.set('max_price', String(filters.max_price));
  if (filters.amenities) params.set('amenities', filters.amenities);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));

  const res = await fetch(`${API_URL}/api/v1/catalog/properties?${params.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Error ${res.status}`);
  }

  return res.json();
}
