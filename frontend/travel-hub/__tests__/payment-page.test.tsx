import * as bookingApi from '@/app/lib/api/booking';
import type { CartBooking } from '@/app/lib/types/booking';
import TravelerPaymentPage from '@/app/traveler/(protected)/payment/page';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => {
      const params: Record<string, string> = {
        property_id: 'p1',
        room_type_id: 'r1',
        rate_plan_id: 'rp1',
        checkin: '2026-06-01',
        checkout: '2026-06-04',
        guests: '2',
        unit_price: '100.00',
        currency: 'USD',
        property_name: 'Test Hotel',
        room_name: 'Deluxe Suite',
        image_url: '',
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${key}(${opts.count})`;
      if (opts?.currency) return `${key}(${opts.currency})`;
      if (opts?.amount) return `${key}(${opts.amount})`;
      if (opts?.date) return `${key}(${opts.date})`;
      return key;
    },
  }),
}));

vi.mock('@/app/lib/api/booking', () => ({
  CartConflictError: class CartConflictError extends Error {
    existingBookingId: string;
    constructor(existingBookingId: string) {
      super('Cart conflict');
      this.existingBookingId = existingBookingId;
    }
  },
  cancelCartBooking: vi.fn(),
  createCartBooking: vi.fn(),
  getBookingDetail: vi.fn(),
}));

const mockCancel = vi.mocked(bookingApi.cancelCartBooking);
const mockCreate = vi.mocked(bookingApi.createCartBooking);
const mockDetail = vi.mocked(bookingApi.getBookingDetail);

const CART: CartBooking = {
  id: 'booking-abc',
  status: 'CART',
  checkin: '2026-06-01',
  checkout: '2026-06-04',
  hold_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  total_amount: '335.00',
  original_total_amount: null,
  discount_percent: null,
  currency_code: 'USD',
  property_id: 'p1',
  room_type_id: 'r1',
  rate_plan_id: 'rp1',
  unit_price: '100.00',
  original_unit_price: null,
  nights_breakdown: [
    { day: '2026-06-01', price: '100.00', original_price: null },
    { day: '2026-06-02', price: '150.00', original_price: null },
    { day: '2026-06-03', price: '85.00', original_price: null },
  ],
  taxes: '33.50',
  service_fee: '16.75',
  grand_total: '385.25',
  original_taxes: null,
  original_service_fee: null,
  original_grand_total: null,
};

describe('TravelerPaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCancel.mockReset();
    mockDetail.mockReset();
  });

  it('shows a loading spinner on mount', () => {
    mockCreate.mockImplementation(() => new Promise(() => {}));
    render(<TravelerPaymentPage />);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy();
  });

  it('shows the review and pay form after booking is created', async () => {
    mockCreate.mockResolvedValue(CART);
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('payment.pageTitle')).toBeTruthy();
    });
  });

  it('shows guest details and payment method sections', async () => {
    mockCreate.mockResolvedValue(CART);
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment\.guestDetails/)).toBeTruthy();
      expect(screen.getByText(/payment\.paymentMethod/)).toBeTruthy();
    });
  });

  it('shows the booking summary section', async () => {
    mockCreate.mockResolvedValue(CART);
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('payment.bookingSummary')).toBeTruthy();
    });
  });

  it('shows countdown banner when booking is active', async () => {
    mockCreate.mockResolvedValue(CART);
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText(/payment\.countdownBannerAfter/)).toBeTruthy();
    });
  });

  it('shows error and back-to-search button when booking creation fails', async () => {
    mockCreate.mockRejectedValue(new Error('Room unavailable'));
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('Room unavailable')).toBeTruthy();
      expect(screen.getByText('payment.backToSearch')).toBeTruthy();
    });
  });

  it('replaces existing cart and continues when create returns conflict', async () => {
    const ConflictError = bookingApi.CartConflictError as unknown as new (
      existingBookingId: string
    ) => Error;
    const conflictError = new ConflictError('existing-cart-1');
    mockCreate.mockRejectedValueOnce(conflictError).mockResolvedValueOnce(CART);
    mockCancel.mockResolvedValue({
      id: 'existing-cart-1',
      status: 'CANCELLED',
      checkin: '2026-05-01',
      checkout: '2026-05-02',
      hold_expires_at: null,
      total_amount: '0',
      currency_code: 'USD',
      property_id: 'p-old',
      room_type_id: 'r-old',
      rate_plan_id: 'rp-old',
      unit_price: '0',
      policy_type_applied: 'STANDARD',
      policy_hours_limit_applied: 24,
      policy_refund_percent_applied: 100,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });

    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('payment.pageTitle')).toBeTruthy();
    });

    expect(mockCancel).toHaveBeenCalledWith('existing-cart-1');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('stores booking id in localStorage after creation', async () => {
    mockCreate.mockResolvedValue(CART);
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('payment.pageTitle')).toBeTruthy();
    });

    const stored = localStorage.getItem('travelhub_cart_p1_r1_2026-06-01_2026-06-04');
    expect(stored).toBe('booking-abc');
  });

  it('shows the expired overlay when hold_expires_at is in the past', async () => {
    const expiredCart: CartBooking = {
      ...CART,
      hold_expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    mockCreate.mockResolvedValue(expiredCart);
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('payment.expiredTitle')).toBeTruthy();
    });
  });

  it('shows property name in the booking summary', async () => {
    mockCreate.mockResolvedValue(CART);
    render(<TravelerPaymentPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Hotel').length).toBeGreaterThan(0);
    });
  });
});
