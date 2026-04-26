'use client';

import { useState } from 'react';

import {
  EMPTY_REVENUE_REPORT_DATA,
  RevenueReportFetchError,
  getRevenueReport,
} from '@/app/lib/api/reports';
import type { RevenueReportData, RevenueReportError } from '@/app/lib/types/reports';

export function useRevenueReport() {
  const [data, setData] = useState<RevenueReportData>(EMPTY_REVENUE_REPORT_DATA);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<RevenueReportError | null>(null);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  async function generateReport(params: {
    from: string;
    to: string;
    hotelId: string;
    mode?: 'partner' | 'admin';
  }) {
    setLoading(true);
    setError(null);
    setHasLoaded(true);
    try {
      const report = await getRevenueReport(params);
      setData(report);
    } catch (caught) {
      setData(EMPTY_REVENUE_REPORT_DATA);
      if (caught instanceof RevenueReportFetchError) {
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
        setError({
          message: 'Error loading revenue report',
          kind: 'network',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    data,
    loading,
    error,
    hasLoaded,
    generateReport,
  };
}
