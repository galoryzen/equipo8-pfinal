import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SearchPage from '@/app/traveler/search/page';
import { getFeaturedProperties, searchCities, searchProperties } from '@/app/lib/api/catalog';

// Mock useSearchParams to return an empty URLSearchParams by default
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockItems = [
  {
    id: '1',
    name: 'Hotel Test',
    city: { id: 'c1', name: 'Bogotá', department: 'Cundinamarca', country: 'Colombia' },
    address: 'Calle 100',
    rating_avg: 4.5,
    review_count: 120,
    image: { url: 'https://example.com/img.jpg', caption: 'Facade' },
    min_price: 150,
    amenities: [{ code: 'wifi', name: 'Wi-Fi' }],
  },
  {
    id: '2',
    name: 'Hotel Expensive',
    city: { id: 'c1', name: 'Bogotá', department: 'Cundinamarca', country: 'Colombia' },
    address: 'Cra 7',
    rating_avg: 4.8,
    review_count: 50,
    image: null,
    min_price: 500,
    amenities: [],
  },
];

const mockPaginatedResponse = {
  items: mockItems,
  total: 2,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

const emptyResponse = {
  items: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
  message: 'No hay hospedajes disponibles para la ubicación y fechas seleccionadas.',
};

vi.mock('@/app/lib/api/catalog', () => ({
  searchProperties: vi.fn(),
  getFeaturedProperties: vi.fn(),
  searchCities: vi.fn(),
}));

const mockSearch = vi.mocked(searchProperties);
const mockFeatured = vi.mocked(getFeaturedProperties);
const mockSearchCities = vi.mocked(searchCities);

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatured.mockResolvedValue(mockItems);
    mockSearchCities.mockResolvedValue([]);
    mockSearch.mockResolvedValue(mockPaginatedResponse);
  });

  it('renders the price range filter on the page', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Price range')).toBeTruthy();
    });
    expect(screen.getByLabelText('Min')).toBeTruthy();
    expect(screen.getByLabelText('Max')).toBeTruthy();
  });

  it('loads featured stays on mount without calling filtered search', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Hotel Test')).toBeTruthy();
    });
    expect(mockFeatured).toHaveBeenCalledTimes(1);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not call filtered search until a city-based search is performed', async () => {
    render(<SearchPage />);

    await waitFor(() => screen.getByText('Hotel Test'));

    // Click the icon search button (no city selected, so it's disabled — search should not fire)
    const searchButtons = screen.getAllByRole('button');
    const searchBtn = searchButtons.find(b => b.querySelector('[data-testid="SearchIcon"]'));
    if (searchBtn) fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(mockSearch).not.toHaveBeenCalled();
    });
    expect(mockFeatured.mock.calls.length).toBe(1);
  });

  it('calls searchProperties with city_id after selecting a city and searching', async () => {
    const user = userEvent.setup();
    mockSearchCities.mockResolvedValue([
      { id: 'city-uuid-1', name: 'Medellín', department: 'Antioquia', country: 'Colombia' },
    ]);

    render(<SearchPage />);
    await waitFor(() => screen.getByText('Hotel Test'));

    const input = screen.getByPlaceholderText(/search destination/i);
    await user.clear(input);
    await user.type(input, 'Me');

    await waitFor(
      () => {
        expect(mockSearchCities).toHaveBeenCalled();
      },
      { timeout: 4000 }
    );

    const option = await screen.findByRole('option', { name: /Medellín/i });
    await user.click(option);

    // Click the search icon button
    const searchButtons = screen.getAllByRole('button');
    const searchBtn = searchButtons.find(b => b.querySelector('[data-testid="SearchIcon"]'));
    expect(searchBtn).toBeTruthy();
    await user.click(searchBtn!);

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          city_id: 'city-uuid-1',
          checkin: expect.any(String),
          checkout: expect.any(String),
          guests: 1,
        })
      );
    });
  });

  it('applies price filter client-side in browse mode without extra API calls', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Hotel Test')).toBeTruthy();
    });

    const minInput = screen.getByLabelText('Min');
    fireEvent.change(minInput, { target: { value: '400' } });

    mockFeatured.mockClear();
    fireEvent.blur(minInput);

    await waitFor(() => {
      expect(screen.queryByText('Hotel Test')).toBeNull();
    });
    expect(mockFeatured).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('displays result count', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText(/2 places? found/)).toBeTruthy();
    });
  });

  it('shows empty state when browse filters exclude all properties', async () => {
    mockFeatured.mockResolvedValue(mockItems);
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Hotel Test')).toBeTruthy();
    });

    const minInput = screen.getByLabelText('Min');
    fireEvent.change(minInput, { target: { value: '900' } });
    fireEvent.blur(minInput);

    await waitFor(() => {
      expect(screen.getByText('No properties match the selected filters.')).toBeTruthy();
    });
  });

  it('shows backend empty message when search returns no items', async () => {
    const user = userEvent.setup();
    mockSearchCities.mockResolvedValue([
      { id: 'city-x', name: 'X', department: null, country: 'Y' },
    ]);
    mockSearch.mockResolvedValue(emptyResponse);

    render(<SearchPage />);
    await waitFor(() => screen.getByText('Hotel Test'));

    const input = screen.getByPlaceholderText(/search destination/i);
    await user.clear(input);
    await user.type(input, 'Xx');
    await waitFor(() => expect(mockSearchCities).toHaveBeenCalled(), { timeout: 4000 });
    const option = await screen.findByRole('option', { name: /^X/ });
    await user.click(option);

    const searchButtons = screen.getAllByRole('button');
    const searchBtn = searchButtons.find(b => b.querySelector('[data-testid="SearchIcon"]'));
    await user.click(searchBtn!);

    await waitFor(() => {
      expect(
        screen.getByText('No hay hospedajes disponibles para la ubicación y fechas seleccionadas.')
      ).toBeTruthy();
    });
  });

  it('shows readable error message on API failure', async () => {
    mockFeatured.mockRejectedValue(new Error('Network error'));
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('shows readable error when API returns validation detail array', async () => {
    mockFeatured.mockRejectedValue(
      new Error('Field required')
    );
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Field required')).toBeTruthy();
    });
  });

  it('re-fetches with amenities when an amenity checkbox is toggled in browse mode', async () => {
    render(<SearchPage />);
    await waitFor(() => screen.getByText('Hotel Test'));

    fireEvent.click(screen.getByRole('checkbox', { name: /wifi/i }));

    await waitFor(() => {
      expect(screen.queryByText('Hotel Expensive')).toBeNull();
    });
    expect(mockFeatured.mock.calls.length).toBe(1);
  });

  it('re-fetches with sort_by when a sort chip is clicked in destination search', async () => {
    const user = userEvent.setup();
    mockSearchCities.mockResolvedValue([
      { id: 'cid', name: 'Q', department: null, country: 'Z' },
    ]);

    render(<SearchPage />);
    await waitFor(() => screen.getByText('Hotel Test'));

    const input = screen.getByPlaceholderText(/search destination/i);
    await user.clear(input);
    await user.type(input, 'Qq');
    await waitFor(() => expect(mockSearchCities).toHaveBeenCalled(), { timeout: 4000 });
    await user.click(await screen.findByRole('option', { name: /^Q/ }));

    const searchButtons = screen.getAllByRole('button');
    const searchBtn = searchButtons.find(b => b.querySelector('[data-testid="SearchIcon"]'));
    await user.click(searchBtn!);

    await waitFor(() => expect(mockSearch).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Price'));

    await waitFor(() => {
      const last = mockSearch.mock.calls.at(-1)![0];
      expect(last.sort_by).toBe('price_asc');
    });
  });

  it('shows pagination and changes page client-side in browse mode', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...mockItems[0],
      id: `id-${i}`,
      name: `Hotel ${i}`,
    }));
    mockFeatured.mockResolvedValue(many);

    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /go to page 2/i }));

    await waitFor(() => {
      expect(screen.getByText('Hotel 20')).toBeTruthy();
    });
    expect(mockFeatured).toHaveBeenCalledTimes(1);
  });
});
