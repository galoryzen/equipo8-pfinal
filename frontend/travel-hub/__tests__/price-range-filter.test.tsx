import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PriceRangeFilter from '../components/traveler/PriceRangeFilter';

function getMinInput(container: HTMLElement) {
  return container.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
}

function getMaxInput(container: HTMLElement) {
  return container.querySelectorAll('input[type="number"]')[1] as HTMLInputElement;
}

describe('PriceRangeFilter', () => {
  it('renders the title and subtitle', () => {
    render(<PriceRangeFilter onApply={vi.fn()} />);
    expect(screen.getByText('Price range')).toBeTruthy();
    expect(screen.getByText('Nightly prices before fees and taxes')).toBeTruthy();
  });

  it('renders min and max text fields', () => {
    const { container } = render(<PriceRangeFilter onApply={vi.fn()} />);
    expect(screen.getByText('Min')).toBeTruthy();
    expect(screen.getByText('Max')).toBeTruthy();
    expect(getMinInput(container)).toBeTruthy();
    expect(getMaxInput(container)).toBeTruthy();
  });

  it('calls onApply with price values on blur', () => {
    const onApply = vi.fn();
    const { container } = render(<PriceRangeFilter minPrice={100} maxPrice={500} onApply={onApply} />);

    fireEvent.blur(getMinInput(container));

    expect(onApply).toHaveBeenCalledWith(100, 500);
  });

  it('shows validation error when min > max on blur', () => {
    const onApply = vi.fn();
    const { container } = render(<PriceRangeFilter onApply={onApply} />);

    const minInput = getMinInput(container);
    const maxInput = getMaxInput(container);

    fireEvent.change(minInput, { target: { value: '500' } });
    fireEvent.change(maxInput, { target: { value: '100' } });
    fireEvent.blur(maxInput);

    expect(screen.getByText('Min cannot be greater than max')).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('clears error when input changes after validation error', () => {
    const onApply = vi.fn();
    const { container } = render(<PriceRangeFilter onApply={onApply} />);

    const minInput = getMinInput(container);
    const maxInput = getMaxInput(container);

    fireEvent.change(minInput, { target: { value: '500' } });
    fireEvent.change(maxInput, { target: { value: '100' } });
    fireEvent.blur(maxInput);
    expect(screen.getByText('Min cannot be greater than max')).toBeTruthy();

    fireEvent.change(maxInput, { target: { value: '600' } });
    expect(screen.queryByText('Min cannot be greater than max')).toBeNull();
  });

  it('allows equal min and max price', () => {
    const onApply = vi.fn();
    const { container } = render(<PriceRangeFilter minPrice={200} maxPrice={200} onApply={onApply} />);

    fireEvent.blur(getMinInput(container));

    expect(onApply).toHaveBeenCalledWith(200, 200);
    expect(screen.queryByText('Min cannot be greater than max')).toBeNull();
  });
});
