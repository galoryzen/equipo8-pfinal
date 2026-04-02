export interface CitySummary {
  id: string;
  name: string;
  department: string | null;
  country: string;
}

export interface AmenitySummary {
  code: string;
  name: string;
}

export interface ImageSummary {
  url: string;
  caption: string | null;
}

export interface PropertySummary {
  id: string;
  name: string;
  city: CitySummary;
  address: string | null;
  rating_avg: number | null;
  review_count: number;
  image: ImageSummary | null;
  min_price: number | null;
  amenities: AmenitySummary[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  /** Set by catalog search when total === 0 */
  message?: string | null;
}

export interface CityOut {
  id: string;
  name: string;
  department: string | null;
  country: string;
}

export interface SearchFilters {
  checkin: string;
  checkout: string;
  guests: number;
  city_id?: string;
  min_price?: number;
  max_price?: number;
  amenities?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}

// ── Property Detail types ─────────────────────────────────────────────────

export interface PropertyImageOut {
  id: string;
  url: string;
  caption: string | null;
  display_order: number;
}

export interface CancellationPolicyOut {
  id: string;
  name: string;
  type: string;
  hours_limit: number | null;
  refund_percent: number | null;
}

export interface RatePlanOut {
  id: string;
  name: string;
  cancellation_policy: CancellationPolicyOut | null;
  min_price: number | null;
}

export interface RoomTypeOut {
  id: string;
  name: string;
  capacity: number;
  amenities: AmenitySummary[];
  rate_plans: RatePlanOut[];
  min_price: number | null;
}

export interface ReviewOut {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface PropertyPolicyOut {
  id: string;
  category: string;
  description: string;
}

export interface PropertyDetail {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  city: CitySummary;
  address: string | null;
  rating_avg: number | null;
  review_count: number;
  popularity_score: number;
  default_cancellation_policy: CancellationPolicyOut | null;
  images: PropertyImageOut[];
  amenities: AmenitySummary[];
  policies: PropertyPolicyOut[];
  room_types: RoomTypeOut[];
}

export interface PropertyDetailResponse {
  detail: PropertyDetail;
  reviews: PaginatedResponse<ReviewOut>;
}
