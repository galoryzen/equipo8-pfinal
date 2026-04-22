export interface CreateCartBookingPayload {
  checkin: string;
  checkout: string;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  unit_price: string;
  guests_count?: number;
}

export interface CartBooking {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  hold_expires_at: string;
  total_amount: string;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  unit_price: string;
}

export interface BookingListItem {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  total_amount: string;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  created_at: string;
}

export interface PendingConfirmationBookingItem extends BookingListItem {
  image_url?: string | null;
  property_name?: string | null;
  nights?: number | null;
  guest_name?: string | null;
  guests_count?: number | null;
}

export interface PendingConfirmationBookingsEnvelope {
  bookings: PendingConfirmationBookingItem[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GuestPayload {
  is_primary: boolean;
  full_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface BookingDetail {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  hold_expires_at: string | null;
  total_amount: string;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  unit_price: string;
  policy_type_applied: string;
  policy_hours_limit_applied: number | null;
  policy_refund_percent_applied: number | null;
  created_at: string;
  updated_at: string;
}
