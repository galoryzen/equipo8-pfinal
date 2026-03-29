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
