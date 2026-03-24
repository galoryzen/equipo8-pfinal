import api from '@src/services/api';
import type { FeaturedDestination, PropertySummary } from '@src/types/catalog';

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
