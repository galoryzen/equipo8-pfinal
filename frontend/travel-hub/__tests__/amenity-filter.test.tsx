import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AmenityFilter from '../components/traveler/AmenityFilter';
import { renderWithI18n } from '@/__tests__/test-utils';

const AMENITIES = [
  { code: 'wifi', name: 'Wi-Fi' },
  { code: 'pool', name: 'Piscina' },
  { code: 'breakfast', name: 'Desayuno incluido' },
];

describe('AmenityFilter', () => {
  it('renders the title and all amenity options', () => {
    renderWithI18n(<AmenityFilter amenities={AMENITIES} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Amenities')).toBeTruthy();
    expect(screen.getByLabelText('Wi-Fi')).toBeTruthy();
    expect(screen.getByLabelText('Piscina')).toBeTruthy();
    expect(screen.getByLabelText('Desayuno incluido')).toBeTruthy();
  });

  it('checks checkboxes for selected amenities', () => {
    renderWithI18n(<AmenityFilter amenities={AMENITIES} selected={['wifi', 'pool']} onChange={vi.fn()} />);
    expect((screen.getByLabelText('Wi-Fi') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Piscina') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Desayuno incluido') as HTMLInputElement).checked).toBe(false);
  });

  it('calls onChange with correct codes when toggled', () => {
    const onChange = vi.fn();
    renderWithI18n(<AmenityFilter amenities={AMENITIES} selected={['wifi']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Piscina'));
    expect(onChange).toHaveBeenCalledWith(['wifi', 'pool']);
    fireEvent.click(screen.getByLabelText('Wi-Fi'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
