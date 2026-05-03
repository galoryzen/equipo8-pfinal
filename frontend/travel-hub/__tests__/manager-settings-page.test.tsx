import * as catalogApi from '@/app/lib/api/catalog';
import * as managerApi from '@/app/lib/api/manager';
import ManagerSettingsPage from '@/app/manager/settings/page';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

const mockReplace = vi.fn();
const searchParamsRef = { current: new URLSearchParams('id=hotel-99') };
/** Stable reference — settings useEffect depends on `router` */
const routerStub = { push: vi.fn(), replace: mockReplace, prefetch: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => routerStub,
  useSearchParams: () => searchParamsRef.current,
}));

describe('ManagerSettingsPage', () => {
  beforeEach(() => {
    searchParamsRef.current = new URLSearchParams('id=hotel-99');
    mockReplace.mockClear();

    vi.spyOn(catalogApi, 'getAmenityCatalog').mockResolvedValue([{ code: 'WIFI', name: 'WiFi' }]);

    vi.spyOn(managerApi, 'getManagerHotels').mockResolvedValue({
      items: [
        {
          id: 'hotel-99',
          name: 'Settings Hotel',
          location: 'X',
          totalRooms: 1,
          occupiedRooms: 0,
          status: 'ACTIVE' as const,
          imageUrl: null,
          categories: 1,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    });

    vi.spyOn(managerApi, 'getHotelProfile').mockResolvedValue({
      id: 'hotel-99',
      name: 'Settings Hotel',
      description: 'Hello',
      city: 'Medellín',
      country: 'CO',
      amenity_codes: ['WIFI'],
      policy: 'Be nice',
      images: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads profile and shows hotel name in the header', async () => {
    renderWithI18n(<ManagerSettingsPage />);

    expect(await screen.findByRole('heading', { name: /edit hotel profile/i })).toBeTruthy();
    expect(screen.getAllByText('Settings Hotel').length).toBeGreaterThan(0);
  });

  it('calls router.replace with default hotel id when query has no id', async () => {
    searchParamsRef.current = new URLSearchParams('');

    renderWithI18n(<ManagerSettingsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/manager/settings?id=hotel-99');
    });
  });
});
