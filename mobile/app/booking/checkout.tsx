import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCart } from '@src/features/booking/cart-context';
import { useCountdown } from '@src/features/booking/use-countdown';
import { calculateNights } from '@src/features/catalog/rate-breakdown';
import { useAuth } from '@src/services/auth-context';
import {
  GuestsValidationError,
  listBookingGuests,
  saveBookingGuests,
} from '@src/services/booking-service';
import { Button, Card, Input, PriceBreakdownPanel } from '@src/shared/ui';
import type { SelectedRoomInfo } from '@src/shared/ui';
import { colors, radius, shadows, spacing, typography } from '@src/theme';
import type { Guest } from '@src/types/booking';

const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
const URGENT_THRESHOLD_MS = 2 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function countdownColor(remainingMs: number): {
  bg: string;
  fg: string;
} {
  if (remainingMs <= URGENT_THRESHOLD_MS) return { bg: '#FEE2E2', fg: '#991B1B' };
  if (remainingMs <= WARNING_THRESHOLD_MS) return { bg: '#FEF3C7', fg: '#92400E' };
  return { bg: colors.surface.soft, fg: colors.text.secondary };
}

type GuestErrors = {
  full_name?: string;
  email?: string;
  phone?: string;
};

function buildInitialGuests(count: number, profileName: string, profileEmail: string): Guest[] {
  const list: Guest[] = [
    {
      is_primary: true,
      full_name: profileName,
      email: profileEmail || null,
      phone: null,
    },
  ];
  for (let i = 1; i < count; i += 1) {
    list.push({ is_primary: false, full_name: '', email: null, phone: null });
  }
  return list;
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { cart, loading } = useCart();
  const { user } = useAuth();
  const countdown = useCountdown(cart?.hold_expires_at);

  // Si no hay cart (directo navigate o session expirada), volver al home.
  useEffect(() => {
    if (!loading && !cart) {
      router.replace('/');
    }
  }, [loading, cart, router]);

  const guestsCount = cart?.guests_count ?? 1;

  const [guests, setGuests] = useState<Guest[]>(() =>
    buildInitialGuests(guestsCount, user?.fullName ?? '', user?.email ?? ''),
  );
  const [errors, setErrors] = useState<Record<number, GuestErrors>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hydrate the form from the server so returning to checkout after a save
  // shows the data the user already entered (incl. phone, which isn't on
  // the auth profile). Falls back silently to profile-based defaults.
  useEffect(() => {
    if (!cart) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await listBookingGuests(cart.id);
        if (cancelled) return;
        if (saved.length === cart.guests_count && saved.length > 0) {
          const primaryFirst = [...saved].sort(
            (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0),
          );
          setGuests(
            primaryFirst.map((g) => ({
              id: g.id,
              is_primary: g.is_primary,
              full_name: g.full_name,
              email: g.email ?? null,
              phone: g.phone ?? null,
            })),
          );
        } else {
          setGuests(
            buildInitialGuests(
              cart.guests_count,
              user?.fullName ?? '',
              user?.email ?? '',
            ),
          );
        }
      } catch {
        if (cancelled) return;
        setGuests(
          buildInitialGuests(
            cart.guests_count,
            user?.fullName ?? '',
            user?.email ?? '',
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cart?.id, cart?.guests_count, user?.fullName, user?.email]);

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

  const updateGuest = (index: number, field: keyof Guest, value: string) => {
    setGuests((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    );
    // Clear the field-level error as the user types.
    setErrors((prev) => {
      const current = prev[index];
      if (!current || !(field in current)) return prev;
      const next = { ...prev, [index]: { ...current, [field]: undefined } };
      return next;
    });
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const next: Record<number, GuestErrors> = {};
    guests.forEach((g, i) => {
      const ge: GuestErrors = {};
      if (!g.full_name.trim()) ge.full_name = t('booking.checkout.guests.errors.required');
      if (g.is_primary) {
        const email = (g.email ?? '').trim();
        const phone = (g.phone ?? '').trim();
        if (!email) ge.email = t('booking.checkout.guests.errors.required');
        else if (!EMAIL_RE.test(email))
          ge.email = t('booking.checkout.guests.errors.invalidEmail');
        if (!phone) ge.phone = t('booking.checkout.guests.errors.required');
        else if (phone.replace(/\D/g, '').length < 7)
          ge.phone = t('booking.checkout.guests.errors.invalidPhone');
      }
      if (ge.full_name || ge.email || ge.phone) next[i] = ge;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = async () => {
    if (!cart) return;
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        guests: guests.map((g) => ({
          is_primary: g.is_primary,
          full_name: g.full_name.trim(),
          email: g.email?.trim() || null,
          phone: g.phone?.trim() || null,
        })),
      };
      await saveBookingGuests(cart.id, payload);
      router.push('/booking/payment');
    } catch (err) {
      if (err instanceof GuestsValidationError) {
        const key =
          err.code === 'GUESTS_COUNT_MISMATCH'
            ? 'countMismatch'
            : err.code === 'PRIMARY_GUEST_REQUIRED'
              ? 'primaryRequired'
              : err.code === 'PRIMARY_GUEST_MISSING_CONTACT'
                ? 'primaryMissingContact'
                : 'saveFailed';
        setSubmitError(t(`booking.checkout.guests.errors.${key}`));
      } else {
        setSubmitError(t('booking.checkout.guests.errors.saveFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

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

          {/* Guest details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('booking.checkout.guestDetails')}</Text>
            {guests.map((guest, index) => (
              <View key={index} style={styles.guestBlock}>
                <Text style={styles.guestLabel}>
                  {guest.is_primary
                    ? t('booking.checkout.guests.primary')
                    : t('booking.checkout.guests.additional', { number: index + 1 })}
                </Text>
                {guest.is_primary && (
                  <Text style={styles.hintText}>
                    {t('booking.checkout.guests.autofilledFromProfile')}
                  </Text>
                )}
                <Input
                  label={t('booking.checkout.guests.fullName')}
                  value={guest.full_name}
                  onChangeText={(v) => updateGuest(index, 'full_name', v)}
                  autoCapitalize="words"
                  error={errors[index]?.full_name}
                />
                {guest.is_primary && (
                  <>
                    <Input
                      label={t('booking.checkout.guests.email')}
                      value={guest.email ?? ''}
                      onChangeText={(v) => updateGuest(index, 'email', v)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={errors[index]?.email}
                    />
                    <Input
                      label={t('booking.checkout.guests.phone')}
                      value={guest.phone ?? ''}
                      onChangeText={(v) => updateGuest(index, 'phone', v)}
                      keyboardType="phone-pad"
                      error={errors[index]?.phone}
                    />
                  </>
                )}
              </View>
            ))}
          </View>

          {submitError ? (
            <Text style={styles.submitError} accessibilityLiveRegion="polite">
              {submitError}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={t('booking.checkout.continueToPayment')}
            onPress={handleContinue}
            loading={submitting}
            disabled={submitting}
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
  guestBlock: {
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.md,
    backgroundColor: colors.surface.soft,
  },
  guestLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  hintText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  submitError: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.status.error,
    textAlign: 'center',
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
