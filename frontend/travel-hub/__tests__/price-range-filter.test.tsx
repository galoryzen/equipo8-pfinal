import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PriceRangeFilter from '../components/traveler/PriceRangeFilter';

describe('PriceRangeFilter', () => {
  it('renders the title and subtitle', () => {
    render(<PriceRangeFilter onApply={vi.fn()} />);
    expect(screen.getByText('Price range')).toBeTruthy();
    expect(screen.getByText('Nightly prices before fees and taxes')).toBeTruthy();
  });

  it('renders min and max text fields', () => {
    render(<PriceRangeFilter onApply={vi.fn()} />);
    expect(screen.getByLabelText('Min')).toBeTruthy();
    expect(screen.getByLabelText('Max')).toBeTruthy();
  });

  it('calls onApply with price values on blur', () => {
    const onApply = vi.fn();
    render(<PriceRangeFilter minPrice={100} maxPrice={500} onApply={onApply} />);

    fireEvent.blur(screen.getByLabelText('Min'));

    expect(onApply).toHaveBeenCalledWith(100, 500);
  });

  it('shows validation error when min > max on blur', () => {
    const onApply = vi.fn();
    render(<PriceRangeFilter onApply={onApply} />);

    const minInput = screen.getByLabelText('Min');
    const maxInput = screen.getByLabelText('Max');

    fireEvent.change(minInput, { target: { value: '500' } });
    fireEvent.change(maxInput, { target: { value: '100' } });
    fireEvent.blur(maxInput);

    expect(screen.getByText('Min cannot be greater than max')).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('clears error when input changes after validation error', () => {
    const onApply = vi.fn();
    render(<PriceRangeFilter onApply={onApply} />);

    const minInput = screen.getByLabelText('Min');
    const maxInput = screen.getByLabelText('Max');

    fireEvent.change(minInput, { target: { value: '500' } });
    fireEvent.change(maxInput, { target: { value: '100' } });
    fireEvent.blur(maxInput);
    expect(screen.getByText('Min cannot be greater than max')).toBeTruthy();

    fireEvent.change(maxInput, { target: { value: '600' } });
    expect(screen.queryByText('Min cannot be greater than max')).toBeNull();
  });

  it('allows equal min and max price', () => {
    const onApply = vi.fn();
    render(<PriceRangeFilter minPrice={200} maxPrice={200} onApply={onApply} />);

    fireEvent.blur(screen.getByLabelText('Min'));

    expect(onApply).toHaveBeenCalledWith(200, 200);
    expect(screen.queryByText('Min cannot be greater than max')).toBeNull();
  });
});