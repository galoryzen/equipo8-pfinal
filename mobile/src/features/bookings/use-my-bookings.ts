import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { listMyBookings, type BookingScope } from '@src/services/booking-service';
import { getPropertyDetail } from '@src/features/catalog/catalog-service';
import type { BookingListItem } from '@src/types/booking';

export interface EnrichedBookingListItem extends BookingListItem {
  property_name?: string;
  city_name?: string;
  image_url?: string;
}

interface PropertyExtras {
  property_name: string;
  city_name?: string;
  image_url?: string;
}

const propertyExtrasCache = new Map<string, PropertyExtras>();

async function loadPropertyExtras(propertyId: string): Promise<PropertyExtras | null> {
  const cached = propertyExtrasCache.get(propertyId);
  if (cached) return cached;
  try {
    const { detail } = await getPropertyDetail(propertyId);
    const heroImage = [...detail.images].sort(
      (a, b) => a.display_order - b.display_order,
    )[0];
    const extras: PropertyExtras = {
      property_name: detail.name,
      city_name: detail.city?.name,
      image_url: heroImage?.url,
    };
    propertyExtrasCache.set(propertyId, extras);
    return extras;
  } catch {
    return null;
  }
}

export function clearBookingsCache() {
  propertyExtrasCache.clear();
}

export function useMyBookings(scope: Exclude<BookingScope, 'all'>) {
  const [bookings, setBookings] = useState<EnrichedBookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listMyBookings(scope);
      const uniqueIds = Array.from(new Set(list.map((b) => b.property_id)));
      const extrasList = await Promise.all(uniqueIds.map(loadPropertyExtras));
      const extrasById = new Map<string, PropertyExtras>();
      uniqueIds.forEach((id, i) => {
        const e = extrasList[i];
        if (e) extrasById.set(id, e);
      });
      setBookings(
        list.map((b) => {
          const e = extrasById.get(b.property_id);
          return e ? { ...b, ...e } : b;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings]),
  );

  return { bookings, loading, error, refetch: fetchBookings };
}
