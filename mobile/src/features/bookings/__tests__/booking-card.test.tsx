import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { BookingCard } from '@src/features/bookings/booking-card';
import type { EnrichedBookingListItem } from '@src/features/bookings/use-my-bookings';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const BASE: EnrichedBookingListItem = {
  id: '90000000-0000-0000-0000-000000000001',
  status: 'CONFIRMED',
  checkin: '2026-05-01',
  checkout: '2026-05-04',
  total_amount: '300.00',
  currency_code: 'USD',
  property_id: 'p1',
  room_type_id: 'r1',
  created_at: '2026-04-01T12:00:00',
  property_name: 'Casa Medina',
  city_name: 'Bogotá',
  image_url: 'https://example.com/1.jpg',
};

describe('BookingCard', () => {
  it('renders property name, city, dates, status key, and truncated code', () => {
    const { getByText } = render(<BookingCard booking={BASE} onPress={jest.fn()} />);

    expect(getByText('Casa Medina')).toBeTruthy();
    expect(getByText('Bogotá')).toBeTruthy();
    expect(getByText('2026-05-01 → 2026-05-04')).toBeTruthy();
    expect(getByText('trips.status.confirmed')).toBeTruthy();
    expect(getByText('#90000000')).toBeTruthy();
  });

  it('falls back to unknown property key when name is missing', () => {
    const { getByText } = render(
      <BookingCard
        booking={{ ...BASE, property_name: undefined }}
        onPress={jest.fn()}
      />,
    );

    expect(getByText('trips.card.unknownProperty')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<BookingCard booking={BASE} onPress={onPress} />);

    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the danger status pill for CANCELLED and REJECTED', () => {
    const cancelled = render(
      <BookingCard booking={{ ...BASE, status: 'CANCELLED' }} onPress={jest.fn()} />,
    );
    expect(cancelled.getByText('trips.status.cancelled')).toBeTruthy();

    const rejected = render(
      <BookingCard booking={{ ...BASE, status: 'REJECTED' }} onPress={jest.fn()} />,
    );
    expect(rejected.getByText('trips.status.rejected')).toBeTruthy();
  });

  it('renders the neutral status pill for pending statuses', () => {
    const pending = render(
      <BookingCard booking={{ ...BASE, status: 'PENDING_PAYMENT' }} onPress={jest.fn()} />,
    );
    expect(pending.getByText('trips.status.pendingPayment')).toBeTruthy();
  });
});
