import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@src/services/auth-context';
import {
  configureNotificationHandler,
  getExpoPushTokenAsync,
  registerDeviceToken,
  requestPushPermissionsAsync,
  unregisterDeviceToken,
  type PermissionResult,
} from '@src/services/notifications-service';

const PUSH_TOKEN_KEY = 'travelhub.pushToken';

const BOOKING_DEEPLINK_TYPES = new Set(['BOOKING_CONFIRMED', 'BOOKING_REJECTED']);

function extractBookingId(
  response: Notifications.NotificationResponse | null,
): string | null {
  const data = response?.notification.request.content.data as
    | Record<string, unknown>
    | undefined;
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const bookingId = typeof data.booking_id === 'string' ? data.booking_id : null;
  if (!type || !bookingId) return null;
  if (!BOOKING_DEEPLINK_TYPES.has(type)) return null;
  return bookingId;
}

interface NotificationsState {
  pushToken: string | null;
  permission: PermissionResult | null;
  lastNotification: Notifications.Notification | null;
  lastResponse: Notifications.NotificationResponse | null;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionResult | null>(null);
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);
  const [lastResponse, setLastResponse] =
    useState<Notifications.NotificationResponse | null>(null);
  // Tracks whether registration is currently in flight, so successive auth
  // toggles don't fire overlapping calls.
  const inFlight = useRef(false);
  // Deduplicates navigation per response so re-renders don't repeat router.push.
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    configureNotificationHandler();

    const receivedSub = Notifications.addNotificationReceivedListener((notif) => {
      setLastNotification(notif);
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((resp) => {
      setLastResponse(resp);
    });
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!lastResponse) return;
    const responseId = lastResponse.notification.request.identifier;
    if (handledResponseId.current === responseId) return;
    const bookingId = extractBookingId(lastResponse);
    if (!bookingId) return;
    handledResponseId.current = responseId;
    router.push({ pathname: '/booking/[id]', params: { id: bookingId } });
  }, [lastResponse, router]);

  useEffect(() => {
    if (authLoading) return;
    if (inFlight.current) return;

    if (isLoggedIn) {
      inFlight.current = true;
      (async () => {
        try {
          const result = await requestPushPermissionsAsync();
          setPermission(result);
          if (!result.granted) {
            console.warn(
              `[notifications] permission not granted — reason=${result.reason}; ` +
                'remote pushes require a development build (Expo Go is unsupported on SDK 53+).',
            );
            return;
          }
          const fetched = await getExpoPushTokenAsync();
          if (!fetched) return;
          await registerDeviceToken(fetched.token, fetched.platform);
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, fetched.token);
          setPushToken(fetched.token);
        } catch (err) {
          console.warn('[notifications] failed to register push token', err);
        } finally {
          inFlight.current = false;
        }
      })();
    } else {
      inFlight.current = true;
      (async () => {
        try {
          const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
          if (stored) {
            try {
              await unregisterDeviceToken(stored);
            } catch (err) {
              // Best-effort: don't block logout if the network call fails.
              console.warn('[notifications] failed to deregister push token', err);
            }
          }
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
          setPushToken(null);
          setPermission(null);
        } finally {
          inFlight.current = false;
        }
      })();
    }
  }, [isLoggedIn, authLoading]);

  return (
    <NotificationsContext.Provider
      value={{ pushToken, permission, lastNotification, lastResponse }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
