import { useCallback, useEffect, useState } from 'react';

import type {
  PaginatedResponse,
  PropertyDetail,
  Review,
} from '@src/types/catalog';
import { getPropertyDetail } from './catalog-service';

interface UsePropertyOptions {
  checkin?: string;
  checkout?: string;
  reviewPage?: number;
  reviewPageSize?: number;
}

interface UsePropertyResult {
  property: PropertyDetail | null;
  reviews: PaginatedResponse<Review> | null;
  ratingAvg: number | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useProperty(
  propertyId: string,
  opts: UsePropertyOptions = {},
): UsePropertyResult {
  const { checkin, checkout, reviewPage, reviewPageSize } = opts;
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [reviews, setReviews] = useState<PaginatedResponse<Review> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPropertyDetail(propertyId, {
        checkin,
        checkout,
        review_page: reviewPage,
        review_page_size: reviewPageSize,
      });
      setProperty(response.detail);
      setReviews(response.reviews);
    } catch {
      setError('No se pudo cargar la propiedad.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, checkin, checkout, reviewPage, reviewPageSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const ratingAvg =
    property?.rating_avg != null ? Number(property.rating_avg) : null;

  return { property, reviews, ratingAvg, loading, error, retry: fetch };
}
