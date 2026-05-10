import { getMe } from '@/app/lib/api/auth';
import { getHotelRoomTypes, getHotels } from '@/app/lib/api/manager';
import {
  getOccupancyCalendar,
  getOccupancyDailyBreakdown,
  getOccupancyProjection,
} from '@/app/lib/api/occupancy';
import ManagerOccupancyPage from '@/app/manager/occupancy/page';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from './test-utils';

const MAY_2026 = { year: 2026, monthIndex: 4 };

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn(),
}));

vi.mock('@/app/lib/api/manager', () => ({
  getHotels: vi.fn(),
  getHotelRoomTypes: vi.fn(),
}));

vi.mock('@/app/lib/api/occupancy', () => ({
  getOccupancyCalendar: vi.fn(),
  getOccupancyDailyBreakdown: vi.fn(),
  getOccupancyProjection: vi.fn(),
}));

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDay(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function monthBoundsIso(year: number, monthIndex: number): { date_from: string; date_to: string } {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  return {
    date_from: `${first.getFullYear()}-${pad2(first.getMonth() + 1)}-${pad2(first.getDate())}`,
    date_to: `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`,
  };
}

const MAY_2026_BOUNDS = monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex);

const mockHotel = {
  id: 'prop-1',
  name: 'Test Hotel',
  location: 'X',
  totalRooms: 10,
  occupiedRooms: 5,
  status: 'ACTIVE' as const,
  imageUrl: null,
  categories: 1,
  hotelId: 'h1',
};

