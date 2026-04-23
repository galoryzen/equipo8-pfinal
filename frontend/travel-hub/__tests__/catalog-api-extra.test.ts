import {
  CatalogNotFoundError,
  formatApiErrorBody,
  getFeaturedDestinations,
  getFeaturedProperties,
  getPropertyDetail,
  isCatalogNotFoundError,
  searchCities,
} from '@/app/lib/api/catalog';
import type { CityOut, PropertyDetailResponse } from '@/app/lib/types/catalog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('catalog API uncovered flows', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formatApiErrorBody covers primitive and object detail', () => {
    expect(formatApiErrorBody(null, 500)).toBe('Error 500');
    expect(formatApiErrorBody({ detail: { reason: 'bad-input' } }, 400)).toBe(
      '{"reason":"bad-input"}'
    );
  });

  it('formatApiErrorBody falls back to string when detail item cannot be stringified', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    const message = formatApiErrorBody({ detail: [circular] }, 422);
    expect(message).toContain('[object Object]');
  });

  it('searchCities returns parsed response and throws formatted error', async () => {
    const cities: CityOut[] = [{ id: 'city-1', name: 'Bogota' }];
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cities),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ detail: 'q must be at least 2 characters' }),
      } as Response);

    await expect(searchCities('bo')).resolves.toEqual(cities);
    await expect(searchCities('b')).rejects.toThrow('q must be at least 2 characters');
  });

  it('featured endpoints support success and default error handling', async () => {
    const destinations = [
      {
        id: 'city-1',
        name: 'Bogota',
        country: 'Colombia',
        image_url: 'https://cdn.test/destination.jpg',
      },
    ];
    const properties = [
      {
        id: 'property-1',
        name: 'Hotel Andino',
        city: { id: 'city-1', name: 'Bogota', department: null, country: 'Colombia' },
        address: null,
        rating_avg: 4.7,
        review_count: 50,
        image: null,
        min_price: 300,
        amenities: [],
      },
    ];

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(destinations),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('bad json')),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(properties),
      } as Response);

    await expect(getFeaturedDestinations(1)).resolves.toEqual(destinations);
    await expect(getFeaturedDestinations()).rejects.toThrow('Error 503');
    await expect(getFeaturedProperties(1)).resolves.toEqual(properties);
  });

  it('getPropertyDetail handles query params, 404 and partial error body', async () => {
    const detail = {
      detail: {
        id: 'property-1',
        hotel_id: 'hotel-1',
        name: 'Hotel Andino',
        description: null,
        city: { id: 'city-1', name: 'Bogota', department: null, country: 'Colombia' },
        address: null,
        rating_avg: 4.7,
        review_count: 50,
        popularity_score: 10,
        default_cancellation_policy: null,
        images: [],
        amenities: [],
        policies: [],
        room_types: [],
      },
      reviews: {
        items: [],
        total: 0,
        page: 1,
        page_size: 5,
        total_pages: 0,
      },
    } satisfies PropertyDetailResponse;

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(detail),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'not used' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: { field: 'city_id', issue: 'required' } }),
      } as Response);

    await expect(
      getPropertyDetail('property-1', {
        checkin: '2026-07-01',
        checkout: '2026-07-04',
        review_page: 2,
        review_page_size: 3,
      })
    ).resolves.toEqual(detail);

    const firstUrl = String(vi.mocked(global.fetch).mock.calls[0]?.[0]);
    expect(firstUrl).toContain('/api/v1/catalog/properties/property-1?');
    expect(firstUrl).toContain('checkin=2026-07-01');
    expect(firstUrl).toContain('checkout=2026-07-04');
    expect(firstUrl).toContain('review_page=2');
    expect(firstUrl).toContain('review_page_size=3');

    try {
      await getPropertyDetail('missing');
      throw new Error('Expected CatalogNotFoundError');
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogNotFoundError);
      expect(isCatalogNotFoundError(error)).toBe(true);
    }

    await expect(getPropertyDetail('bad-request')).rejects.toThrow(
      '{"field":"city_id","issue":"required"}'
    );
  });
});
