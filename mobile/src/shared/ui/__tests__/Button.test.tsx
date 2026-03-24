import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders title', () => {
    const { getByText } = render(<Button title="Click me" />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click" onPress={onPress} />);
    fireEvent.press(getByText('Click'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click" onPress={onPress} disabled />);
    fireEvent.press(getByText('Click'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders outline variant', () => {
    const { getByText } = render(<Button title="Outline" variant="outline" />);
    expect(getByText('Outline')).toBeTruthy();
  });

  it('renders ghost variant', () => {
    const { getByText } = render(<Button title="Ghost" variant="ghost" />);
    expect(getByText('Ghost')).toBeTruthy();
  });

  it('shows loading indicator', () => {
    const { queryByText } = render(<Button title="Load" loading />);
    expect(queryByText('Load')).toBeNull();
  });
});
