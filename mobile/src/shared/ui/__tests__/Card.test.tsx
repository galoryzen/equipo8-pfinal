import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(<Card><Text>Content</Text></Card>);
    expect(getByText('Content')).toBeTruthy();
  });

  it('calls onPress when pressable', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card onPress={onPress}><Text>Press me</Text></Card>,
    );
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders elevated style', () => {
    const { getByText } = render(
      <Card elevated><Text>Elevated</Text></Card>,
    );
    expect(getByText('Elevated')).toBeTruthy();
  });
});
