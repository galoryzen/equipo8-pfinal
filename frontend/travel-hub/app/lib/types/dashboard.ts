export type Metric = {
  value: number | null;
  variation: number;
};

export type BookingTrend = {
  date: string;
  bookings: number;
};

export type RecentActivityItem = {
  type: string;
  description: string;
  timestamp: string;
};

export type UpcomingCheckin = {
  guest: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  status: string;
  amount: number;
};

export type DashboardMetrics = {
  totalBookings: Metric;
  revenue: Metric;
  occupancyRate: Metric;
  averageRating: Metric;
};

export type DashboardData = {
  metrics: DashboardMetrics;
  /** Active CHECKED_IN stays for the hotel (check-in ≤ today < check-out). */
  checkedInCount: number;
  /** Sum of guests_count for those stays. */
  checkedInGuests: number;
  bookingTrends: BookingTrend[];
  recentActivity: RecentActivityItem[];
  upcomingCheckins: UpcomingCheckin[];
};

export type DashboardError = {
  status?: number;
  message: string;
  kind: 'unauthorized' | 'network' | 'server';
};

export type DashboardResponse = Partial<{
  metrics?: Partial<DashboardMetrics>;
  checkedInCount?: unknown;
  checked_in_count?: unknown;
  checkedInGuests?: unknown;
  checked_in_guests?: unknown;
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
