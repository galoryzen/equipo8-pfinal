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
  bookingTrends: BookingTrend[];
  recentActivity: RecentActivityItem[];
  upcomingCheckins: UpcomingCheckin[];
};

export type DashboardError = {
  status?: number;
  message: string;
  kind: 'unauthorized' | 'network' | 'server';
};
