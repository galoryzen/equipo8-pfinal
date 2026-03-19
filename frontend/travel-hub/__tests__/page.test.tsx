import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Page from '../app/page';

describe('Page', () => {
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
});