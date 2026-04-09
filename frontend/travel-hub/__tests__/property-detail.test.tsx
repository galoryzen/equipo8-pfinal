import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PropertyDetailView from '@/components/traveler/PropertyDetailView';
import { CatalogNotFoundError, getPropertyDetail } from '@/app/lib/api/catalog';
import type { PropertyDetailResponse } from '@/app/lib/types/catalog';

// ── Mock next/link ─────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Mock next/navigation ───────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// ── Mock useAuthAction so PriceCard doesn't call getMe() ──────────────────
vi.mock('@/app/lib/hooks/useAuthAction', () => ({
  useAuthAction: () => ({ requireAuth: vi.fn() }),
}));

// ── Mock catalog API (conserva CatalogNotFoundError e isCatalogNotFoundError) ─
vi.mock('@/app/lib/api/catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api/catalog')>();
  return {
    ...actual,
    getPropertyDetail: vi.fn(),
  };
});

const mockGetPropertyDetail = vi.mocked(getPropertyDetail);

// ── Fixtures ───────────────────────────────────────────────────────────────

const PROPERTY_ID = 'aaaa-bbbb-1111';

function makeDetailResponse(overrides: Partial<PropertyDetailResponse['detail']> = {}): PropertyDetailResponse {
  return {
    detail: {
      id: PROPERTY_ID,
      hotel_id: 'hotel-id-1',
      name: 'Grand Hotel Test',
      description: 'A wonderful place to stay in the city center.',
      city: { id: 'city-1', name: 'Mexico City', department: 'CDMX', country: 'Mexico' },
      address: '123 Reforma Ave',
      rating_avg: 4.8,
      review_count: 2400,
      popularity_score: 95,
      default_cancellation_policy: {
        id: 'cp-1',
        name: 'Free cancellation',
        type: 'FULL',
        hours_limit: 24,
        refund_percent: 100,
      },
      images: [
        { id: 'img-1', url: 'https://example.com/lobby.jpg', caption: 'Lobby', display_order: 0 },
        { id: 'img-2', url: 'https://example.com/pool.jpg', caption: 'Pool', display_order: 1 },
      ],
      amenities: [
        { code: 'wifi', name: 'Ultra fast Wi-Fi' },
        { code: 'pool', name: 'Outdoor swimming pool' },
        { code: 'gym', name: 'Fitness center' },
      ],
      policies: [
        { id: 'pol-1', category: 'CHECK_IN', description: 'Check-in from 3pm' },
      ],
      room_types: [
        {
          id: 'rt-1',
          name: 'Deluxe King Room',
          capacity: 2,
          amenities: [{ code: 'wifi', name: 'Wi-Fi' }],
          rate_plans: [
            {
              id: 'rp-1',
              name: 'Standard Rate',
              cancellation_policy: { id: 'cp-1', name: 'Free cancellation', type: 'FULL', hours_limit: 24, refund_percent: 100 },
              min_price: 199,
            },
          ],
          min_price: 199,
        },
      ],
      ...overrides,
    },
    reviews: {
      items: [
        {
          id: 'rev-1',
          user_id: 'user-1',
          rating: 5,
          comment: 'Amazing hotel! The service was impeccable.',
          created_at: '2026-03-15T10:00:00',
        },
        {
          id: 'rev-2',
          user_id: 'user-2',
          rating: 4,
          comment: 'Great location and clean rooms.',
          created_at: '2026-03-10T08:00:00',
        },
      ],
      total: 2,
      page: 1,
      page_size: 4,
      total_pages: 1,
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PropertyDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    mockGetPropertyDetail.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PropertyDetailView id={PROPERTY_ID} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders property name after load', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Grand Hotel Test');
  });

  it('renders rating value after load', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getAllByText('4.8').length).toBeGreaterThan(0);
    });
  });

  it('renders compact review count in header like the design mock', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/\(2\.4k reviews\)/)).toBeTruthy();
    });
  });

  it('does not show a numeric rating when rating_avg is null', async () => {
    mockGetPropertyDetail.mockResolvedValue(
      makeDetailResponse({ rating_avg: null, review_count: 0 })
    );
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getAllByText('No reviews yet').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText('0.0')).toBeNull();
  });

  it('renders the property description', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('A wonderful place to stay in the city center.')).toBeTruthy();
    });
  });

  it('renders amenities', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Ultra fast Wi-Fi')).toBeTruthy();
      expect(screen.getByText('Outdoor swimming pool')).toBeTruthy();
    });
  });

  it('renders available room types', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Deluxe King Room')).toBeTruthy();
    });
  });

  it('renders reviews', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Amazing hotel! The service was impeccable.')).toBeTruthy();
      expect(screen.getByText('Great location and clean rooms.')).toBeTruthy();
    });
  });

  it('renders breadcrumbs with city and country', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      // City name appears in breadcrumb link
      expect(screen.getByText('Mexico City')).toBeTruthy();
      expect(screen.getByText('Mexico')).toBeTruthy();
    });
  });

  it('renders free cancellation chip when policy is FULL', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Free cancellation')).toBeTruthy();
    });
  });

  it('renders price per night in the price card', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getAllByText('$199').length).toBeGreaterThan(0);
    });
  });

  it('shows error message and retry button on non-404 API failure', async () => {
    mockGetPropertyDetail.mockRejectedValue(new Error('Error de red'));
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Error de red')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });

  it('shows shared 404 view when hotel does not exist (API 404)', async () => {
    mockGetPropertyDetail.mockRejectedValue(new CatalogNotFoundError());
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('Alojamiento no encontrado')).toBeTruthy();
    });
    expect(screen.getByRole('link', { name: /buscar alojamientos/i })).toBeTruthy();
  });

  it('passes property id to getPropertyDetail', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse());
    render(<PropertyDetailView id="my-special-id" />);

    await waitFor(() => {
      expect(mockGetPropertyDetail).toHaveBeenCalledWith('my-special-id', expect.objectContaining({}));
    });
  });

  it('renders property with no images gracefully', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse({ images: [] }));
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getByText('No images available')).toBeTruthy();
    });
  });

  it('renders property with no description gracefully', async () => {
    mockGetPropertyDetail.mockResolvedValue(makeDetailResponse({ description: null }));
    render(<PropertyDetailView id={PROPERTY_ID} />);

    await waitFor(() => {
      expect(screen.getAllByText('Grand Hotel Test').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('About this property')).toBeFalsy();
  });
});

// ── PropertyCard link test ──────────────────────────────────────────────────
describe('PropertyCard links to detail page', () => {
  it('wraps card in a link to /traveler/hotel/{id}', async () => {
    const { default: PropertyCard } = await import('@/components/traveler/PropertyCard');

    const property = {
      id: 'prop-123',
      name: 'Test Hotel',
      city: { id: 'c1', name: 'Bogotá', department: 'Cundinamarca', country: 'Colombia' },
      address: 'Calle 100',
      rating_avg: 4.5,
      review_count: 120,
      image: null,
      min_price: 150,
      amenities: [],
    };

    render(<PropertyCard property={property} />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/traveler/hotel?id=prop-123');
  });
});
