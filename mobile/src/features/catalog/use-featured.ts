import { useCallback, useEffect, useState } from 'react';

import type { FeaturedDestination, PropertySummary } from '@src/types/catalog';
import {
  getFeaturedDestinations,
  getFeaturedProperties,
} from './catalog-service';

interface UseFeaturedResult {
  destinations: FeaturedDestination[];
  properties: PropertySummary[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useFeatured(): UseFeaturedResult {
  const [destinations, setDestinations] = useState<FeaturedDestination[]>([]);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dests, props] = await Promise.all([
        getFeaturedDestinations(),
        getFeaturedProperties(),
      ]);
      setDestinations(dests);
      setProperties(props);
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { destinations, properties, loading, error, retry: fetch };
}
