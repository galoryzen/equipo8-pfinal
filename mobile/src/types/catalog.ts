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

// ── Search ──────────────────────────────────────────────

export interface SearchFilters {
  city_id?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  min_price?: number;
  max_price?: number;
  amenities?: string[];
}
