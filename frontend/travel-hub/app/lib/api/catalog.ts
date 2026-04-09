import type {
  CityOut,
  FeaturedDestination,
  PaginatedResponse,
  PropertyDetailResponse,
  PropertySummary,
  SearchFilters,
} from '@/app/lib/types/catalog';

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

/** Respuesta HTTP 404 del catálogo (p. ej. propiedad inexistente). */
export class CatalogNotFoundError extends Error {
  readonly statusCode = 404 as const;

  constructor(message = 'No encontramos este alojamiento') {
    super(message);
    this.name = 'CatalogNotFoundError';
  }
}

export function isCatalogNotFoundError(err: unknown): err is CatalogNotFoundError {
  return err instanceof CatalogNotFoundError;
}

export async function searchCities(q: string): Promise<CityOut[]> {
  const res = await fetch(`${API_URL}/api/v1/catalog/cities?q=${encodeURIComponent(q)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function getFeaturedDestinations(limit = 4): Promise<FeaturedDestination[]> {
  const res = await fetch(`${API_URL}/api/v1/catalog/destinations/featured?limit=${limit}`);
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
    throw new Error(formatApiErrorBody(body, res.status));
  }

  return res.json();
}

export async function getPropertyDetail(
  propertyId: string,
  options?: { checkin?: string; checkout?: string; review_page?: number; review_page_size?: number }
): Promise<PropertyDetailResponse> {
  const query = new URLSearchParams();
  if (options?.checkin) query.set('checkin', options.checkin);
  if (options?.checkout) query.set('checkout', options.checkout);
  if (options?.review_page != null) query.set('review_page', String(options.review_page));
  if (options?.review_page_size != null) query.set('review_page_size', String(options.review_page_size));

  const qs = query.toString();
  const url = `${API_URL}/api/v1/catalog/properties/${propertyId}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new CatalogNotFoundError();
    }
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}
