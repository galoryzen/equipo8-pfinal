import type { PaginatedResponse } from '@/app/lib/types/catalog';
import type { RoomTypeIcon } from '@/app/manager/hotels/_data';

import { formatApiErrorBody } from './catalog';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz';

// ── Types matching backend schemas ────────────────────────────────────────────

export interface ManagerHotelItem {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  occupiedRooms: number;
  status: 'ACTIVE' | 'PENDING_REVIEW';
  imageUrl: string | null;
  categories: number;
}

export interface HotelStatsOut {
  occupancyRate: number;
  activeBookings: number;
  monthlyRevenue: number;
}

export interface RoomTypeManagerItem {
  id: string;
  name: string;
  icon: RoomTypeIcon;
  available: number;
  total: number;
  rate_plan_id: string | null;
}

export interface RoomTypePromotionOut {
  id: string;
  rate_plan_id: string;
  name: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface CreatePromotionPayload {
  rate_plan_id: string;
  name: string;
  discount_type: 'NONE' | 'PERCENT' | 'FIXED';
  discount_value: number;
  start_date: string;
  end_date: string;
}

export interface PromotionCreatedOut {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export type CancellationPolicyTypeStr = 'FULL' | 'PARTIAL' | 'NON_REFUNDABLE';

export interface RatePlanCancellationPolicy {
  type: CancellationPolicyTypeStr;
  refund_percent: number | null;
  hours_limit: number | null;
}

export interface UpdateCancellationPolicyPayload {
  type: CancellationPolicyTypeStr;
  refund_percent?: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getManagerHotels(
  page = 1,
  page_size = 100
): Promise<PaginatedResponse<ManagerHotelItem>> {
  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels?page=${page}&page_size=${page_size}`,
    { credentials: 'include' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function getHotelMetrics(propertyId: string): Promise<HotelStatsOut> {
  const res = await fetch(`${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/metrics`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function getHotelRoomTypes(
  propertyId: string,
  page = 1,
  page_size = 100
): Promise<PaginatedResponse<RoomTypeManagerItem>> {
  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/room-types?page=${page}&page_size=${page_size}`,
    { credentials: 'include' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function getRoomTypePromotion(
  roomTypeId: string
): Promise<RoomTypePromotionOut | null> {
  const res = await fetch(`${API_URL}/api/v1/catalog/manager/room-types/${roomTypeId}/promotion`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function deletePromotion(promotionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/catalog/manager/promotions/${promotionId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
}

export async function createPromotion(
  propertyId: string,
  payload: CreatePromotionPayload
): Promise<PromotionCreatedOut> {
  const res = await fetch(`${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/promotions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function getRatePlanCancellationPolicy(
  ratePlanId: string
): Promise<RatePlanCancellationPolicy | null> {
  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/rate-plans/${ratePlanId}/cancellation-policy`,
    { credentials: 'include' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function updateRatePlanCancellationPolicy(
  ratePlanId: string,
  payload: UpdateCancellationPolicyPayload
): Promise<RatePlanCancellationPolicy> {
  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/rate-plans/${ratePlanId}/cancellation-policy`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}
