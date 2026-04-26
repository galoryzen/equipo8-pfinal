import type {
  BookingTrend,
  DashboardData,
  DashboardMetrics,
  Metric,
  RecentActivityItem,
  UpcomingCheckin,
} from '@/app/lib/types/dashboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

export const EMPTY_DASHBOARD_DATA: DashboardData = {
  metrics: {
    totalBookings: { value: 0, variation: 0 },
    revenue: { value: 0, variation: 0 },
    occupancyRate: { value: 0, variation: 0 },
    averageRating: { value: 0, variation: 0 },
  },
  bookingTrends: [],
  recentActivity: [],
  upcomingCheckins: [],
};

type DashboardResponse = Partial<{
  metrics?: Partial<DashboardMetrics>;
  bookingTrends?: unknown[];
  recentActivity?: unknown[];
  upcomingCheckins?: unknown[];
}>;

export class DashboardFetchError extends Error {
  readonly status?: number;
  readonly kind: 'unauthorized' | 'network' | 'server';

  constructor(
    message: string,
    opts: { status?: number; kind: 'unauthorized' | 'network' | 'server' }
  ) {
    super(message);
    this.name = 'DashboardFetchError';
    this.status = opts.status;
    this.kind = opts.kind;
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeMetric(input: unknown): Metric {
  if (!input || typeof input !== 'object') return { value: 0, variation: 0 };
  const source = input as { value?: unknown; variation?: unknown };
  return {
    value: source.value === null ? 0 : toFiniteNumber(source.value, 0),
    variation: toFiniteNumber(source.variation, 0),
  };
}

function normalizeMetrics(data: DashboardResponse | null): DashboardMetrics {
  if (!data?.metrics) return EMPTY_DASHBOARD_DATA.metrics;
  return {
    totalBookings: normalizeMetric(data.metrics.totalBookings),
    revenue: normalizeMetric(data.metrics.revenue),
    occupancyRate: normalizeMetric(data.metrics.occupancyRate),
    averageRating: normalizeMetric(data.metrics.averageRating),
  };
}

function normalizeBookingTrends(items: unknown[] | undefined): BookingTrend[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as { date?: unknown; bookings?: unknown };
      const date = typeof source.date === 'string' ? source.date : '';
      if (!date) return null;
      return {
        date,
        bookings: Math.max(0, Math.round(toFiniteNumber(source.bookings, 0))),
      };
    })
    .filter((item): item is BookingTrend => item !== null);
}

function normalizeRecentActivity(items: unknown[] | undefined): RecentActivityItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as { type?: unknown; description?: unknown; timestamp?: unknown };
      const type = typeof source.type === 'string' ? source.type : '';
      const description = typeof source.description === 'string' ? source.description : '';
      const timestamp = typeof source.timestamp === 'string' ? source.timestamp : '';
      if (!type || !description || !timestamp) return null;
      return { type, description, timestamp };
    })
    .filter((item): item is RecentActivityItem => item !== null);
}

function normalizeUpcomingCheckins(items: unknown[] | undefined): UpcomingCheckin[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as {
        guest?: unknown;
        roomType?: unknown;
        checkIn?: unknown;
        checkOut?: unknown;
        status?: unknown;
        amount?: unknown;
      };
      const guest = typeof source.guest === 'string' ? source.guest : '';
      const roomType = typeof source.roomType === 'string' ? source.roomType : '';
      const checkIn = typeof source.checkIn === 'string' ? source.checkIn : '';
      const checkOut = typeof source.checkOut === 'string' ? source.checkOut : '';
      const status = typeof source.status === 'string' ? source.status : '';
      if (!guest || !roomType || !checkIn || !checkOut || !status) return null;
      return {
        guest,
        roomType,
        checkIn,
        checkOut,
        status,
        amount: toFiniteNumber(source.amount, 0),
      };
    })
    .filter((item): item is UpcomingCheckin => item !== null);
}

function normalizeDashboardData(payload: DashboardResponse | null): DashboardData {
  return {
    metrics: normalizeMetrics(payload),
    bookingTrends: normalizeBookingTrends(payload?.bookingTrends),
    recentActivity: normalizeRecentActivity(payload?.recentActivity),
    upcomingCheckins: normalizeUpcomingCheckins(payload?.upcomingCheckins),
  };
}

/**
 * Hotel manager dashboard metrics (cookie session, same origin as API).
 */
export async function getHotelDashboardMetrics(from: string, to: string): Promise<DashboardData> {
  const params = new URLSearchParams({ from, to });
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/booking/dashboard/metrics?${params}`, {
      credentials: 'include',
    });
  } catch {
    throw new DashboardFetchError('Error loading dashboard', { kind: 'network' });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail =
      body && typeof body.detail === 'string' ? body.detail : `Error ${response.status}`;
    const kind = response.status === 403 ? 'unauthorized' : 'server';
    throw new DashboardFetchError(detail, { status: response.status, kind });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new DashboardFetchError('Error loading dashboard', { kind: 'network' });
  }

  return normalizeDashboardData(payload as DashboardResponse);
}

export async function getAdminDashboardMetrics(params: {
  from: string;
  to: string;
  hotelId: string;
}): Promise<DashboardData> {
  const hotelId = params.hotelId?.trim();
  if (!hotelId) {
    throw new DashboardFetchError('Missing hotel_id for admin dashboard', { kind: 'server' });
  }
  const query = new URLSearchParams({ from: params.from, to: params.to, hotel_id: hotelId });
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/booking/dashboard/metrics?${query.toString()}`, {
      credentials: 'include',
    });
  } catch {
    throw new DashboardFetchError('Error loading dashboard', { kind: 'network' });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail =
      body && typeof body.detail === 'string' ? body.detail : `Error ${response.status}`;
    const kind = response.status === 403 ? 'unauthorized' : 'server';
    throw new DashboardFetchError(detail, { status: response.status, kind });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new DashboardFetchError('Error loading dashboard', { kind: 'network' });
  }

  return normalizeDashboardData(payload as DashboardResponse);
}
