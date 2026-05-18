import type { RoomTypeIcon } from '@/app/manager/hotels/_data';

export interface ManagerHotelItem {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  occupiedRooms: number;
  status: 'ACTIVE' | 'PENDING_REVIEW';
  imageUrl: string | null;
  categories: number;
  hotelId: string;
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

export type PolicyCategory = 'CHECK_IN' | 'CHECK_OUT' | 'PETS' | 'SMOKING' | 'CHILDREN' | 'GENERAL';

export interface PropertyPolicyItem {
  category: PolicyCategory;
  description: string;
}

export type ManagerPropertyImage = {
  id: string;
  url: string;
  caption: string | null;
  display_order: number;
};

export type HotelProfile = {
  id: string;
  name: string;
  description: string | null;
  city: string;
  country: string;
  amenity_codes: string[];
  policies: PropertyPolicyItem[];
  images: ManagerPropertyImage[];
};

export interface TariffBase {
  room_type_id: string;
  base_price: number;
  weekend_premium: number;
}

export interface TariffSeasonalRule {
  id: string;
  room_type_id: string;
  name: string;
  start_date: string;
  end_date: string;
  adjustment_type: 'PERCENT' | 'FIXED';
  adjustment_value: number;
}

export interface RoomTariffs {
  base: TariffBase | null;
  seasonal_rules: TariffSeasonalRule[];
}

export interface UpdateBaseTariffPayload {
  base_price: number;
  weekend_premium: number;
}

export interface AddSeasonalTariffPayload {
  name: string;
  start_date: string;
  end_date: string;
  adjustment_type: 'PERCENT' | 'FIXED';
  adjustment_value: number;
}
