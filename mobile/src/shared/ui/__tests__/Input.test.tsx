import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input', () => {
  it('renders with label', () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error message', () => {
    const { getByText } = render(<Input label="Email" error="Required" />);
    expect(getByText('Required')).toBeTruthy();
  });

  it('handles text change', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <Input label="Email" accessibilityLabel="Email" onChangeText={onChange} />,
    );
    fireEvent.changeText(getByLabelText('Email'), 'test@example.com');
    expect(onChange).toHaveBeenCalledWith('test@example.com');
  });
});
