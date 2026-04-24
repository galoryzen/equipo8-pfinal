import type {
  ReportMetric,
  RevenueByRoomType,
  RevenueReportData,
  RevenueTrend,
} from '@/app/lib/types/reports';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

export const EMPTY_REVENUE_REPORT_DATA: RevenueReportData = {
  kpis: {
    totalRevenue: { value: 0, variation: 0 },
    adr: { value: 0, variation: 0 },
    occupancyRate: { value: 0, variation: 0 },
  },
  trends: [],
  revenueByRoomType: [],
  totalAggregatedRevenue: 0,
  metadata: {
    from: '',
    to: '',
    currency: 'USD',
  },
};

type RevenueReportResponse = Partial<{
  kpis: Partial<{
    totalRevenue: unknown;
    adr: unknown;
    occupancyRate: unknown;
  }>;
  trends: unknown[];
  revenueByRoomType: unknown[];
  totalAggregatedRevenue: unknown;
  metadata: Partial<{
    from: unknown;
    to: unknown;
    currency: unknown;
  }>;
}>;

export class RevenueReportFetchError extends Error {
  readonly status?: number;
  readonly kind: 'unauthorized' | 'network' | 'server';

  constructor(
    message: string,
    opts: { status?: number; kind: 'unauthorized' | 'network' | 'server' }
  ) {
    super(message);
    this.name = 'RevenueReportFetchError';
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

function toMetric(value: unknown): ReportMetric {
  if (!value || typeof value !== 'object') {
    return { value: 0, variation: 0 };
  }
  const source = value as { value?: unknown; variation?: unknown };
  return {
    value: toFiniteNumber(source.value, 0),
    variation: toFiniteNumber(source.variation, 0),
  };
}

function normalizeTrends(items: unknown[] | undefined): RevenueTrend[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as { date?: unknown; revenue?: unknown; occupancyRate?: unknown };
      const date = typeof source.date === 'string' ? source.date : '';
      if (!date) return null;
      return {
        date,
        revenue: toFiniteNumber(source.revenue, 0),
        occupancyRate: toFiniteNumber(source.occupancyRate, 0),
      };
    })
    .filter((item): item is RevenueTrend => item !== null);
}

function normalizeRevenueByRoomType(items: unknown[] | undefined): RevenueByRoomType[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const source = item as {
        roomType?: unknown;
        unitsSold?: unknown;
        avgRate?: unknown;
        totalRevenue?: unknown;
      };
      const roomType = typeof source.roomType === 'string' ? source.roomType : '';
      if (!roomType) return null;
      return {
        roomType,
        unitsSold: Math.max(0, Math.round(toFiniteNumber(source.unitsSold, 0))),
        avgRate: toFiniteNumber(source.avgRate, 0),
        totalRevenue: toFiniteNumber(source.totalRevenue, 0),
      };
    })
    .filter((item): item is RevenueByRoomType => item !== null);
}

function normalizeRevenueReport(payload: RevenueReportResponse | null): RevenueReportData {
  return {
    kpis: {
      totalRevenue: toMetric(payload?.kpis?.totalRevenue),
      adr: toMetric(payload?.kpis?.adr),
      occupancyRate: toMetric(payload?.kpis?.occupancyRate),
    },
    trends: normalizeTrends(payload?.trends),
    revenueByRoomType: normalizeRevenueByRoomType(payload?.revenueByRoomType),
    totalAggregatedRevenue: toFiniteNumber(payload?.totalAggregatedRevenue, 0),
    metadata: {
      from: typeof payload?.metadata?.from === 'string' ? payload.metadata.from : '',
      to: typeof payload?.metadata?.to === 'string' ? payload.metadata.to : '',
      currency: typeof payload?.metadata?.currency === 'string' ? payload.metadata.currency : 'USD',
    },
  };
}

export async function getRevenueReport(params: {
  from: string;
  to: string;
  hotelId: string;
}): Promise<RevenueReportData> {
  const hotelId = params.hotelId?.trim();
  if (!hotelId) {
    throw new RevenueReportFetchError('Missing hotel_id for revenue report', { kind: 'server' });
  }
  const query = new URLSearchParams();
  query.set('hotel_id', hotelId);
  query.set('from', params.from);
  query.set('to', params.to);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/dashboard/revenue-report?${query.toString()}`, {
      credentials: 'include',
    });
  } catch {
    throw new RevenueReportFetchError('Error loading revenue report', { kind: 'network' });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail =
      body && typeof body.detail === 'string' ? body.detail : `Error ${response.status}`;
    const kind = response.status === 403 ? 'unauthorized' : 'server';
    throw new RevenueReportFetchError(detail, { status: response.status, kind });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new RevenueReportFetchError('Error loading revenue report', { kind: 'network' });
  }

  return normalizeRevenueReport(payload as RevenueReportResponse);
}
