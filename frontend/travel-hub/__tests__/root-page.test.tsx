import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RootPage from '@/app/page';
import * as authApi from '@/app/lib/api/auth';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn(),
}));

const mockGetMe = vi.mocked(authApi.getMe);

describe('Root page redirect logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner while checking auth', () => {
    mockGetMe.mockImplementation(() => new Promise(() => {}));
    render(<RootPage />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('redirects to /login/traveler when not authenticated', async () => {
    mockGetMe.mockResolvedValue(null);
    render(<RootPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login/traveler');
    });
  });

  it('redirects to /manager when user has HOTEL role', async () => {
    mockGetMe.mockResolvedValue({ id: '1', email: 'h@test.com', role: 'HOTEL' });
    render(<RootPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/manager');
    });
  });

  it('redirects to /manager when user has AGENCY role', async () => {
    mockGetMe.mockResolvedValue({ id: '1', email: 'a@test.com', role: 'AGENCY' });
    render(<RootPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/manager');
    });
  });

  it('redirects to /manager when user has ADMIN role', async () => {
    mockGetMe.mockResolvedValue({ id: '1', email: 'ad@test.com', role: 'ADMIN' });
    render(<RootPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/manager');
    });
  });

  it('redirects to /traveler/search for any other role (TRAVELER)', async () => {
    mockGetMe.mockResolvedValue({ id: '1', email: 't@test.com', role: 'TRAVELER' });
    render(<RootPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/traveler/search');
    });
  });
});
