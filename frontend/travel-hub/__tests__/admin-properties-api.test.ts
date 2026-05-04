import { AdminPropertiesFetchError, getAdminProperties } from '@/app/lib/api/adminProperties';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'https://api.travelhub.galoryzen.xyz';

describe('admin properties API', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests admin properties with limit and credentials', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { id: 'p1', name: 'Hotel One' },
            { id: 'p2', name: 'Hotel Two' },
          ],
        }),
    } as Response);

    const result = await getAdminProperties(25);

    expect(result).toEqual([
      { id: 'p1', name: 'Hotel One' },
      { id: 'p2', name: 'Hotel Two' },
    ]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/catalog/admin/properties?limit=25`,
      { credentials: 'include' }
    );
  });

  it('maps items from paginated response and returns [] when items is not an array', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [{ id: 'ok', name: 'Valid' }],
        }),
    } as Response);

    const mapped = await getAdminProperties();
    expect(mapped).toEqual([{ id: 'ok', name: 'Valid' }]);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    } as Response);

    await expect(getAdminProperties()).resolves.toEqual([]);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ notItems: true }),
    } as Response);

    await expect(getAdminProperties()).resolves.toEqual([]);
  });

  it('throws network-kind error when fetch throws', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('down'));

    await expect(getAdminProperties()).rejects.toMatchObject({
      name: 'AdminPropertiesFetchError',
      kind: 'network',
      message: 'Error loading properties',
    } satisfies Partial<AdminPropertiesFetchError>);
  });

  it('throws unauthorized-kind error on 403 with FastAPI detail', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: 'Forbidden properties' }),
    } as Response);

    await expect(getAdminProperties()).rejects.toMatchObject({
      name: 'AdminPropertiesFetchError',
      status: 403,
      kind: 'unauthorized',
      message: 'Forbidden properties',
    } satisfies Partial<AdminPropertiesFetchError>);
  });

  it('throws server-kind error on non-403, with fallback message on bad json', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    } as Response);

    await expect(getAdminProperties()).rejects.toMatchObject({
      name: 'AdminPropertiesFetchError',
      status: 500,
      kind: 'server',
      message: 'Error 500',
    } satisfies Partial<AdminPropertiesFetchError>);
  });
});
