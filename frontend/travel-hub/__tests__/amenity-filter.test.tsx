import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AmenityFilter from '../components/traveler/AmenityFilter';

const AMENITIES = [
  { code: 'wifi', name: 'Wi-Fi' },
  { code: 'pool', name: 'Piscina' },
  { code: 'breakfast', name: 'Desayuno incluido' },
];

describe('AmenityFilter', () => {
  it('renders the title and all amenity options', () => {
    render(<AmenityFilter amenities={AMENITIES} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Amenities')).toBeTruthy();
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    expect(screen.getByText('Piscina')).toBeTruthy();
    expect(screen.getByText('Desayuno incluido')).toBeTruthy();
  });

  it('shows visual check for selected amenities', () => {
    const { container } = render(
      <AmenityFilter amenities={AMENITIES} selected={['wifi', 'pool']} onChange={vi.fn()} />,
    );
    const buttons = container.querySelectorAll('button');
    // wifi and pool buttons should have the blue checkbox
    expect(buttons[0].querySelector('.bg-blue-500')).toBeTruthy();
    expect(buttons[1].querySelector('.bg-blue-500')).toBeTruthy();
    // breakfast should not
    expect(buttons[2].querySelector('.bg-blue-500')).toBeNull();
  });

  it('calls onChange with correct codes when toggled', () => {
    const onChange = vi.fn();
    render(<AmenityFilter amenities={AMENITIES} selected={['wifi']} onChange={onChange} />);
    fireEvent.click(screen.getByText('Piscina'));
    expect(onChange).toHaveBeenCalledWith(['wifi', 'pool']);
    fireEvent.click(screen.getByText('Wi-Fi'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
