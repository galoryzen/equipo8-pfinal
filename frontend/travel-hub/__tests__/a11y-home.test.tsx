import { renderWithI18n } from '@/__tests__/test-utils';
import * as authApi from '@/app/lib/api/auth';
import * as catalogApi from '@/app/lib/api/catalog';
import RootPage from '@/app/page';
import { screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('Accessibility (axe) - home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMe.mockResolvedValue(null);
    mockFeatured.mockResolvedValue([]);
    mockDestinations.mockResolvedValue([]);
  });

  it('has no detectable accessibility violations on the logged-out home page', async () => {
    const { container } = renderWithI18n(<RootPage />);
    await waitFor(() => {
      expect(screen.getByText('TravelHub')).toBeTruthy();
    });
    const axeResults = await axe(container);
    expect(axeResults.violations).toEqual([]);
  }, 15000);
});
