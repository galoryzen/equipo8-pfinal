import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@src/services/api';

export type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB';

export interface RegisteredPushToken {
  token: string;
  platform: DevicePlatform;
}

export type PermissionResult =
  | { granted: true }
  | { granted: false; reason: 'denied' | 'simulator' | 'expo-go' };

const ANDROID_DEFAULT_CHANNEL_ID = 'default';

let foregroundHandlerConfigured = false;

export function configureNotificationHandler(): void {
  if (foregroundHandlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  foregroundHandlerConfigured = true;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#13B6EC',
  });
}

export async function requestPushPermissionsAsync(): Promise<PermissionResult> {
  // Expo Go on SDK 53+ no longer supports remote pushes — fail fast with a clear reason.
  if (Constants.appOwnership === 'expo') {
    return { granted: false, reason: 'expo-go' };
  }
  if (!Device.isDevice) {
    return { granted: false, reason: 'simulator' };
  }
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    return { granted: false, reason: 'denied' };
  }
  await ensureAndroidChannel();
  return { granted: true };
}

function platformFromOS(): DevicePlatform {
  switch (Platform.OS) {
    case 'ios':
      return 'IOS';
    case 'android':
      return 'ANDROID';
    default:
      return 'WEB';
  }
}

export async function getExpoPushTokenAsync(): Promise<RegisteredPushToken | null> {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) {
    console.warn('[notifications] Missing EAS projectId — cannot fetch Expo push token.');
    return null;
  }
  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: result.data, platform: platformFromOS() };
}

export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  await api.post('/v1/notifications/device-tokens', { token, platform });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await api.delete(`/v1/notifications/device-tokens/${encodeURIComponent(token)}`);
}
