import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GuestPicker } from '../GuestPicker';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'home.guests': 'Guests',
        'guests.decrease': 'Decrease guests',
        'guests.increase': 'Increase guests',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
      };
      if (key === 'search.guestsCount' && opts?.count) return `${opts.count} guests`;
      return map[key] ?? key;
    },
  }),
}));

describe('GuestPicker', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default initial value of 1', () => {
    const { getByText } = render(<GuestPicker {...defaultProps} />);
    expect(getByText('Guests')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('renders with provided initial guests', () => {
    const { getByText } = render(<GuestPicker {...defaultProps} initialGuests={3} />);
    expect(getByText('3')).toBeTruthy();
  });

  it('increments guest count', () => {
    const { getByLabelText, getByText } = render(<GuestPicker {...defaultProps} initialGuests={2} />);
    fireEvent.press(getByLabelText('Increase guests'));
    expect(getByText('3')).toBeTruthy();
  });

  it('decrements guest count', () => {
    const { getByLabelText, getByText } = render(<GuestPicker {...defaultProps} initialGuests={3} />);
    fireEvent.press(getByLabelText('Decrease guests'));
    expect(getByText('2')).toBeTruthy();
  });

  it('does not go below minimum of 1', () => {
    const { getByLabelText, getByText } = render(<GuestPicker {...defaultProps} initialGuests={1} />);
    fireEvent.press(getByLabelText('Decrease guests'));
    expect(getByText('1')).toBeTruthy();
  });

  it('does not go above maximum of 10', () => {
    const { getByLabelText, getByText } = render(<GuestPicker {...defaultProps} initialGuests={10} />);
    fireEvent.press(getByLabelText('Increase guests'));
    expect(getByText('10')).toBeTruthy();
  });

  it('calls onConfirm with current count and onClose when confirmed', () => {
    const { getByLabelText } = render(<GuestPicker {...defaultProps} initialGuests={2} />);
    fireEvent.press(getByLabelText('Increase guests'));
    fireEvent.press(getByLabelText('Confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(3);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose without onConfirm when cancelled', () => {
    const { getByLabelText } = render(<GuestPicker {...defaultProps} />);
    fireEvent.press(getByLabelText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(<GuestPicker {...defaultProps} visible={false} />);
    expect(queryByText('Guests')).toBeNull();
  });
});
