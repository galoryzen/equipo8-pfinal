import { renderWithI18n } from '@/__tests__/test-utils';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PropertyCard from '@/components/traveler/PropertyCard';

const baseProperty = {
  id: 'p-1',
  name: 'Test Hotel',
  city: { id: 'c1', name: 'Cancún', department: null, country: 'México' },
  address: 'Km 5',
  rating_avg: 4.2,
  review_count: 10,
  image: null,
  min_price: 99,
  amenities: [] as { code: string; name: string }[],
};

describe('PropertyCard', () => {
  it('does not break when distance_to_poi_km is null', () => {
    renderWithI18n(<PropertyCard property={{ ...baseProperty, distance_to_poi_km: null }} />);
    expect(screen.getByText('Test Hotel')).toBeTruthy();
    expect(screen.queryByText(/km/i)).toBeNull();
  });

  it('does not break when distance_to_poi_km is undefined', () => {
    renderWithI18n(<PropertyCard property={{ ...baseProperty }} />);
    expect(screen.getByText('Test Hotel')).toBeTruthy();
  });

  it('shows distance when distance_to_poi_km is set', () => {
    renderWithI18n(<PropertyCard property={{ ...baseProperty, distance_to_poi_km: 12.5 }} />);
    expect(screen.getByText(/12,5/)).toBeTruthy();
    expect(screen.getByText(/km/i)).toBeTruthy();
  });
});
