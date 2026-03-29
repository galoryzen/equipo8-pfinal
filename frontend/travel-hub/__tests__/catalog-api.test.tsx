import { describe, expect, it, vi } from 'vitest';

import { formatApiErrorBody, searchProperties } from '@/app/lib/api/catalog';

describe('formatApiErrorBody', () => {
  it('formats FastAPI validation array detail', () => {
    const msg = formatApiErrorBody(
      {
        detail: [{ type: 'missing', loc: ['query', 'city_id'], msg: 'Field required', input: null }],
      },
      422
    );
    expect(msg).toContain('Field required');
  });

  it('formats string detail', () => {
    expect(formatApiErrorBody({ detail: 'checkout must be after checkin' }, 422)).toBe(
      'checkout must be after checkin'
    );
  });
});

describe('searchProperties', () => {
  it('sends city_id and min_price and max_price as query params', async () => {
    const mockResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await searchProperties({
      checkin: '2026-04-01',
      checkout: '2026-04-05',
      guests: 2,
      city_id: 'bbbe56fe-8f4b-4498-a876-396a342d3615',
      min_price: 100,
      max_price: 500,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('city_id=bbbe56fe-8f4b-4498-a876-396a342d3615');
    expect(calledUrl).toContain('min_price=100');
    expect(calledUrl).toContain('max_price=500');
  });

  it('omits price params when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
    });

    await searchProperties({
      checkin: '2026-04-01',
      checkout: '2026-04-05',
      guests: 2,
      city_id: 'bbbe56fe-8f4b-4498-a876-396a342d3615',
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('min_price');
    expect(calledUrl).not.toContain('max_price');
  });

  it('sends only min_price when max is not set', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
    });

    await searchProperties({
      checkin: '2026-04-01',
      checkout: '2026-04-05',
      guests: 2,
      city_id: 'bbbe56fe-8f4b-4498-a876-396a342d3615',
      min_price: 50,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('min_price=50');
    expect(calledUrl).not.toContain('max_price');
  });

  it('throws on API error with string detail message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () =>
        Promise.resolve({ detail: 'min_price must be less than or equal to max_price' }),
    });

    await expect(
      searchProperties({
        checkin: '2026-04-01',
        checkout: '2026-04-05',
        guests: 2,
        city_id: 'bbbe56fe-8f4b-4498-a876-396a342d3615',
        min_price: 500,
        max_price: 100,
      })
    ).rejects.toThrow('min_price must be less than or equal to max_price');
  });

  it('throws readable message for validation detail array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () =>
        Promise.resolve({
          detail: [{ type: 'missing', loc: ['query', 'city_id'], msg: 'Field required', input: null }],
        }),
    });

    await expect(
      searchProperties({
        checkin: '2026-04-01',
        checkout: '2026-04-05',
        guests: 2,
        city_id: 'bbbe56fe-8f4b-4498-a876-396a342d3615',
      })
    ).rejects.toThrow(/Field required/);
  });
});
