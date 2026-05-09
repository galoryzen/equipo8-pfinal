'use client';

import { useCallback, useEffect, useState } from 'react';

import { getMyBookings } from '@/app/lib/api/booking';
import {
  type PropertyByIdMap,
  fetchPropertyDetailsMap,
} from '@/app/lib/myTrips/loadPropertyDetails';
import type { BookingListItem } from '@/app/lib/types/booking';

export type { PropertyByIdMap };

export interface UseMyTripsCatalogState {
  bookings: BookingListItem[];
  propertyById: PropertyByIdMap;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function uniquePropertyIds(bookings: BookingListItem[]): string[] {
  const set = new Set<string>();
  for (const b of bookings) {
    if (b.property_id) set.add(b.property_id);
  }
  return [...set];
}

export function useMyTripsCatalog(): UseMyTripsCatalogState {
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [propertyById, setPropertyById] = useState<PropertyByIdMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [regular, carts] = await Promise.all([
          getMyBookings(1, 100),
          getMyBookings(1, 100, 'CART'),
        ]);
        if (cancelled) return;
        const combined = [...regular.items, ...carts.items];
        setBookings(combined);
        const ids = uniquePropertyIds(combined);
        const map = await fetchPropertyDetailsMap(ids, combined);
        if (cancelled) return;
        setPropertyById(map);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load trips');
          setBookings([]);
          setPropertyById({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { bookings, propertyById, loading, error, reload };
}
