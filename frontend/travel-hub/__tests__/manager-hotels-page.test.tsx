import type { ManagerHotelItem } from '@/app/lib/api/manager';
import { getManagerHotels } from '@/app/lib/api/manager';
import ManagerHotelsPage from '@/app/manager/hotels/page';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

vi.mock('@/app/manager/hotels/[id]/HotelDetailView', () => ({
  default: function MockHotelDetail({ hotelId }: { hotelId: string }) {
    return <div data-testid="hotel-detail-mock">{hotelId}</div>;
  },
}));

const mockPush = vi.fn();
const searchParamsRef = { current: new URLSearchParams('') };
const routerStub = { push: mockPush, replace: vi.fn(), prefetch: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => routerStub,
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/app/lib/api/manager', () => ({
  getManagerHotels: vi.fn(),
}));

const sampleHotel: ManagerHotelItem = {
  id: 'hotel-99',
  name: 'Coverage Test Hotel',
  location: 'Test City, TS',
  totalRooms: 20,
  occupiedRooms: 8,
  status: 'ACTIVE',
  imageUrl: null,
  categories: 3,
};

describe('ManagerHotelsPage', () => {
  beforeEach(() => {
    searchParamsRef.current = new URLSearchParams('');
    mockPush.mockClear();
    vi.mocked(getManagerHotels).mockClear();
    vi.mocked(getManagerHotels).mockResolvedValue({
      items: [sampleHotel],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    });
  });

  it('renders the hotel list after loading', async () => {
    renderWithI18n(<ManagerHotelsPage />);

    expect(await screen.findByText('Coverage Test Hotel')).toBeTruthy();
    expect(screen.getByRole('table', { name: /my hotels/i })).toBeTruthy();
  });

  it('shows an error message when the list fails to load', async () => {
    vi.mocked(getManagerHotels).mockRejectedValue(new Error('network down'));

    renderWithI18n(<ManagerHotelsPage />);

    expect(await screen.findByText('network down')).toBeTruthy();
  });

  it('renders the detail view when ?id= is present', async () => {
    searchParamsRef.current = new URLSearchParams('id=hotel-99');

    renderWithI18n(<ManagerHotelsPage />);

    expect(await screen.findByTestId('hotel-detail-mock')).toBeTruthy();
    expect(screen.getByTestId('hotel-detail-mock').textContent).toBe('hotel-99');
    expect(getManagerHotels).not.toHaveBeenCalled();
  });
});
