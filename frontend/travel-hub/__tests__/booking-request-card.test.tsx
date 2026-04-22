import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BookingRequestCard } from '@/components/manager/BookingRequestCard';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const BASE_BOOKING = {
  id: 'booking-1',
  propertyName: 'Ocean View Suite',
  imageUrl: 'https://example.com/ocean.jpg',
  status: 'PENDING_CONFIRMATION',
  guestName: 'Jane Doe',
  checkin: '2026-06-01',
  checkout: '2026-06-05',
  nights: 4,
  guests: 2,
  totalAmount: 800,
  currency: 'USD',
  createdAt: '2 hours ago',
};

describe('BookingRequestCard', () => {
  it('renders property name, guest info and dates', () => {
    render(<BookingRequestCard booking={BASE_BOOKING} onConfirm={vi.fn()} onDecline={vi.fn()} />);

    expect(screen.getByText(/Ocean View Suite/i)).toBeTruthy();
    expect(screen.getByText(/Jane Doe/i)).toBeTruthy();
    expect(screen.getByText(/2026-06-01/)).toBeTruthy();
    expect(screen.getByText(/2026-06-05/)).toBeTruthy();
    expect(screen.getByText('2 hours ago')).toBeTruthy();
  });

  it('renders the property image with correct src and alt', () => {
    render(<BookingRequestCard booking={BASE_BOOKING} onConfirm={vi.fn()} onDecline={vi.fn()} />);

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/ocean.jpg');
    expect(img.getAttribute('alt')).toBe('Ocean View Suite');
  });

  it('renders total amount formatted with toLocaleString', () => {
    render(<BookingRequestCard booking={BASE_BOOKING} onConfirm={vi.fn()} onDecline={vi.fn()} />);

    expect(screen.getByText(/USD/)).toBeTruthy();
    expect(screen.getByText(/800/)).toBeTruthy();
  });

  describe('when status is PENDING_CONFIRMATION', () => {
    it('shows the i18n pending label instead of raw status', () => {
      render(<BookingRequestCard booking={BASE_BOOKING} onConfirm={vi.fn()} onDecline={vi.fn()} />);

      expect(screen.getByText('manager.pendingConfirmation')).toBeTruthy();
      expect(screen.queryByText('PENDING_CONFIRMATION')).toBeFalsy();
    });

    it('renders a confirm button', () => {
      render(<BookingRequestCard booking={BASE_BOOKING} onConfirm={vi.fn()} onDecline={vi.fn()} />);

      expect(screen.getByText('manager.confirmBooking')).toBeTruthy();
    });

    it('calls onConfirm with the booking id when confirm is clicked', async () => {
      const onConfirm = vi.fn();
      render(
        <BookingRequestCard booking={BASE_BOOKING} onConfirm={onConfirm} onDecline={vi.fn()} />
      );

      await userEvent.click(screen.getByText('manager.confirmBooking'));

      expect(onConfirm).toHaveBeenCalledOnce();
      expect(onConfirm).toHaveBeenCalledWith('booking-1');
    });
  });

  describe('when status is not PENDING_CONFIRMATION', () => {
    const confirmedBooking = { ...BASE_BOOKING, status: 'CONFIRMED' };

    it('shows the raw status text', () => {
      render(
        <BookingRequestCard booking={confirmedBooking} onConfirm={vi.fn()} onDecline={vi.fn()} />
      );

      expect(screen.getByText('CONFIRMED')).toBeTruthy();
      expect(screen.queryByText('manager.pendingConfirmation')).toBeFalsy();
    });

    it('does not render the confirm button', () => {
      render(
        <BookingRequestCard booking={confirmedBooking} onConfirm={vi.fn()} onDecline={vi.fn()} />
      );

      expect(screen.queryByText('manager.confirmBooking')).toBeFalsy();
    });
  });

  it('calls onDecline with the booking id when decline is clicked', async () => {
    const onDecline = vi.fn();
    render(<BookingRequestCard booking={BASE_BOOKING} onConfirm={vi.fn()} onDecline={onDecline} />);

    await userEvent.click(screen.getByText('manager.decline'));

    expect(onDecline).toHaveBeenCalledOnce();
    expect(onDecline).toHaveBeenCalledWith('booking-1');
  });

  it('always renders the decline button regardless of status', () => {
    const { rerender } = render(
      <BookingRequestCard booking={BASE_BOOKING} onConfirm={vi.fn()} onDecline={vi.fn()} />
    );
    expect(screen.getByText('manager.decline')).toBeTruthy();

    rerender(
      <BookingRequestCard
        booking={{ ...BASE_BOOKING, status: 'CONFIRMED' }}
        onConfirm={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText('manager.decline')).toBeTruthy();
  });
});
