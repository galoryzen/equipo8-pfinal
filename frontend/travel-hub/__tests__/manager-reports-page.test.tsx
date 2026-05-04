import { getActiveHotels } from '@/app/lib/api/activeHotels';
import { getMe, getUserById } from '@/app/lib/api/auth';
import { EMPTY_REVENUE_REPORT_DATA } from '@/app/lib/api/reports';
import ManagerReportsPage from '@/app/manager/reports/page';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

const generateReport = vi.fn();

vi.mock('@/app/manager/hooks/useRevenueReport', () => ({
  useRevenueReport: () => ({
    data: EMPTY_REVENUE_REPORT_DATA,
    loading: false,
    error: null,
    hasLoaded: false,
    generateReport,
  }),
}));

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('@/app/lib/api/activeHotels', () => ({
  getActiveHotels: vi.fn(),
}));

describe('ManagerReportsPage', () => {
  beforeEach(() => {
    generateReport.mockClear();
    vi.mocked(getMe).mockResolvedValue({
      id: 'user-1',
      email: 'partner@hotelesdemo.com',
      role: 'HOTEL',
    });
    vi.mocked(getUserById).mockResolvedValue({
      id: 'user-1',
      email: 'partner@hotelesdemo.com',
      hotel_id: 'hotel-1',
    });
    vi.mocked(getActiveHotels).mockResolvedValue([]);
  });

  it('renders the reports shell for a hotel partner', async () => {
    renderWithI18n(<ManagerReportsPage />);

    expect(await screen.findByRole('heading', { name: /revenue reports/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /generate report/i })).toBeTruthy();
  });

  it('loads admin property list when user is ADMIN', async () => {
    vi.mocked(getMe).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      role: 'ADMIN',
    });

    vi.mocked(getActiveHotels).mockResolvedValue([{ id: 'p1', name: 'Admin Property One' }]);

    renderWithI18n(<ManagerReportsPage />);

    await waitFor(() => {
      expect(getActiveHotels).toHaveBeenCalled();
    });
    expect(await screen.findByText('Admin Property One')).toBeTruthy();
  });
});
