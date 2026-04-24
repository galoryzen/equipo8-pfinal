import { getPropertyDetail } from '@/app/lib/api/catalog';
import type { BookingListItem } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';

export type PropertyByIdMap = Record<string, PropertyDetail | null>;

/**
 * Build a minimal PropertyDetail stub from enriched booking list fields.
 * Covers the card-level display (name, image) without a full catalog request.
 */
function stubFromBooking(id: string, b: BookingListItem): PropertyDetail {
  return {
    id,
    hotel_id: '',
    name: b.property_name ?? '',
    description: null,
    city: { id: '', name: '', country: '', department: null },
    address: null,
    rating_avg: null,
    review_count: 0,
    popularity_score: 0,
    default_cancellation_policy: null,
    images: b.image_url
      ? [{ id: 'list-img', url: b.image_url, caption: null, display_order: 0 }]
      : [],
    amenities: [],
    policies: [],
    room_types: [],
  };
}

/**
 * One catalog request per unique property id (parallel). Failures become null entries.
 * When ``bookings`` is supplied and a booking already carries ``property_name`` /
 * ``image_url`` from the booking-service enrichment, the full catalog request for
 * that property is skipped and a display stub is used instead.
 */
export async function fetchPropertyDetailsMap(
  ids: string[],
  bookings?: BookingListItem[]
): Promise<PropertyByIdMap> {
  if (ids.length === 0) return {};

  const result: PropertyByIdMap = {};
  const needsFetch: string[] = [];

  if (bookings?.length) {
    const latestByProp = new Map<string, BookingListItem>();
    for (const b of bookings) {
      if (b.property_id) latestByProp.set(b.property_id, b);
    }
    for (const id of ids) {
      const b = latestByProp.get(id);
      if (b?.property_name != null) {
        result[id] = stubFromBooking(id, b);
      } else {
        needsFetch.push(id);
      }
    }
  } else {
    needsFetch.push(...ids);
  }

  if (needsFetch.length > 0) {
    const pairs = await Promise.all(
      needsFetch.map(async (id) => {
        try {
          const res = await getPropertyDetail(id);
          return [id, res.detail] as const;
        } catch {
          return [id, null] as const;
        }
      })
    );
    for (const [id, detail] of pairs) {
      result[id] = detail;
    }
  }

  return result;
}
