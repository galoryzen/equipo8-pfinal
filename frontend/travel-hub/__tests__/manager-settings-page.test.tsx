import { getMe } from '@/app/lib/api/auth';
import * as catalogApi from '@/app/lib/api/catalog';
import ManagerSettingsPage from '@/app/manager/settings/page';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn(),
}));

const managerMocks = vi.hoisted(() => ({
  getManagerHotels: vi.fn(),
  getHotelProfile: vi.fn(),
}));

vi.mock('@/app/lib/api/manager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api/manager')>();
  return {
    ...actual,
    getManagerHotels: managerMocks.getManagerHotels,
    getHotelProfile: managerMocks.getHotelProfile,
  };
});

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

    vi.mocked(getMe).mockResolvedValue({
      id: 'user-1',
      email: 'partner@test.com',
      role: 'HOTEL',
    });

    vi.spyOn(catalogApi, 'getAmenityCatalog').mockResolvedValue([{ code: 'WIFI', name: 'WiFi' }]);

    vi.spyOn(catalogApi, 'getPropertyDetail').mockResolvedValue({
      detail: {
        id: 'hotel-99',
        hotel_id: 'hotel-99',
        name: 'Settings Hotel',
        description: null,
        city: { id: 'c1', name: 'Medellín', department: null, country: 'CO' },
        address: null,
        rating_avg: null,
        review_count: 0,
        popularity_score: 0,
        default_cancellation_policy: null,
        images: [],
        amenities: [],
        policies: [],
        room_types: [],
      },
      reviews: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
    });

    managerMocks.getManagerHotels.mockResolvedValue({
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
          hotelId: 'hotel-99',
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    });

    managerMocks.getHotelProfile.mockResolvedValue({
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

    expect(
      await screen.findByRole('heading', { level: 1, name: /edit hotel profile/i })
    ).toBeTruthy();
    expect((await screen.findAllByText('Settings Hotel')).length).toBeGreaterThan(0);
  });

  it('calls router.replace with default hotel id when query has no id', async () => {
    searchParamsRef.current = new URLSearchParams('');

    renderWithI18n(<ManagerSettingsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/manager/settings?id=hotel-99');
    });
  });
});
