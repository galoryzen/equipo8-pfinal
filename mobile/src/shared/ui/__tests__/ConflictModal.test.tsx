import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { ConflictModal } from '@src/shared/ui/ConflictModal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (!values) return key;
      return `${key}::${JSON.stringify(values)}`;
    },
  }),
}));

const DEFAULTS = {
  visible: true,
  currentProperty: 'Casa Medina',
  currentRoom: 'Suite Deluxe',
  currentCheckin: '2026-05-01',
  currentCheckout: '2026-05-04',
  onReplace: jest.fn(),
  onCancel: jest.fn(),
};

describe('ConflictModal', () => {
  beforeEach(() => {
    DEFAULTS.onReplace.mockClear();
    DEFAULTS.onCancel.mockClear();
  });

  it('renders title and body with interpolated cart data', () => {
    const { getByText } = render(<ConflictModal {...DEFAULTS} />);
    expect(getByText('booking.cart.conflict.title')).toBeTruthy();
    expect(
      getByText(/Casa Medina.*Suite Deluxe.*2026-05-01.*2026-05-04/),
    ).toBeTruthy();
  });

  it('invokes onReplace when the replace button is pressed', () => {
    const { getByText } = render(<ConflictModal {...DEFAULTS} />);
    fireEvent.press(getByText('booking.cart.conflict.replace'));
    expect(DEFAULTS.onReplace).toHaveBeenCalledTimes(1);
    expect(DEFAULTS.onCancel).not.toHaveBeenCalled();
  });

  it('invokes onCancel when the cancel button is pressed', () => {
    const { getByText } = render(<ConflictModal {...DEFAULTS} />);
    fireEvent.press(getByText('booking.cart.conflict.cancel'));
    expect(DEFAULTS.onCancel).toHaveBeenCalledTimes(1);
    expect(DEFAULTS.onReplace).not.toHaveBeenCalled();
  });

  it('disables buttons while loading', () => {
    const { getByText } = render(<ConflictModal {...DEFAULTS} loading />);
    fireEvent.press(getByText('booking.cart.conflict.cancel'));
    expect(DEFAULTS.onCancel).not.toHaveBeenCalled();
  });
});
