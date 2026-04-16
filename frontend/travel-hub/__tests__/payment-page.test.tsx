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
  createCartBooking: vi.fn(),
  getBookingDetail: vi.fn(),
}));

const mockCreate = vi.mocked(bookingApi.createCartBooking);
const mockDetail = vi.mocked(bookingApi.getBookingDetail);

const CART: CartBooking = {
  id: 'booking-abc',
  status: 'CART',
  checkin: '2026-06-01',
  checkout: '2026-06-04',
  hold_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  total_amount: '335.00',
  currency_code: 'USD',
  items: [],
};

describe('TravelerPaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
      expect(screen.getByText('Test Hotel')).toBeTruthy();
    });
  });
});
