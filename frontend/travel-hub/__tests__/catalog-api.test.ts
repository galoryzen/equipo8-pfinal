import { describe, expect, it, vi } from 'vitest';

import { searchProperties } from '@/app/lib/api/catalog';

describe('searchProperties', () => {
  it('sends min_price and max_price as query params', async () => {
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
      min_price: 100,
      max_price: 500,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('min_price=100');
    expect(calledUrl).toContain('max_price=500');
  });

  it('omits price params when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
    });

    await searchProperties({
      checkin: '2026-04-01',
      checkout: '2026-04-05',
      guests: 2,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('min_price');
    expect(calledUrl).not.toContain('max_price');
  });

  it('sends only min_price when max is not set', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
    });

    await searchProperties({
      checkin: '2026-04-01',
      checkout: '2026-04-05',
      guests: 2,
      min_price: 50,
    });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('min_price=50');
    expect(calledUrl).not.toContain('max_price');
  });

  it('throws on API error with detail message', async () => {
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
        min_price: 500,
        max_price: 100,
      })
    ).rejects.toThrow('min_price must be less than or equal to max_price');
  });
});
