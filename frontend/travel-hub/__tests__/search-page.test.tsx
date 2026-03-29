import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SearchPage from '@/app/traveler/search/page';
import { searchProperties } from '@/app/lib/api/catalog';

const mockPaginatedResponse = {
  items: [
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
  ],
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
};

vi.mock('@/app/lib/api/catalog', () => ({
  searchProperties: vi.fn(),
}));

const mockSearch = vi.mocked(searchProperties);

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('loads search results on mount', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Hotel Test')).toBeTruthy();
    });
    expect(screen.getByText('Hotel Expensive')).toBeTruthy();
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches results when price filter is applied via blur', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Hotel Test')).toBeTruthy();
    });

    const minInput = screen.getByLabelText('Min');
    fireEvent.change(minInput, { target: { value: '200' } });

    mockSearch.mockResolvedValue(emptyResponse);
    fireEvent.blur(minInput);

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });

    const lastCall = mockSearch.mock.calls[1][0];
    expect(lastCall.min_price).toBe(200);
  });

  it('displays result count', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText(/2 places? found/)).toBeTruthy();
    });
  });

  it('shows empty state when no results', async () => {
    mockSearch.mockResolvedValue(emptyResponse);
    render(<SearchPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No properties found for the selected filters.'),
      ).toBeTruthy();
    });
  });

  it('shows error message on API failure', async () => {
    mockSearch.mockRejectedValue(new Error('Network error'));
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('updates the heading when the search button is clicked with a city', async () => {
    render(<SearchPage />);
    await waitFor(() => screen.getByText('Hotel Test'));

    fireEvent.change(screen.getByPlaceholderText(/search destination/i), {
      target: { value: 'Paris' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText(/Stays in Paris/i)).toBeTruthy();
    });
  });

  it('re-fetches with amenities when an amenity checkbox is toggled', async () => {
    render(<SearchPage />);
    await waitFor(() => screen.getByText('Hotel Test'));

    fireEvent.click(screen.getByRole('checkbox', { name: /wifi/i }));

    await waitFor(() => {
      const lastCall = mockSearch.mock.calls.at(-1)![0];
      expect(lastCall.amenities).toContain('wifi');
    });
  });

  it('re-fetches with sort_by when a sort chip is clicked', async () => {
    render(<SearchPage />);
    await waitFor(() => screen.getByText('Hotel Test'));

    fireEvent.click(screen.getByText('Price'));

    await waitFor(() => {
      const lastCall = mockSearch.mock.calls.at(-1)![0];
      expect(lastCall.sort_by).toBe('price_asc');
    });
  });

  it('shows pagination and re-fetches when a page is selected', async () => {
    const multiPageResponse = {
      ...mockPaginatedResponse,
      total: 40,
      page: 1,
      total_pages: 3,
    };
    mockSearch.mockResolvedValue(multiPageResponse);
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /go to page 2/i }));

    await waitFor(() => {
      const lastCall = mockSearch.mock.calls.at(-1)![0];
      expect(lastCall.page).toBe(2);
    });
  });
});
