import { useCallback, useEffect, useState } from 'react';

import type { PropertyDetail } from '@src/types/catalog';
import { getPropertyDetail } from './catalog-service';

interface UsePropertyOptions {
  checkin?: string;
  checkout?: string;
}

interface UsePropertyResult {
  property: PropertyDetail | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useProperty(
  propertyId: string,
  opts: UsePropertyOptions = {},
): UsePropertyResult {
  const { checkin, checkout } = opts;
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPropertyDetail(propertyId, { checkin, checkout });
      setProperty(response.detail);
    } catch {
      setError('No se pudo cargar la propiedad.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, checkin, checkout]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { property, loading, error, retry: fetch };
}
