import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RootPage from '@/app/page';
import * as authApi from '@/app/lib/api/auth';
import * as catalogApi from '@/app/lib/api/catalog';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn(),
}));

vi.mock('@/app/lib/api/catalog', () => ({
  getFeaturedProperties: vi.fn(),
  getFeaturedDestinations: vi.fn(),
  searchCities: vi.fn(),
}));

const mockGetMe = vi.mocked(authApi.getMe);
const mockFeatured = vi.mocked(catalogApi.getFeaturedProperties);
const mockDestinations = vi.mocked(catalogApi.getFeaturedDestinations);

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMe.mockResolvedValue(null);
    mockFeatured.mockResolvedValue([]);
    mockDestinations.mockResolvedValue([]);
  });

  it('renders the hero heading', async () => {
    render(<RootPage />);
    expect(screen.getByText('Find your next host')).toBeTruthy();
  });

  it('renders the navbar with TravelHub branding', async () => {
    render(<RootPage />);
    expect(screen.getByText('TravelHub')).toBeTruthy();
  });

  it('shows Log in link when not authenticated', async () => {
    mockGetMe.mockResolvedValue(null);
    render(<RootPage />);
    await waitFor(() => {
      expect(screen.getByText('Log in')).toBeTruthy();
    });
  });

  it('shows username when authenticated', async () => {
    mockGetMe.mockResolvedValue({ id: '1', email: 'john@test.com', role: 'TRAVELER' });
    render(<RootPage />);
    await waitFor(() => {
      expect(screen.getByText('john')).toBeTruthy();
    });
  });

  it('renders the Popular Destinations section', () => {
    render(<RootPage />);
    expect(screen.getByText('Popular Destinations')).toBeTruthy();
  });

  it('renders the Recommended for You section', () => {
    render(<RootPage />);
    expect(screen.getByText('Recommended for You')).toBeTruthy();
  });

  it('renders the newsletter section', () => {
    render(<RootPage />);
    expect(screen.getByText('Plan your dream getaway today')).toBeTruthy();
  });

  it('renders the search destination input', () => {
    render(<RootPage />);
    expect(screen.getByPlaceholderText('Search destination')).toBeTruthy();
  });
});