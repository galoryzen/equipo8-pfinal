export interface NightPrice {
  day: string;
  price: string;
  original_price?: string | null;
}

export interface CreateCartBookingPayload {
  checkin: string;
  checkout: string;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  guests_count?: number;
}

export interface CartBooking {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  hold_expires_at: string;
  total_amount: string;
  original_total_amount?: string | null;
  discount_percent?: string | null;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  unit_price: string;
  original_unit_price?: string | null;
  nights_breakdown: NightPrice[];
  /** Server-computed fees persisted on the cart row for consistent display. */
  taxes: string;
  service_fee: string;
  /** Subtotal + taxes + service_fee — what the user is charged. */
  grand_total: string;
  original_taxes?: string | null;
  original_service_fee?: string | null;
  original_grand_total?: string | null;
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
  /** Enriched by the booking service from the catalog on list requests. */
  property_name?: string | null;
  image_url?: string | null;
  nights?: number | null;
  guests_count?: number | null;
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

/**
 * Latest failed payment attempt observed for this booking. Populated by the
 * booking service from `booking_status_history` rows tagged
 * `payment_failed:...`. Absent (null) means no failure has ever been recorded.
 * Used by the payment screen polling to distinguish a real decline from a slow
 * event without minting a new booking state.
 */
export interface LastPaymentAttempt {
  outcome: 'failed';
  reason: string;
  /** ISO 8601 — when the booking service recorded the failure. */
  occurred_at: string;
}

export interface BookingDetail {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  hold_expires_at: string | null;
  total_amount: string;
  original_total_amount?: string | null;
  discount_percent?: string | null;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  unit_price: string;
  original_unit_price?: string | null;
  policy_type_applied: string;
  policy_hours_limit_applied: number | null;
  policy_refund_percent_applied: number | null;
  nights_breakdown?: NightPrice[];
  taxes?: string;
  service_fee?: string;
  grand_total?: string;
  original_taxes?: string | null;
  original_service_fee?: string | null;
  original_grand_total?: string | null;
  last_payment_attempt?: LastPaymentAttempt | null;
  created_at: string;
  updated_at: string;
}
