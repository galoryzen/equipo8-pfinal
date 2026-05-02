import React from 'react';
import { render } from '@testing-library/react-native';

import { RatingHeader } from '../rating-header';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => (
      <View testID={`icon-${name}`} />
    ),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'property.reviewsCount' && typeof opts?.count === 'number') {
        return `${opts.count} reviews`;
      }
      const map: Record<string, string> = {
        'property.noRating': 'No ratings yet',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('RatingHeader', () => {
  it('renders the rating average to one decimal and the review count', () => {
    const { getByText } = render(
      <RatingHeader ratingAvg={4.567} reviewCount={12} />,
    );
    expect(getByText('4.6')).toBeTruthy();
    expect(getByText(/12 reviews/)).toBeTruthy();
  });

  it('shows the no-rating fallback when ratingAvg is null', () => {
    const { getByText, queryByText } = render(
      <RatingHeader ratingAvg={null} reviewCount={0} />,
    );
    expect(getByText('No ratings yet')).toBeTruthy();
    expect(queryByText(/reviews/)).toBeNull();
  });

  it('renders a star icon when a rating is present', () => {
    const { getAllByTestId } = render(
      <RatingHeader ratingAvg={4.0} reviewCount={3} />,
    );
    expect(getAllByTestId('icon-star')).toHaveLength(1);
  });

  it('does not render a star icon when ratingAvg is null', () => {
    const { queryAllByTestId } = render(
      <RatingHeader ratingAvg={null} reviewCount={0} />,
    );
    expect(queryAllByTestId('icon-star')).toHaveLength(0);
  });
});
