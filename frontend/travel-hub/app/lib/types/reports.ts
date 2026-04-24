export type ReportMetric = {
  value: number;
  variation: number;
};

export type RevenueKpis = {
  totalRevenue: ReportMetric;
  adr: ReportMetric;
  occupancyRate: ReportMetric;
};

export type RevenueTrend = {
  date: string;
  revenue: number;
  occupancyRate: number;
};

export type RevenueByRoomType = {
  roomType: string;
  unitsSold: number;
  avgRate: number;
  totalRevenue: number;
};

export type RevenueReportMetadata = {
  from: string;
  to: string;
  currency: string;
};

export type RevenueReportData = {
  kpis: RevenueKpis;
  trends: RevenueTrend[];
  revenueByRoomType: RevenueByRoomType[];
  totalAggregatedRevenue: number;
  metadata: RevenueReportMetadata;
};

export type RevenueReportError = {
  status?: number;
  message: string;
  kind: 'unauthorized' | 'network' | 'server';
};
