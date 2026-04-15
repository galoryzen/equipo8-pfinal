import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Page from '../app/status/page';

describe('Page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the status heading', () => {
    render(<Page />);
    expect(screen.getByText(/TravelHub — Status/i)).toBeTruthy();
  });

  it('should render all service names', () => {
    render(<Page />);
    expect(screen.getByText('Auth')).toBeTruthy();
    expect(screen.getByText('Catalog')).toBeTruthy();
    expect(screen.getByText('Booking')).toBeTruthy();
    expect(screen.getByText('Payment')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows OK status after a successful health check response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({ status: 'ok' }),
    } as Response);

    render(<Page />);

    await waitFor(() => {
      expect(screen.getAllByText('OK').length).toBeGreaterThan(0);
    });
  });

  it('shows ERROR status when a health check request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

    render(<Page />);

    await waitFor(() => {
      expect(screen.getAllByText('ERROR').length).toBeGreaterThan(0);
    });
  });
});