/** Occupancy UI lives under frontend/travel-hub only (mobile app unchanged). */
describe('ManagerOccupancyPage', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue({
      id: 'u1',
      email: 'hotel@test.com',
      role: 'HOTEL',
    });
    vi.mocked(getHotels).mockResolvedValue({
      items: [mockHotel],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    });
    vi.mocked(getHotelRoomTypes).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 100,
      total_pages: 0,
    });
    vi.mocked(getOccupancyProjection).mockResolvedValue({
      property_id: 'prop-1',
      date_from: '2026-05-01',
      date_to: '2026-07-29',
      days: [],
      alerts: [],
    });
    vi.mocked(getOccupancyDailyBreakdown).mockResolvedValue({
      property_id: 'prop-1',
      date: '2026-05-15',
      room_types: [
        {
          room_type_id: 'rt1',
          room_type_name: 'Standard',
          total_rooms: 20,
          occupied_rooms: 15,
          blocked_rooms: 0,
          available_rooms: 5,
          occupancy_rate: 75.0,
          occupancy_level: 'MEDIUM',
        },
      ],
    });
  });

  async function renderOccupancyMay2026() {
    renderWithI18n(<ManagerOccupancyPage />);
    expect(await screen.findByRole('heading', { name: /occupancy overview/i })).toBeTruthy();
    await waitFor(() => {
      expect(getHotels).toHaveBeenCalled();
    });
    const monthInput = screen.getByLabelText(/month/i);
    vi.mocked(getOccupancyCalendar).mockClear();
    fireEvent.change(monthInput, { target: { value: '2026-04' } });
    await waitFor(() => {
      expect(getOccupancyCalendar).toHaveBeenCalled();
    });
    vi.mocked(getOccupancyCalendar).mockClear();
    fireEvent.change(monthInput, { target: { value: '2026-05' } });
    await waitFor(() => {
      expect(getOccupancyCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: MAY_2026_BOUNDS.date_from,
          date_to: MAY_2026_BOUNDS.date_to,
          property_id: 'prop-1',
        })
      );
    });
  }

  it('renders title and occupancy filters', async () => {
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });

    await renderOccupancyMay2026();

    expect(screen.getByLabelText(/property/i)).toBeTruthy();
    expect(screen.getByLabelText(/room type/i)).toBeTruthy();
    expect(screen.getByLabelText(/month/i)).toBeTruthy();
  });

  it('calls calendar API with date_from and date_to for the selected month', async () => {
    const { date_from, date_to } = monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex);
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      date_from,
      date_to,
      days: [],
    });

    await renderOccupancyMay2026();

    await waitFor(() => {
      expect(getOccupancyCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from,
          date_to,
          property_id: 'prop-1',
        })
      );
    });
  });

  it('shows daily occupancy and rate on calendar cells', async () => {
    const dayIso = isoDay(MAY_2026.year, MAY_2026.monthIndex, 15);
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [
        {
          date: dayIso,
          total_rooms: 50,
          occupied_rooms: 48,
          blocked_rooms: 0,
          available_rooms: 2,
          occupancy_rate: 96,
          occupancy_level: 'HIGH',
        },
      ],
    });

    await renderOccupancyMay2026();

    const cell = await screen.findByTestId(`occupancy-day-${dayIso}`);
    expect(cell.textContent).toContain('48/50');
    expect(cell.textContent).toContain('96%');
  });

  it('maps occupancy_level to data attributes for HIGH, MEDIUM, and LOW', async () => {
    const d10 = isoDay(MAY_2026.year, MAY_2026.monthIndex, 10);
    const d11 = isoDay(MAY_2026.year, MAY_2026.monthIndex, 11);
    const d12 = isoDay(MAY_2026.year, MAY_2026.monthIndex, 12);
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [
        {
          date: d10,
          total_rooms: 10,
          occupied_rooms: 9,
          blocked_rooms: 0,
          available_rooms: 1,
          occupancy_rate: 90,
          occupancy_level: 'HIGH',
        },
        {
          date: d11,
          total_rooms: 10,
          occupied_rooms: 6,
          blocked_rooms: 0,
          available_rooms: 4,
          occupancy_rate: 60,
          occupancy_level: 'MEDIUM',
        },
        {
          date: d12,
          total_rooms: 10,
          occupied_rooms: 3,
          blocked_rooms: 0,
          available_rooms: 7,
          occupancy_rate: 30,
          occupancy_level: 'LOW',
        },
      ],
    });

    await renderOccupancyMay2026();

    expect((await screen.findByTestId(`occupancy-day-${d10}`)).getAttribute('data-occupancy-level')).toBe(
      'HIGH'
    );
    expect(screen.getByTestId(`occupancy-day-${d11}`).getAttribute('data-occupancy-level')).toBe(
      'MEDIUM'
    );
    expect(screen.getByTestId(`occupancy-day-${d12}`).getAttribute('data-occupancy-level')).toBe('LOW');
  });

  it('loads daily breakdown when a day is selected', async () => {
    const dayIso = isoDay(MAY_2026.year, MAY_2026.monthIndex, 15);
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [
        {
          date: dayIso,
          total_rooms: 10,
          occupied_rooms: 5,
          blocked_rooms: 0,
          available_rooms: 5,
          occupancy_rate: 50,
          occupancy_level: 'MEDIUM',
        },
      ],
    });

    await renderOccupancyMay2026();

    const cell = await screen.findByTestId(`occupancy-day-${dayIso}`);
    fireEvent.click(cell);

    await waitFor(() => {
      expect(getOccupancyDailyBreakdown).toHaveBeenCalledWith({
        property_id: 'prop-1',
        date: dayIso,
      });
    });
  });

  it('renders breakdown rows per room type', async () => {
    const dayIso = isoDay(MAY_2026.year, MAY_2026.monthIndex, 15);
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [
        {
          date: dayIso,
          total_rooms: 10,
          occupied_rooms: 5,
          blocked_rooms: 0,
          available_rooms: 5,
          occupancy_rate: 50,
          occupancy_level: 'MEDIUM',
        },
      ],
    });

    await renderOccupancyMay2026();

    fireEvent.click(await screen.findByTestId(`occupancy-day-${dayIso}`));

    expect(await screen.findByTestId('occupancy-breakdown-table')).toBeTruthy();
    expect(screen.getByText('Standard')).toBeTruthy();
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  });

  it('requests projection with days=90', async () => {
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });

    await renderOccupancyMay2026();

    await waitFor(() => {
      expect(getOccupancyProjection).toHaveBeenCalledWith({ property_id: 'prop-1', days: 90 });
    });
  });

  it('shows projection alerts when API returns periods', async () => {
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });
    vi.mocked(getOccupancyProjection).mockResolvedValue({
      property_id: 'prop-1',
      date_from: '2026-05-01',
      date_to: '2026-07-29',
      days: [],
      alerts: [
        {
          type: 'LOW_OCCUPANCY_PERIOD',
          date_from: '2026-06-01',
          date_to: '2026-06-07',
          average_occupancy_rate: 35.5,
        },
      ],
    });

    await renderOccupancyMay2026();

    expect(await screen.findByTestId('occupancy-projection-alerts')).toBeTruthy();
    expect(screen.getByTestId('occupancy-projection-periods-summary')).toBeTruthy();
    const periodCard = screen.getByTestId('occupancy-projection-period-alert');
    expect(periodCard.textContent).toMatch(/35\.5/);
  });

  it('shows neutral empty message when there are no projection alerts', async () => {
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });

    await renderOccupancyMay2026();

    expect(
      (await screen.findByTestId('occupancy-projection-empty')).textContent
    ).toMatch(/no low-occupancy alerts/i);
  });

  it('shows an error when calendar loading fails', async () => {
    vi.mocked(getOccupancyCalendar).mockRejectedValue(new Error('network down'));

    await renderOccupancyMay2026();

    expect(await screen.findByText(/network down/i)).toBeTruthy();
  });

  it('paginates daily projection alerts (5 per page by default)', async () => {
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });
    const dayRows = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-05-${String(10 + i).padStart(2, '0')}`,
      occupancy_rate: 12,
      occupancy_level: 'LOW' as const,
      alert: { type: 'LOW_OCCUPANCY', message: 'Low projected occupancy' },
    }));
    vi.mocked(getOccupancyProjection).mockResolvedValue({
      property_id: 'prop-1',
      date_from: '2026-05-01',
      date_to: '2026-07-29',
      days: dayRows,
      alerts: [],
    });

    await renderOccupancyMay2026();

    expect(await screen.findByTestId('occupancy-projection-alerts')).toBeTruthy();
    expect(screen.queryAllByTestId('occupancy-projection-day-alert')).toHaveLength(5);
    expect(screen.getByTestId('occupancy-projection-pagination')).toBeTruthy();
    expect(screen.getByTestId('occupancy-projection-range').textContent).toMatch(/1.*5.*12/i);
  });

  it('shows grouped period summary when period alerts exist', async () => {
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });
    vi.mocked(getOccupancyProjection).mockResolvedValue({
      property_id: 'prop-1',
      date_from: '2026-05-01',
      date_to: '2026-07-29',
      days: [],
      alerts: [
        {
          type: 'LOW_OCCUPANCY_PERIOD',
          date_from: '2026-06-01',
          date_to: '2026-06-07',
          average_occupancy_rate: 20,
        },
        {
          type: 'LOW_OCCUPANCY_PERIOD',
          date_from: '2026-07-01',
          date_to: '2026-07-15',
          average_occupancy_rate: 15,
        },
      ],
    });

    await renderOccupancyMay2026();

    expect((await screen.findByTestId('occupancy-projection-periods-summary')).textContent).toMatch(
      /2.*period/i
    );
    expect(screen.queryAllByTestId('occupancy-projection-period-alert')).toHaveLength(2);
  });

  it('changes page size so all daily alerts fit on one page', async () => {
    const user = userEvent.setup();
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });
    const dayRows = Array.from({ length: 8 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
      occupancy_rate: 10,
      occupancy_level: 'LOW' as const,
      alert: { type: 'LOW_OCCUPANCY', message: 'Low projected occupancy' },
    }));
    vi.mocked(getOccupancyProjection).mockResolvedValue({
      property_id: 'prop-1',
      date_from: '2026-05-01',
      date_to: '2026-07-29',
      days: dayRows,
      alerts: [],
    });

    await renderOccupancyMay2026();

    expect(await screen.findByTestId('occupancy-projection-page-size')).toBeTruthy();
    expect(screen.queryAllByTestId('occupancy-projection-day-alert')).toHaveLength(5);

    await user.click(screen.getByRole('combobox', { name: /alerts per page/i }));
    await user.click(await screen.findByRole('option', { name: '10' }));

    await waitFor(() => {
      expect(screen.queryAllByTestId('occupancy-projection-day-alert')).toHaveLength(8);
    });

    expect(screen.queryByTestId('occupancy-projection-pagination')).toBeNull();
  });

  it('navigates projection alert pages', async () => {
    const user = userEvent.setup();
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });
    const dayRows = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-05-${String(10 + i).padStart(2, '0')}`,
      occupancy_rate: 12,
      occupancy_level: 'LOW' as const,
      alert: { type: 'LOW_OCCUPANCY', message: 'Low projected occupancy' },
    }));
    vi.mocked(getOccupancyProjection).mockResolvedValue({
      property_id: 'prop-1',
      date_from: '2026-05-01',
      date_to: '2026-07-29',
      days: dayRows,
      alerts: [],
    });

    await renderOccupancyMay2026();

    expect(await screen.findByTestId('occupancy-projection-pagination')).toBeTruthy();
    expect(screen.queryAllByTestId('occupancy-projection-day-alert')).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: /go to page 2/i }));

    await waitFor(() => {
      expect(screen.queryAllByTestId('occupancy-projection-day-alert')).toHaveLength(5);
    });
    expect(screen.getByTestId('occupancy-projection-range').textContent).toMatch(/6.*10.*12/i);
  });

  it('calendar grid and breakdown heading remain present with projection block', async () => {
    vi.mocked(getOccupancyCalendar).mockResolvedValue({
      property_id: 'prop-1',
      ...monthBoundsIso(MAY_2026.year, MAY_2026.monthIndex),
      days: [],
    });
    vi.mocked(getOccupancyProjection).mockResolvedValue({
      property_id: 'prop-1',
      date_from: '2026-05-01',
      date_to: '2026-07-29',
      days: [],
      alerts: [],
    });

    await renderOccupancyMay2026();

    expect(await screen.findByTestId('occupancy-calendar-grid')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /daily breakdown by room type/i })).toBeTruthy();
    expect(await screen.findByTestId('occupancy-projection-empty')).toBeTruthy();
  });
});
