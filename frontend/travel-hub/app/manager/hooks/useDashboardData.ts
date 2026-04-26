'use client';

import { useEffect, useState } from 'react';

import {
  DashboardFetchError,
  EMPTY_DASHBOARD_DATA,
  getAdminDashboardMetrics,
  getHotelDashboardMetrics,
} from '@/app/lib/api/dashboard';
import type { DashboardData, DashboardError } from '@/app/lib/types/dashboard';

export type {
  BookingTrend,
  DashboardData,
  DashboardError,
  DashboardMetrics,
  RecentActivityItem,
  UpcomingCheckin,
} from '@/app/lib/types/dashboard';

export function useDashboardData(from: string, to: string) {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<DashboardError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const result = await getHotelDashboardMetrics(from, to);
        if (!cancelled) {
          setData(result);
        }
      } catch (caught) {
        if (!cancelled) {
          setData(EMPTY_DASHBOARD_DATA);
          const fallback: DashboardError = {
            message: 'Error loading dashboard',
            kind: 'network',
          };
          if (caught instanceof DashboardFetchError) {
            setError({
              status: caught.status,
              message: caught.message,
              kind: caught.kind,
            });
          } else if (caught instanceof Error) {
            setError({
              message: caught.message,
              kind: 'network',
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
  }, [from, to]);

  return { data, loading, error };
}

export function useAdminDashboardData(from: string, to: string, hotelId: string) {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<DashboardError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!hotelId) {
        setData(EMPTY_DASHBOARD_DATA);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await getAdminDashboardMetrics({ from, to, hotelId });
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled) {
          setData(EMPTY_DASHBOARD_DATA);
          const fallback: DashboardError = { message: 'Error loading dashboard', kind: 'network' };
          if (caught instanceof DashboardFetchError) {
            setError({ status: caught.status, message: caught.message, kind: caught.kind });
          } else if (caught instanceof Error) {
            setError({ message: caught.message, kind: 'network' });
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
  }, [from, to, hotelId]);

  return { data, loading, error };
}
