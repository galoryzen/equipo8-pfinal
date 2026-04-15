import { usePathname } from 'next/navigation';

import AuthGuard from '@/app/components/AuthGuard';
import * as authApi from '@/app/lib/api/auth';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: vi.fn(),
}));

vi.mock('@/app/lib/api/auth', () => ({
  getMe: vi.fn(),
}));

const mockGetMe = vi.mocked(authApi.getMe);
const mockUsePathname = vi.mocked(usePathname);

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/traveler/search');
  });

  it('shows a loading spinner while checking auth', () => {
    mockGetMe.mockImplementation(() => new Promise(() => {}));
    render(
      <AuthGuard>
        <div>content</div>
      </AuthGuard>
    );
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('does not render children while checking auth', () => {
    mockGetMe.mockImplementation(() => new Promise(() => {}));
    render(
      <AuthGuard>
        <div>protected</div>
      </AuthGuard>
    );
    expect(screen.queryByText('protected')).toBeNull();
  });

  it('redirects to /login/traveler when unauthenticated on a traveler route', async () => {
    mockUsePathname.mockReturnValue('/traveler/search');
    mockGetMe.mockResolvedValue(null);
    render(
      <AuthGuard>
        <div>content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login/traveler');
    });
  });

  it('redirects to /login/manager when unauthenticated on a manager route', async () => {
    mockUsePathname.mockReturnValue('/manager');
    mockGetMe.mockResolvedValue(null);
    render(
      <AuthGuard>
        <div>content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login/manager');
    });
  });

  it('redirects HOTEL-role user away from traveler routes to /manager', async () => {
    mockUsePathname.mockReturnValue('/traveler/search');
    mockGetMe.mockResolvedValue({ id: '1', email: 'h@test.com', role: 'HOTEL' });
    render(
      <AuthGuard>
        <div>content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/manager');
    });
  });

  it('redirects AGENCY-role user away from traveler routes to /manager', async () => {
    mockUsePathname.mockReturnValue('/traveler/search');
    mockGetMe.mockResolvedValue({ id: '1', email: 'a@test.com', role: 'AGENCY' });
    render(
      <AuthGuard>
        <div>content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/manager');
    });
  });

  it('redirects TRAVELER-role user away from manager routes to /traveler/search', async () => {
    mockUsePathname.mockReturnValue('/manager');
    mockGetMe.mockResolvedValue({ id: '1', email: 't@test.com', role: 'TRAVELER' });
    render(
      <AuthGuard>
        <div>content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/traveler/search');
    });
  });

  it('renders children when a TRAVELER visits a traveler route', async () => {
    mockUsePathname.mockReturnValue('/traveler/search');
    mockGetMe.mockResolvedValue({ id: '1', email: 't@test.com', role: 'TRAVELER' });
    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(screen.getByText('protected content')).toBeTruthy();
    });
  });

  it('renders children when a HOTEL-role user visits a manager route', async () => {
    mockUsePathname.mockReturnValue('/manager');
    mockGetMe.mockResolvedValue({ id: '1', email: 'h@test.com', role: 'HOTEL' });
    render(
      <AuthGuard>
        <div>manager content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(screen.getByText('manager content')).toBeTruthy();
    });
  });
});
