import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Page from '../app/page';

describe('Page', () => {
  it('should render the page', () => {
    render(<Page />);
    expect(screen.getByText(/TravelHub — Landing/i)).toBeTruthy();
  });

  it('should render the test random word', () => {
    render(<Page />);
    expect(screen.getByText(/Random word to make sure the test is working/i)).toBeTruthy();
  });
});
