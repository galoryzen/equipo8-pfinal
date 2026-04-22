import TravelerHomePage from '@/app/traveler/(protected)/page';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('TravelerHomePage', () => {
  it('renders the traveler home heading', () => {
    render(<TravelerHomePage />);
    expect(screen.getByRole('heading', { name: 'Traveler Home' })).toBeTruthy();
  });
});
