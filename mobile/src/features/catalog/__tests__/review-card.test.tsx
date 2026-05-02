import React from 'react';
import { render } from '@testing-library/react-native';

import { ReviewCard } from '../review-card';
import type { Review } from '@src/types/catalog';

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
    t: (key: string) => {
      const map: Record<string, string> = {
        'property.guest': 'Guest',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

const baseReview: Review = {
  id: 'rev-1',
  user_id: 'user-1',
  rating: 4,
  comment: 'Lovely stay, would book again.',
  created_at: '2026-01-15T10:00:00Z',
};

describe('ReviewCard', () => {
  it('renders the guest label, comment, and date', () => {
    const { getByText } = render(<ReviewCard review={baseReview} />);
    expect(getByText('Guest')).toBeTruthy();
    expect(getByText('Lovely stay, would book again.')).toBeTruthy();
    // formatted date contains the year
    expect(getByText(/2026/)).toBeTruthy();
  });

  it('renders one star icon per rating point', () => {
    const { getAllByTestId } = render(<ReviewCard review={baseReview} />);
    expect(getAllByTestId('icon-star')).toHaveLength(4);
  });

  it('clamps rating to 0–5 stars', () => {
    const { getAllByTestId } = render(
      <ReviewCard review={{ ...baseReview, rating: 99 }} />,
    );
    expect(getAllByTestId('icon-star')).toHaveLength(5);
  });

  it('omits the comment when not provided', () => {
    const { queryByText } = render(
      <ReviewCard review={{ ...baseReview, comment: undefined }} />,
    );
    expect(queryByText('Lovely stay, would book again.')).toBeNull();
  });
});
