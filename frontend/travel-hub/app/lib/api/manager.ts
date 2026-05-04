import { API_URL } from '@/app/lib/api/constants';
import type { PaginatedResponse } from '@/app/lib/types/catalog';
import {
  CreatePromotionPayload,
  HotelProfile,
  HotelStatsOut,
  ManagerHotelItem,
  ManagerPropertyImage,
  PromotionCreatedOut,
  RatePlanCancellationPolicy,
  RoomTypeManagerItem,
  RoomTypePromotionOut,
  UpdateCancellationPolicyPayload,
} from '@/app/lib/types/manager';

import { getMe } from './auth';
import { formatApiErrorBody } from './catalog';

// ── Hotel list cache ──────────────────────────────────────────────────────────
// Caches the full hotel list (page 1, 100 items) for 30 s so the detail view
// can resolve hotel metadata instantly when navigating from the list page.
const HOTELS_TTL = 30_000;
let _hotelsCacheSlot: { v: PaginatedResponse<ManagerHotelItem>; exp: number } | null = null;

// ── API functions ─────────────────────────────────────────────────────────────

export async function getManagerHotels(
  page = 1,
  page_size = 100
): Promise<PaginatedResponse<ManagerHotelItem>> {
  if (page === 1 && page_size >= 100 && _hotelsCacheSlot && Date.now() < _hotelsCacheSlot.exp) {
    return _hotelsCacheSlot.v;
  }
  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels?page=${page}&page_size=${page_size}`,
    { credentials: 'include' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  const data = (await res.json()) as PaginatedResponse<ManagerHotelItem>;
  if (page === 1 && page_size >= 100) {
    _hotelsCacheSlot = { v: data, exp: Date.now() + HOTELS_TTL };
  }
  return data;
}

export async function getAdminHotels(
  page = 1,
  page_size = 100
): Promise<PaginatedResponse<ManagerHotelItem>> {
  const res = await fetch(
    `${API_URL}/api/v1/catalog/admin/properties?page=${page}&page_size=${page_size}`,
    { credentials: 'include' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  const data = (await res.json()) as PaginatedResponse<ManagerHotelItem>;
  return data;
}

export async function getHotels(
  page = 1,
  page_size = 100
): Promise<PaginatedResponse<ManagerHotelItem>> {
  const user = await getMe();

  if (user?.role === 'TRAVELER') {
    throw new Error('Unauthorized');
  }

  return user?.role === 'ADMIN'
    ? getAdminHotels(page, page_size)
    : getManagerHotels(page, page_size);
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

export async function getHotelProfile(propertyId: string, hotelId?: string): Promise<HotelProfile> {
  const params = new URLSearchParams();

  if (hotelId) {
    params.set('hotel_id', hotelId);
  }

  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/profile?${params.toString()}`,
    {
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}

export async function updateHotelProfile(
  propertyId: string,
  payload: { description?: string | null; amenity_codes?: string[]; policy?: string },
  hotelId?: string
): Promise<HotelProfile> {
  const params = new URLSearchParams();

  if (hotelId) {
    params.set('hotel_id', hotelId);
  }

  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/profile?${params.toString()}`,
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

export async function addHotelImage(
  propertyId: string,
  payload: { url: string; caption?: string },
  hotelId?: string
): Promise<ManagerPropertyImage> {
  const params = new URLSearchParams();

  if (hotelId) {
    params.set('hotel_id', hotelId);
  }

  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/images?${params.toString()}`,
    {
      method: 'POST',
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

export async function deleteHotelImage(
  propertyId: string,
  imageId: string,
  hotelId?: string
): Promise<void> {
  const params = new URLSearchParams();

  if (hotelId) {
    params.set('hotel_id', hotelId);
  }

  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/images/${imageId}?${params.toString()}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
}

export async function setPrimaryHotelImage(
  propertyId: string,
  imageId: string,
  hotelId?: string
): Promise<ManagerPropertyImage[]> {
  const params = new URLSearchParams();

  if (hotelId) {
    params.set('hotel_id', hotelId);
  }

  const res = await fetch(
    `${API_URL}/api/v1/catalog/manager/hotels/${propertyId}/images/${imageId}/primary?${params.toString()}`,
    { method: 'PATCH', credentials: 'include' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(formatApiErrorBody(body, res.status));
  }
  return res.json();
}
