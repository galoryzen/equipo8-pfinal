jest.mock('@src/services/api');

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { api } from '@src/services/api';
import {
  configureNotificationHandler,
  getExpoPushTokenAsync,
  registerDeviceToken,
  requestPushPermissionsAsync,
  unregisterDeviceToken,
} from '@src/services/notifications-service';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;

beforeEach(() => {
  jest.clearAllMocks();
  // reset module-level handler-configured flag between tests
  (mockedNotifications.setNotificationHandler as jest.Mock).mockClear();
});

describe('configureNotificationHandler', () => {
  it('sets the handler exactly once across calls', () => {
    configureNotificationHandler();
    configureNotificationHandler();
    expect(mockedNotifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});

describe('requestPushPermissionsAsync', () => {
  it('returns granted when permissions already granted', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);

    const result = await requestPushPermissionsAsync();

    expect(result).toEqual({ granted: true });
    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permissions when not yet granted', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);

    const result = await requestPushPermissionsAsync();

    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(result).toEqual({ granted: true });
  });

  it('returns denied when the user refuses', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
    } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);

    const result = await requestPushPermissionsAsync();

    expect(result).toEqual({ granted: false, reason: 'denied' });
  });

  it('returns simulator reason when not running on a real device', async () => {
    (Device as unknown as { isDevice: boolean }).isDevice = false;

    const result = await requestPushPermissionsAsync();

    expect(result).toEqual({ granted: false, reason: 'simulator' });
    (Device as unknown as { isDevice: boolean }).isDevice = true;
  });

  it('returns expo-go reason when running inside Expo Go', async () => {
    (Constants as unknown as { appOwnership: string }).appOwnership = 'expo';

    const result = await requestPushPermissionsAsync();

    expect(result).toEqual({ granted: false, reason: 'expo-go' });
    (Constants as unknown as { appOwnership: string }).appOwnership = 'standalone';
  });
});

describe('getExpoPushTokenAsync', () => {
  it('returns the token and platform when projectId is configured', async () => {
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[abc]',
      type: 'expo',
    } as Awaited<ReturnType<typeof Notifications.getExpoPushTokenAsync>>);

    const result = await getExpoPushTokenAsync();

    expect(mockedNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'test-project-id',
    });
    expect(result).toEqual({ token: 'ExponentPushToken[abc]', platform: 'IOS' });
  });

  it('returns null and warns when projectId is missing', async () => {
    const expoConfig = (
      Constants as unknown as { expoConfig: { extra: { eas: { projectId?: string } } } }
    ).expoConfig;
    const original = expoConfig.extra.eas.projectId;
    expoConfig.extra.eas.projectId = undefined;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await getExpoPushTokenAsync();

    expect(result).toBeNull();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expoConfig.extra.eas.projectId = original;
    warnSpy.mockRestore();
  });
});

describe('registerDeviceToken / unregisterDeviceToken', () => {
  it('POSTs the token + platform to the notifications endpoint', async () => {
    mockedApi.post.mockResolvedValue({ data: {} } as never);

    await registerDeviceToken('ExponentPushToken[abc]', 'ANDROID');

    expect(mockedApi.post).toHaveBeenCalledWith('/v1/notifications/device-tokens', {
      token: 'ExponentPushToken[abc]',
      platform: 'ANDROID',
    });
  });

  it('DELETEs the URL-encoded token from the notifications endpoint', async () => {
    mockedApi.delete.mockResolvedValue({ data: {} } as never);

    await unregisterDeviceToken('ExponentPushToken[abc/def]');

    expect(mockedApi.delete).toHaveBeenCalledWith(
      `/v1/notifications/device-tokens/${encodeURIComponent('ExponentPushToken[abc/def]')}`,
    );
  });
});
