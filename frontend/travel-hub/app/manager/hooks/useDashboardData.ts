'use client';

import { useEffect, useState } from 'react';

import {
  EMPTY_DASHBOARD_DATA,
  getAdminDashboardMetrics,
  getHotelDashboardMetrics,
} from '@/app/lib/api/dashboard';
import { DashboardData, DashboardError, DashboardFetchError } from '@/app/lib/types/dashboard';

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

export function useManagerDashboardData(
  from: string,
  to: string,
  isReady: boolean,
  isAdmin: boolean,
  hotelId: string
) {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<DashboardError | null>(null);

  useEffect(() => {
    if (!isReady) {
      setLoading(true);
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      const selectedHotelId = hotelId.trim();

      if (isAdmin && !selectedHotelId) {
        setData(EMPTY_DASHBOARD_DATA);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = isAdmin
          ? await getAdminDashboardMetrics({ from, to, hotelId: selectedHotelId })
          : await getHotelDashboardMetrics(from, to);
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
  }, [from, to, isReady, isAdmin, hotelId]);

  return { data, loading, error };
}
