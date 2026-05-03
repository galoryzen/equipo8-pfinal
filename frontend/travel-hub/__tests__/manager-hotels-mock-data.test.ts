import {
  MOCK_HOTELS,
  MOCK_HOTEL_STATS,
  MOCK_ROOMS,
  MOCK_ROOM_TYPES,
  MOCK_ROOM_TYPE_DETAILS,
} from '@/app/manager/hotels/_data';
import { describe, expect, it } from 'vitest';

describe('manager/hotels/_data fixtures', () => {
  it('exports consistent mock hotels, rooms, stats, and room-type data', () => {
    expect(MOCK_HOTELS.length).toBeGreaterThan(0);
    expect(new Set(MOCK_HOTELS.map((h) => h.id)).size).toBe(MOCK_HOTELS.length);

    for (const hotel of MOCK_HOTELS) {
      expect(MOCK_ROOMS[hotel.id]?.length ?? 0).toBeGreaterThan(0);
      expect(MOCK_HOTEL_STATS[hotel.id]).toBeDefined();
      expect(MOCK_ROOM_TYPES[hotel.id]?.length ?? 0).toBeGreaterThan(0);
    }

    expect(Object.keys(MOCK_ROOM_TYPE_DETAILS).length).toBeGreaterThan(0);
  });
});
