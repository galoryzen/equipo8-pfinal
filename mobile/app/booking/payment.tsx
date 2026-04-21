import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCart } from '@src/features/booking/cart-context';
import { useCountdown } from '@src/features/booking/use-countdown';
import { Card } from '@src/shared/ui';
import { colors, radius, spacing, typography } from '@src/theme';

const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
const URGENT_THRESHOLD_MS = 2 * 60 * 1000;

function countdownColor(remainingMs: number): { bg: string; fg: string } {
  if (remainingMs <= URGENT_THRESHOLD_MS) return { bg: '#FEE2E2', fg: '#991B1B' };
  if (remainingMs <= WARNING_THRESHOLD_MS) return { bg: '#FEF3C7', fg: '#92400E' };
  return { bg: colors.surface.soft, fg: colors.text.secondary };
}

export default function PaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { cart, loading } = useCart();
  const countdown = useCountdown(cart?.hold_expires_at);

  useEffect(() => {
    if (!loading && !cart) {
      router.replace('/');
    }
  }, [loading, cart, router]);

  const palette = useMemo(() => countdownColor(countdown.remainingMs), [countdown.remainingMs]);

  if (!cart) {
    return (
      <>
        <Stack.Screen options={{ title: t('booking.payment.title') }} />
        <View style={styles.emptyState} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('booking.payment.title') }} />
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.banner, { backgroundColor: palette.bg }]}>
            <Ionicons name="time-outline" size={18} color={palette.fg} />
            <Text style={[styles.bannerText, { color: palette.fg }]}>
              {t('booking.cart.countdown.label', { label: countdown.label })}
            </Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.propertyName}>{cart.property_name}</Text>
            <Text style={styles.roomName}>{cart.room_name}</Text>
            <Text style={styles.dates}>
              {cart.checkin} → {cart.checkout}
            </Text>
            <Text style={styles.total}>
              {cart.total_amount} {cart.currency_code}
            </Text>
          </Card>

          <Text style={styles.comingSoon}>{t('booking.payment.comingSoon')}</Text>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.white },
  emptyState: { flex: 1, backgroundColor: colors.surface.white },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  bannerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
  },
  card: {
    padding: spacing.base,
    gap: spacing.xs,
  },
  propertyName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  roomName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dates: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  total: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  comingSoon: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
