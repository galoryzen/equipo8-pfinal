import type { NightPrice } from '@src/types/catalog';

export interface CreateCartBookingPayload {
  checkin: string;
  checkout: string;
  currency_code: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  guests_count: number;
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
  guests_count: number;
  nights_breakdown: NightPrice[];
  /** Server-computed fees persisted on the cart for consistent display. */
  taxes: string;
  service_fee: string;
  /** Subtotal + taxes + service_fee — what the user is charged. */
  grand_total: string;
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

export interface Guest {
  id?: string;
  is_primary: boolean;
  full_name: string;
  email: string | null;
  phone: string | null;
}

export interface SaveGuestsPayload {
  guests: Guest[];
}

/**
 * Latest failed payment attempt observed for this booking. Populated by the
 * booking service from `booking_status_history` rows tagged
 * `payment_failed:...`. Absent (null) means no failure has ever been recorded
 * on this booking. Used by the payment screen polling to distinguish a real
 * decline from a slow/lost event without minting a new booking state.
 */
export interface LastPaymentAttempt {
  outcome: 'failed';
  reason: string;
  /** ISO 8601 — when the booking service recorded the failure. */
  occurred_at: string;
}

export interface BookingDetail extends CartBooking {
  policy_type_applied: string;
  policy_hours_limit_applied: number | null;
  policy_refund_percent_applied: number | null;
  guests: Guest[];
  last_payment_attempt?: LastPaymentAttempt | null;
  created_at: string;
  updated_at: string;
}

/**
 * Server fields + local extras we need to render Trips/checkout without
 * re-fetching the property/room. Saved in AsyncStorage under `travelhub.cart`.
 */
export interface CartSnapshot extends CartBooking {
  property_name: string;
  room_name: string;
  image_url?: string;
}

export interface CartExtras {
  property_name: string;
  room_name: string;
  image_url?: string;
}
