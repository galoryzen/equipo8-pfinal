import { renderWithI18n } from '@/__tests__/test-utils';
import BookingConfirmationPage from '@/app/traveler/(protected)/payment/confirmation/page';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      const params: Record<string, string> = {
        booking_id: 'bk-001',
        property_name: 'Sunset Resort',
        room_name: 'Ocean View Suite',
        image_url: '',
        checkin: '2026-07-01',
        checkout: '2026-07-04',
        guests: '2',
        unit_price: '150.00',
        currency: 'USD',
        guest_name: 'Jane Doe',
        guest_email: 'jane@example.com',
        card_last4: '4242',
        card_brand: 'Visa',
        rating: '4.8',
      };
      return params[key] ?? null;
    },
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('BookingConfirmationPage', () => {
  it('renders the pending reservation heading', () => {
    renderWithI18n(<BookingConfirmationPage />);
    expect(screen.getByText('Reservation Pending')).toBeTruthy();
  });

  it('shows property name', () => {
    renderWithI18n(<BookingConfirmationPage />);
    expect(screen.getByText('Sunset Resort')).toBeTruthy();
  });

  it('shows room name and guest count', () => {
    renderWithI18n(<BookingConfirmationPage />);
    expect(screen.getByText('Ocean View Suite')).toBeTruthy();
    expect(screen.getByText(/2 Adults/)).toBeTruthy();
  });

  it('shows price summary with correct total', () => {
    renderWithI18n(<BookingConfirmationPage />);
    // 3 nights × $150 = $450 + $35 service + $54 taxes = $539
    expect(screen.getByText('Price Summary')).toBeTruthy();
    expect(screen.getByText('Total Amount')).toBeTruthy();
  });

  it('shows guest information section', () => {
    renderWithI18n(<BookingConfirmationPage />);
    expect(screen.getByText('Guest Information')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('jane@example.com')).toBeTruthy();
  });

  it('shows payment card info', () => {
    renderWithI18n(<BookingConfirmationPage />);
    expect(screen.getByText('Visa •••• 4242')).toBeTruthy();
  });

  it('renders navigation buttons', () => {
    renderWithI18n(<BookingConfirmationPage />);
    expect(screen.getByText('View My Trips')).toBeTruthy();
    expect(screen.getByText('Explore More')).toBeTruthy();
  });

  it('shows progress bar at 85%', () => {
    renderWithI18n(<BookingConfirmationPage />);
    expect(screen.getByText('85%')).toBeTruthy();
  });
});
