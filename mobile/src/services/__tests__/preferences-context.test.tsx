import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

import { PreferencesProvider, usePreferences } from '@src/services/preferences-context';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'en-US', languageCode: 'en' }]),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe('PreferencesProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue();
  });

  it('defaults to device locale and a matching currency when storage is empty', async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // expo-localization mock returns en-US ⇒ locale 'en', currency 'USD'
    expect(result.current.locale).toBe('en');
    expect(result.current.displayCurrency).toBe('USD');
  });

  it('restores saved preferences from AsyncStorage on mount', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ locale: 'es-CO', displayCurrency: 'COP' }),
    );

    const { result } = renderHook(() => usePreferences(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.locale).toBe('es-CO');
    expect(result.current.displayCurrency).toBe('COP');
  });

  it('persists locale changes through setLocale', async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setLocale('es-MX');
    });

    expect(result.current.locale).toBe('es-MX');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'travelhub.preferences',
      expect.stringContaining('"locale":"es-MX"'),
    );
  });

  it('persists currency changes through setDisplayCurrency', async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setDisplayCurrency('EUR');
    });

    expect(result.current.displayCurrency).toBe('EUR');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'travelhub.preferences',
      expect.stringContaining('"displayCurrency":"EUR"'),
    );
  });

  it('ignores stored values with unknown locale or currency', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ locale: 'fr-FR', displayCurrency: 'JPY' }),
    );

    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Falls back to device defaults
    expect(result.current.locale).toBe('en');
    expect(result.current.displayCurrency).toBe('USD');
  });
});
