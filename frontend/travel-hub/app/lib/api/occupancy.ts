import { formatApiErrorBody } from '@/app/lib/api/catalog';
import { API_URL } from '@/app/lib/api/constants';
import type {
  OccupancyCalendarResponse,
  OccupancyDailyBreakdownResponse,
  OccupancyProjectionResponse,
} from '@/app/lib/types/occupancy';

export class OccupancyApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OccupancyApiError';
    this.status = status;
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return formatApiErrorBody(body, res.status);
}

export type OccupancyCalendarParams = {
  date_from: string;
  date_to: string;
  property_id?: string;
  room_type_id?: string;
};

export async function getOccupancyCalendar(
  params: OccupancyCalendarParams
): Promise<OccupancyCalendarResponse> {
  const search = new URLSearchParams();
  search.set('date_from', params.date_from);
  search.set('date_to', params.date_to);
  if (params.property_id) search.set('property_id', params.property_id);
  if (params.room_type_id) search.set('room_type_id', params.room_type_id);

  const res = await fetch(`${API_URL}/api/v1/booking/occupancy/calendar?${search}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new OccupancyApiError(await readErrorMessage(res), res.status);
  }
  return res.json() as Promise<OccupancyCalendarResponse>;
}

export type OccupancyDailyBreakdownParams = {
  property_id: string;
  date: string;
};

export async function getOccupancyDailyBreakdown(
  params: OccupancyDailyBreakdownParams
): Promise<OccupancyDailyBreakdownResponse> {
  const search = new URLSearchParams();
  search.set('property_id', params.property_id);
  search.set('date', params.date);

  const res = await fetch(`${API_URL}/api/v1/booking/occupancy/daily-breakdown?${search}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new OccupancyApiError(await readErrorMessage(res), res.status);
  }
  return res.json() as Promise<OccupancyDailyBreakdownResponse>;
}

export type OccupancyProjectionParams = {
  property_id?: string;
  days?: number;
};

export async function getOccupancyProjection(
  params?: OccupancyProjectionParams
): Promise<OccupancyProjectionResponse> {
  const search = new URLSearchParams();
  const days = params?.days ?? 90;
  search.set('days', String(days));
  if (params?.property_id) search.set('property_id', params.property_id);

  const res = await fetch(`${API_URL}/api/v1/booking/occupancy/projection?${search}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new OccupancyApiError(await readErrorMessage(res), res.status);
  }
  return res.json() as Promise<OccupancyProjectionResponse>;
}
