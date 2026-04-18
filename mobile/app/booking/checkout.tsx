import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCart } from '@src/features/booking/cart-context';
import { useCountdown } from '@src/features/booking/use-countdown';
import { calculateNights } from '@src/features/catalog/rate-breakdown';
import { Button, Card, PriceBreakdownPanel } from '@src/shared/ui';
import type { SelectedRoomInfo } from '@src/shared/ui';
import { colors, radius, shadows, spacing, typography } from '@src/theme';

const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
const URGENT_THRESHOLD_MS = 2 * 60 * 1000;

function countdownColor(remainingMs: number): {
  bg: string;
  fg: string;
} {
  if (remainingMs <= URGENT_THRESHOLD_MS) return { bg: '#FEE2E2', fg: '#991B1B' };
  if (remainingMs <= WARNING_THRESHOLD_MS) return { bg: '#FEF3C7', fg: '#92400E' };
  return { bg: colors.surface.soft, fg: colors.text.secondary };
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { cart, loading } = useCart();
  const countdown = useCountdown(cart?.hold_expires_at);

  // Si no hay cart (directo navigate o session expirada), volver al home.
  useEffect(() => {
    if (!loading && !cart) {
      router.replace('/');
    }
  }, [loading, cart, router]);

  const nights = useMemo(
    () => (cart ? calculateNights(cart.checkin, cart.checkout) : 0),
    [cart],
  );

  const selection: SelectedRoomInfo | null = useMemo(() => {
    if (!cart) return null;
    const unitPrice = Number(cart.unit_price);
    if (!Number.isFinite(unitPrice)) return null;
    return {
      roomTypeId: cart.room_type_id,
      ratePlanId: cart.rate_plan_id,
      roomName: cart.room_name,
      ratePlanName: '',
      unitPrice,
      currencyCode: cart.currency_code,
    };
  }, [cart]);

  if (!cart || !selection) {
    return (
      <>
        <Stack.Screen options={{ title: t('booking.checkout.title') }} />
        <View style={styles.emptyState} />
      </>
    );
  }

  const palette = countdownColor(countdown.remainingMs);

  return (
    <>
      <Stack.Screen options={{ title: t('booking.checkout.title') }} />
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Countdown banner */}
          <View style={[styles.banner, { backgroundColor: palette.bg }]}>
            <Ionicons name="time-outline" size={18} color={palette.fg} />
            <Text style={[styles.bannerText, { color: palette.fg }]}>
              {t('booking.cart.countdown.label', { label: countdown.label })}
            </Text>
          </View>

          {/* Summary */}
          <Card style={styles.card}>
            <Text style={styles.propertyName}>{cart.property_name}</Text>
            <Text style={styles.roomName}>{cart.room_name}</Text>
            <Text style={styles.dates}>
              {cart.checkin} → {cart.checkout}
              {nights > 0 ? ` · ${nights}n` : ''}
            </Text>
          </Card>

          {nights > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('rooms.priceBreakdown')}</Text>
              <PriceBreakdownPanel selection={selection} nights={nights} />
            </View>
          )}

          {/* Guest details placeholder (SCRUM-124) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('booking.checkout.guestDetails')}</Text>
            <Text style={styles.comingSoon}>{t('booking.checkout.comingSoon')}</Text>
            <TextInput style={styles.input} editable={false} placeholder="First name" />
            <TextInput style={styles.input} editable={false} placeholder="Last name" />
            <TextInput style={styles.input} editable={false} placeholder="Email" />
            <TextInput style={styles.input} editable={false} placeholder="Phone" />
          </View>

          {/* Payment placeholder (SCRUM-125) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('booking.checkout.paymentMethod')}</Text>
            <Text style={styles.comingSoon}>{t('booking.checkout.comingSoon')}</Text>
            <TextInput style={styles.input} editable={false} placeholder="Card number" />
            <TextInput style={styles.input} editable={false} placeholder="MM / YY" />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={t('booking.checkout.continueToPayment')}
            disabled
            onPress={undefined}
          />
        </View>

        {/* Expired overlay */}
        <Modal visible={countdown.expired} transparent animationType="fade">
          <View style={styles.expiredBackdrop}>
            <View style={styles.expiredSheet}>
              <Text style={styles.expiredTitle}>{t('booking.cart.expired.title')}</Text>
              <Text style={styles.expiredBody}>{t('booking.cart.expired.body')}</Text>
              <View style={styles.expiredActions}>
                <Button
                  title={t('booking.cart.expired.newSearch')}
                  variant="outline"
                  onPress={() => router.replace('/')}
                  style={styles.flex}
                />
                <Button
                  title={t('booking.cart.expired.myTrips')}
                  onPress={() => router.replace('/trips')}
                  style={styles.flex}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  emptyState: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 120,
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  comingSoon: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.soft,
    color: colors.text.muted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  expiredBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  expiredSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  expiredTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  expiredBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  expiredActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
});
