import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { useCart } from '@src/features/booking/cart-context';
import { CartHeaderButton } from '@src/shared/ui/CartHeaderButton';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@src/features/booking/cart-context', () => ({
  useCart: jest.fn(),
}));

const mockedUseCart = useCart as jest.MockedFunction<typeof useCart>;

function cartState(hasActiveCart: boolean) {
  mockedUseCart.mockReturnValue({
    hasActiveCart,
  } as ReturnType<typeof useCart>);
}

describe('CartHeaderButton', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders nothing when there is no active cart', () => {
    cartState(false);
    const { toJSON } = render(<CartHeaderButton />);
    expect(toJSON()).toBeNull();
  });

  it('renders the button with accessibility label when there is a cart', () => {
    cartState(true);
    const { getByRole } = render(<CartHeaderButton />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('navigates to /booking/checkout on press', () => {
    cartState(true);
    const { getByRole } = render(<CartHeaderButton />);
    fireEvent.press(getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/booking/checkout');
  });
});
