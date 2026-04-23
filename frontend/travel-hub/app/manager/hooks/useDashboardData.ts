'use client';

import { useEffect, useMemo, useState } from 'react';

import { getPublicApiBaseUrl } from '@/app/lib/api/publicApiUrl';

type Metric = {
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

type DashboardResponse = Partial<{
  metrics?: Partial<DashboardMetrics>;
  bookingTrends?: unknown[];
  recentActivity?: unknown[];
  upcomingCheckins?: unknown[];
}>;

const EMPTY_DATA: DashboardData = {
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
  if (!data?.metrics) return EMPTY_DATA.metrics;
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

export function useDashboardData(from: string, to: string) {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<DashboardError | null>(null);

  const apiBaseUrl = useMemo(() => getPublicApiBaseUrl(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ from, to });
        const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/metrics?${params}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
          const detail =
            body && typeof body.detail === 'string' ? body.detail : `Error ${response.status}`;
          const kind = response.status === 403 ? 'unauthorized' : 'server';
          throw { status: response.status, message: detail, kind } as DashboardError;
        }

        const payload = (await response.json()) as DashboardResponse;
        if (!cancelled) {
          setData(normalizeDashboardData(payload));
        }
      } catch (caught) {
        if (!cancelled) {
          setData(EMPTY_DATA);
          const fallback: DashboardError = {
            message: 'Error loading dashboard',
            kind: 'network',
          };
          if (
            caught &&
            typeof caught === 'object' &&
            'message' in caught &&
            typeof (caught as { message: unknown }).message === 'string'
          ) {
            const typed = caught as Partial<DashboardError>;
            setError({
              status: typed.status,
              message: typed.message ?? fallback.message,
              kind: typed.kind ?? 'network',
            });
          } else {
            setError(fallback);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, from, to]);

  return { data, loading, error };
}
