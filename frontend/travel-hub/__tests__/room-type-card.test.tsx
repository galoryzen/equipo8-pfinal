import type { RoomTypeOut } from '@/app/lib/types/catalog';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SelectedRoomInfo } from '@/components/traveler/PropertyDetailView';
import RoomTypeCard from '@/components/traveler/RoomTypeCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const ROOM: RoomTypeOut = {
  id: 'room-1',
  name: 'Deluxe Suite',
  capacity: 2,
  amenities: [],
  min_price: 100,
  rate_plans: [
    {
      id: 'rp-1',
      name: 'Standard Rate',
      min_price: 100,
      cancellation_policy: { type: 'FULL', hours_limit: 48, refund_percent: 100 },
    },
  ],
};

const DEFAULT_PROPS = {
  room: ROOM,
  checkin: '2026-06-01',
  checkout: '2026-06-04',
  selectedRatePlanId: null,
  onRoomSelect: vi.fn(),
  isHeld: false,
  activeCartBookingId: null,
};

describe('RoomTypeCard', () => {
  describe('normal state', () => {
    it('renders room name', () => {
      render(<RoomTypeCard {...DEFAULT_PROPS} />);
      expect(screen.getByText('Deluxe Suite')).toBeTruthy();
    });

    it('shows Select Room button when dates are provided', () => {
      render(<RoomTypeCard {...DEFAULT_PROPS} />);
      expect(screen.getByText('roomCard.selectRoom')).toBeTruthy();
    });

    it('shows Selected button when rate plan is already selected', () => {
      render(<RoomTypeCard {...DEFAULT_PROPS} selectedRatePlanId="rp-1" />);
      expect(screen.getByText('roomCard.selected')).toBeTruthy();
    });

    it('disables Select Room button when no dates provided', () => {
      render(<RoomTypeCard {...DEFAULT_PROPS} checkin={undefined} checkout={undefined} />);
      const btn = screen.getByRole('button', { name: 'roomCard.selectRoom' });
      expect(btn.hasAttribute('disabled')).toBe(true);
    });

    it('calls onRoomSelect with correct info when clicked', async () => {
      const onRoomSelect = vi.fn();
      render(<RoomTypeCard {...DEFAULT_PROPS} onRoomSelect={onRoomSelect} />);

      await userEvent.click(screen.getByText('roomCard.selectRoom'));

      expect(onRoomSelect).toHaveBeenCalledWith({
        roomTypeId: ROOM.id,
        ratePlanId: 'rp-1',
        unitPrice: 100,
        roomName: ROOM.name,
      } satisfies SelectedRoomInfo);
    });

    it('shows cancellation policy label', () => {
      render(<RoomTypeCard {...DEFAULT_PROPS} />);
      expect(screen.getByText('roomCard.cancellation.free')).toBeTruthy();
    });
  });

  describe('held by another user', () => {
    const heldProps = { ...DEFAULT_PROPS, isHeld: true };

    it('shows Unavailable chip', () => {
      render(<RoomTypeCard {...heldProps} />);
      expect(screen.getByText('roomCard.unavailable')).toBeTruthy();
    });

    it('shows held alert message', () => {
      render(<RoomTypeCard {...heldProps} />);
      expect(screen.getByText('roomCard.heldAlert')).toBeTruthy();
    });

    it('does not show Select Room button', () => {
      render(<RoomTypeCard {...heldProps} />);
      expect(screen.queryByText('roomCard.selectRoom')).toBeNull();
    });
  });

  describe('own active CART booking', () => {
    const ownCartProps = { ...DEFAULT_PROPS, activeCartBookingId: 'booking-123' };

    it('shows Booking in progress chip', () => {
      render(<RoomTypeCard {...ownCartProps} />);
      expect(screen.getByText('roomCard.bookingInProgress')).toBeTruthy();
    });

    it('shows own hold message', () => {
      render(<RoomTypeCard {...ownCartProps} />);
      expect(screen.getByText('roomCard.ownHoldText')).toBeTruthy();
    });

    it('shows Resume booking link', () => {
      render(<RoomTypeCard {...ownCartProps} />);
      expect(screen.getByText('roomCard.resumeBooking')).toBeTruthy();
    });

    it('Resume link points to payment page with booking_id', () => {
      render(<RoomTypeCard {...ownCartProps} />);
      const link = screen.getByRole('link', { name: 'roomCard.resumeBooking' });
      expect(link.getAttribute('href')).toContain('booking_id=booking-123');
      expect(link.getAttribute('href')).toContain('/traveler/payment');
    });

    it('does not show Select Room button', () => {
      render(<RoomTypeCard {...ownCartProps} />);
      expect(screen.queryByText('roomCard.selectRoom')).toBeNull();
    });
  });
});
