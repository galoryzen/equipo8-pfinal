import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

import { CartProvider, useCart } from '@src/features/booking/cart-context';
import { useAuth } from '@src/services/auth-context';
import {
  cancelCartBooking,
  createCartBooking,
  getBookingDetail,
} from '@src/services/booking-service';
import type { BookingDetail, CartBooking, CartExtras, CartSnapshot, CreateCartBookingPayload } from '@src/types/booking';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@src/services/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@src/services/booking-service', () => {
  const original = jest.requireActual('@src/services/booking-service');
  return {
    ...original,
    createCartBooking: jest.fn(),
    getBookingDetail: jest.fn(),
    cancelCartBooking: jest.fn(),
  };
});

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedCreate = createCartBooking as jest.MockedFunction<typeof createCartBooking>;
const mockedGet = getBookingDetail as jest.MockedFunction<typeof getBookingDetail>;
const mockedCancel = cancelCartBooking as jest.MockedFunction<typeof cancelCartBooking>;

const SNAPSHOT: CartSnapshot = {
  id: 'b1',
  status: 'CART',
  checkin: '2026-05-01',
  checkout: '2026-05-04',
  hold_expires_at: '2026-05-01T12:15:00',
  total_amount: '360.00',
  currency_code: 'USD',
  property_id: 'p1',
  room_type_id: 'r1',
  rate_plan_id: 'rp1',
  unit_price: '120.00',
  property_name: 'Casa Medina',
  room_name: 'Suite Deluxe',
  image_url: 'https://example.com/img.jpg',
};

const PAYLOAD: CreateCartBookingPayload = {
  checkin: SNAPSHOT.checkin,
  checkout: SNAPSHOT.checkout,
  currency_code: 'USD',
  property_id: SNAPSHOT.property_id,
  room_type_id: SNAPSHOT.room_type_id,
  rate_plan_id: SNAPSHOT.rate_plan_id,
  unit_price: SNAPSHOT.unit_price,
};

const EXTRAS: CartExtras = {
  property_name: SNAPSHOT.property_name,
  room_name: SNAPSHOT.room_name,
  image_url: SNAPSHOT.image_url,
};

const CART_SERVER: CartBooking = { ...SNAPSHOT };
const DETAIL_SERVER: BookingDetail = {
  ...CART_SERVER,
  policy_type_applied: 'FULL',
  policy_hours_limit_applied: null,
  policy_refund_percent_applied: null,
  created_at: '2026-04-18T12:00:00',
  updated_at: '2026-04-18T12:00:00',
};

function authState(partial: Partial<ReturnType<typeof useAuth>>) {
  mockedUseAuth.mockReturnValue({
    isLoggedIn: false,
    loading: false,
    user: null,
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    ...partial,
  } as ReturnType<typeof useAuth>);
}

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

describe('CartProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedAsyncStorage.removeItem.mockResolvedValue();
  });

  it('stays empty when user is not logged in', async () => {
    authState({ isLoggedIn: false });

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cart).toBeNull();
    expect(result.current.hasActiveCart).toBe(false);
    expect(mockedAsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('hydrates from AsyncStorage and reconciles with the server', async () => {
    authState({ isLoggedIn: true });
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(SNAPSHOT));
    mockedGet.mockResolvedValueOnce(DETAIL_SERVER);

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('b1'));
    expect(result.current.cart?.id).toBe('b1');
    expect(result.current.cart?.property_name).toBe('Casa Medina');
  });

  it('clears hydrated cart when server says it is EXPIRED', async () => {
    authState({ isLoggedIn: true });
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(SNAPSHOT));
    mockedGet.mockResolvedValueOnce({ ...DETAIL_SERVER, status: 'EXPIRED' });

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.cart).toBeNull());
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('travelhub.cart');
  });

  it('clears hydrated cart when server returns 404', async () => {
    authState({ isLoggedIn: true });
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(SNAPSHOT));
    const err = Object.assign(new Error('not found'), {
      isAxiosError: true,
      response: { status: 404 },
    });
    mockedGet.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.cart).toBeNull());
  });

  it('createCart calls server and persists extras', async () => {
    authState({ isLoggedIn: true });
    mockedCreate.mockResolvedValueOnce(CART_SERVER);

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createCart(PAYLOAD, EXTRAS);
    });

    expect(mockedCreate).toHaveBeenCalledWith(PAYLOAD);
    expect(result.current.cart?.property_name).toBe('Casa Medina');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'travelhub.cart',
      expect.stringContaining('"property_name":"Casa Medina"'),
    );
  });

  it('replaceCart calls cancel then create', async () => {
    authState({ isLoggedIn: true });
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(SNAPSHOT));
    mockedGet.mockResolvedValueOnce(DETAIL_SERVER);
    mockedCancel.mockResolvedValueOnce({ ...DETAIL_SERVER, status: 'CANCELLED' });
    mockedCreate.mockResolvedValueOnce({ ...CART_SERVER, id: 'b2' });

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.cart?.id).toBe('b1'));

    await act(async () => {
      await result.current.replaceCart(PAYLOAD, { ...EXTRAS, property_name: 'Other Hotel' });
    });

    expect(mockedCancel).toHaveBeenCalledWith('b1');
    expect(mockedCreate).toHaveBeenCalledWith(PAYLOAD);
    expect(result.current.cart?.id).toBe('b2');
    expect(result.current.cart?.property_name).toBe('Other Hotel');
  });

  it('logout (isLoggedIn true -> false) clears the cart', async () => {
    authState({ isLoggedIn: true });
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(SNAPSHOT));
    mockedGet.mockResolvedValueOnce(DETAIL_SERVER);

    const { result, rerender } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.cart?.id).toBe('b1'));

    authState({ isLoggedIn: false });
    rerender(undefined);

    await waitFor(() => expect(result.current.cart).toBeNull());
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('travelhub.cart');
  });
});
