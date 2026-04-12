import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import BookingCard from '@/components/traveler/BookingCard';
import BookingList from '@/components/traveler/BookingList';
import TripsEmptyState from '@/components/traveler/TripsEmptyState';
import type { BookingListItem } from '@/app/lib/types/booking';
import type { PropertyDetail } from '@/app/lib/types/catalog';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const sampleBooking: BookingListItem = {
  id: '90000000-0000-0000-0000-000000000001',
  status: 'CONFIRMED',
  checkin: '2026-06-01',
  checkout: '2026-06-05',
  total_amount: '400.00',
  currency_code: 'USD',
  created_at: '2026-01-01T12:00:00',
  items: [
    {
      property_id: '30000000-0000-0000-0000-000000000001',
      room_type_id: '60000000-0000-0000-0000-000000000001',
      quantity: 1,
    },
  ],
};

const sampleProperty: PropertyDetail = {
  id: '30000000-0000-0000-0000-000000000001',
  hotel_id: 'h1',
  name: 'Test Hotel',
  description: null,
  city: { id: 'c1', name: 'Bogotá', department: null, country: 'Colombia' },
  address: null,
  rating_avg: 4.5,
  review_count: 10,
  popularity_score: 1,
  default_cancellation_policy: null,
  images: [{ id: 'i1', url: 'https://example.com/img.jpg', caption: null, display_order: 0 }],
  amenities: [],
  policies: [],
  room_types: [
    {
      id: '60000000-0000-0000-0000-000000000001',
      name: 'Standard King',
      capacity: 2,
      amenities: [],
      rate_plans: [],
      min_price: null,
    },
  ],
};

describe('TripsEmptyState', () => {
  it('renders empty message and link to search', () => {
    render(<TripsEmptyState />);
    expect(screen.getByText('No tienes reservas registradas')).toBeDefined();
    expect(screen.getByRole('link', { name: /buscar hoteles/i }).getAttribute('href')).toBe('/traveler/search');
  });
});

describe('BookingCard', () => {
  it('renders hotel name, dates, status, and view details link', () => {
    render(<BookingCard booking={sampleBooking} property={sampleProperty} />);
    expect(screen.getByText('Test Hotel')).toBeDefined();
    expect(screen.getByText('Confirmed')).toBeDefined();
    expect(screen.getByRole('link', { name: /view details/i }).getAttribute('href')).toBe(
      '/traveler/my-trips/detail/?bookingId=90000000-0000-0000-0000-000000000001'
    );
  });
});

describe('BookingList', () => {
  it('renders a card per booking', () => {
    const propertyById: Record<string, PropertyDetail | null> = {
      '30000000-0000-0000-0000-000000000001': sampleProperty,
    };
    render(<BookingList bookings={[sampleBooking]} propertyById={propertyById} />);
    expect(screen.getByText('Test Hotel')).toBeDefined();
  });
});
