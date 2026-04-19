// ── Shared sub-types (match backend schemas) ────────────

export interface CityInfo {
  id: string;
  name: string;
  department?: string;
  country: string;
}

export interface FeaturedDestination {
  id: string;
  name: string;
  department?: string;
  country: string;
  image_url: string;
}

export interface ImageSummary {
  url: string;
  caption?: string;
}

export interface AmenitySummary {
  code: string;
  name: string;
}

// ── Property ────────────────────────────────────────────

export interface PropertySummary {
  id: string;
  name: string;
  city: CityInfo;
  address?: string;
  rating_avg: number;
  review_count: number;
  image?: ImageSummary;
  min_price?: number;
  original_min_price?: number;
  amenities: AmenitySummary[];
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  capacity: number;
  amenities: AmenitySummary[];
  image_url?: string;
}

export interface RatePlan {
  id: string;
  room_type_id: string;
  name: string;
  price_per_night: number;
  currency_code: string;
}

export interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

// ── Pagination ─────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Detail ─────────────────────────────────────────────

export interface PropertyImageOut {
  id: string;
  url: string;
  caption?: string;
  display_order: number;
}

export interface PropertyPolicyOut {
  id: string;
  category: string;
  description: string;
}

export interface CancellationPolicyOut {
  id: string;
  name: string;
  type: string;
  hours_limit?: number;
  refund_percent?: number;
}

export interface PromotionOut {
  id: string;
  name: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
}

export interface RatePlanOut {
  id: string;
  name: string;
  cancellation_policy?: CancellationPolicyOut;
  min_price?: number;
  original_min_price?: number;
  currency_code?: string;
  promotion?: PromotionOut;
}

export interface RoomTypeImageOut {
  id: string;
  url: string;
  caption?: string;
  display_order: number;
}

export interface RoomTypeOut {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  amenities: AmenitySummary[];
  images: RoomTypeImageOut[];
  rate_plans: RatePlanOut[];
  min_price?: number;
}

export interface PropertyDetail {
  id: string;
  hotel_id: string;
  name: string;
  description?: string;
  city: CityInfo;
  address?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rating_avg?: number;
  review_count: number;
  popularity_score: number;
  default_cancellation_policy?: CancellationPolicyOut;
  images: PropertyImageOut[];
  amenities: AmenitySummary[];
  policies: PropertyPolicyOut[];
  room_types: RoomTypeOut[];
}

export interface PropertyDetailResponse {
  detail: PropertyDetail;
  reviews: PaginatedResponse<Review>;
}

// ── Search ──────────────────────────────────────────────

export interface SearchFilters {
  city_id?: string;
  checkin: string;
  checkout: string;
  guests: number;
  min_price?: number;
  max_price?: number;
  amenities?: string[];
  sort_by?: string;
  page?: number;
  page_size?: number;
}
