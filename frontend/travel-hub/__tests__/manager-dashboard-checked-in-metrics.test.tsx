import ManagerDashboardPage from '@/app/manager/page';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn().mockResolvedValue({ email: 'hotel@test.com', role: 'HOTEL' }),
}));

vi.mock('@/app/lib/api/adminProperties', () => ({
  getAdminProperties: vi.fn(),
}));

const dataWithCheckedInExtras = {
  metrics: {
    totalBookings: { value: 10, variation: 0 },
    revenue: { value: 100, variation: 0 },
    occupancyRate: { value: 50, variation: 0 },
    averageRating: { value: 4.5, variation: 0 },
  },
  checkedInCount: 99,
  checkedInGuests: 200,
  bookingTrends: [],
  recentActivity: [],
  upcomingCheckins: [],
};

vi.mock('@/app/manager/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    data: dataWithCheckedInExtras,
    loading: false,
    error: null,
  }),
  useAdminDashboardData: () => ({
    data: dataWithCheckedInExtras,
    loading: false,
    error: null,
  }),
  useManagerDashboardData: () => ({
    data: dataWithCheckedInExtras,
    loading: false,
    error: null,
  }),
}));

describe('ManagerDashboardPage — no bookings-story metric cards', () => {
  it('does not surface Active check-ins / Guests in hotel cards even when API payload includes counts', async () => {
    renderWithI18n(<ManagerDashboardPage />);
    expect(await screen.findByText(/total bookings|reservas totales/i)).toBeTruthy();
    expect(screen.queryByText(/active check-ins|check-ins activos/i)).toBeNull();
    expect(screen.queryByText(/guests in hotel|huéspedes en hotel/i)).toBeNull();
    expect(screen.queryByText('99')).toBeNull();
    expect(screen.queryByText('200')).toBeNull();
  });
});
