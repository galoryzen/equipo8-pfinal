import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const emptyPage = {
  items: [] as unknown[],
  total: 0,
  page: 1,
  page_size: 100,
  total_pages: 0,
};

describe('getManagerHotels in-memory cache', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyPage),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses the response for two page=1, page_size>=100 calls without refetching', async () => {
    const { getManagerHotels } = await import('@/app/lib/api/manager');
    await getManagerHotels(1, 100);
    await getManagerHotels(1, 100);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('refetches when page is not 1', async () => {
    const page2 = { ...emptyPage, page: 2 };
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(page2),
    } as Response);
    const { getManagerHotels } = await import('@/app/lib/api/manager');
    await getManagerHotels(2, 100);
    await getManagerHotels(2, 100);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('refetches when page_size is below 100', async () => {
    const { getManagerHotels } = await import('@/app/lib/api/manager');
    await getManagerHotels(1, 50);
    await getManagerHotels(1, 50);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
