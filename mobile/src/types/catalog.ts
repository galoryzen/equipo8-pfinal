export interface Property {
  id: string;
  name: string;
  city: string;
  country_code: string;
  address?: string;
  rating_avg: number;
  review_count: number;
  image_url?: string;
  min_price?: number;
  currency_code?: string;
  amenities: string[];
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  capacity: number;
  amenities: string[];
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
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface SearchFilters {
  city?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  min_price?: number;
  max_price?: number;
  amenities?: string[];
}
