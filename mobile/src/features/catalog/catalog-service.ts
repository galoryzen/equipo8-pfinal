import api from '@src/services/api';
import type {
  AmenitySummary,
  CityInfo,
  FeaturedDestination,
  PaginatedResponse,
  PropertyDetailResponse,
  PropertySummary,
  SearchFilters,
} from '@src/types/catalog';

export async function getFeaturedDestinations(
  limit = 4,
): Promise<FeaturedDestination[]> {
  const { data } = await api.get<FeaturedDestination[]>(
    '/v1/catalog/destinations/featured',
    { params: { limit } },
  );
  return data;
}

export async function getFeaturedProperties(
  limit = 10,
): Promise<PropertySummary[]> {
  const { data } = await api.get<PropertySummary[]>(
    '/v1/catalog/properties/featured',
    { params: { limit } },
  );
  return data;
}

export async function getAmenities(): Promise<AmenitySummary[]> {
  const { data } = await api.get<AmenitySummary[]>('/v1/catalog/amenities');
  return data;
}

export async function searchCities(q: string): Promise<CityInfo[]> {
  const { data } = await api.get<CityInfo[]>('/v1/catalog/cities', {
    params: { q },
  });
  return data;
}

export async function searchProperties(
  filters: SearchFilters,
): Promise<PaginatedResponse<PropertySummary>> {
  const params: Record<string, string | number> = {
    checkin: filters.checkin,
    checkout: filters.checkout,
    guests: filters.guests,
  };
  if (filters.city_id) params.city_id = filters.city_id;
  if (filters.min_price != null) params.min_price = filters.min_price;
  if (filters.max_price != null) params.max_price = filters.max_price;
  if (filters.amenities?.length)
    params.amenities = filters.amenities.join(',');
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const { data } = await api.get<PaginatedResponse<PropertySummary>>(
    '/v1/catalog/properties',
    { params },
  );
  return data;
}

export async function getPropertyDetail(
  id: string,
  opts: { checkin?: string; checkout?: string } = {},
): Promise<PropertyDetailResponse> {
  const params: Record<string, string> = {};
  if (opts.checkin) params.checkin = opts.checkin;
  if (opts.checkout) params.checkout = opts.checkout;
  const { data } = await api.get<PropertyDetailResponse>(
    `/v1/catalog/properties/${id}`,
    { params },
  );
  return data;
}
