import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Chip } from '../Chip';

describe('Chip', () => {
  it('renders label', () => {
    const { getByText } = render(<Chip label="WiFi" />);
    expect(getByText('WiFi')).toBeTruthy();
  });

  it('calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Chip label="Pool" onPress={onPress} />);
    fireEvent.press(getByText('Pool'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders selected state', () => {
    const { getByText } = render(<Chip label="Spa" selected />);
    expect(getByText('Spa')).toBeTruthy();
  });
});
