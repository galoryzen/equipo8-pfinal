export interface CreateCartBookingItem {
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  quantity: number;
  unit_price: string;
}

export interface CreateCartBookingPayload {
  checkin: string;
  checkout: string;
  currency_code: string;
  items: CreateCartBookingItem[];
}

export interface CartBookingItem {
  id: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface CartBooking {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  hold_expires_at: string;
  total_amount: string;
  currency_code: string;
  items: CartBookingItem[];
}

export interface BookingItemSummary {
  property_id: string;
  room_type_id: string;
  quantity: number;
}

export interface BookingListItem {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  total_amount: string;
  currency_code: string;
  created_at: string;
  items: BookingItemSummary[];
}

export interface BookingItemDetail {
  id: string;
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface BookingDetail {
  id: string;
  status: string;
  checkin: string;
  checkout: string;
  hold_expires_at: string | null;
  total_amount: string;
  currency_code: string;
  policy_type_applied: string;
  policy_hours_limit_applied: number | null;
  policy_refund_percent_applied: number | null;
  created_at: string;
  updated_at: string;
  items: BookingItemDetail[];
}

export interface HeldRooms {
  held_room_type_ids: string[];
}
