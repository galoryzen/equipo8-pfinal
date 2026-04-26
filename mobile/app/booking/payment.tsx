import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useCart } from '@src/features/booking/cart-context';
import { useCountdown } from '@src/features/booking/use-countdown';
import { usePaymentPolling } from '@src/features/booking/use-payment-polling';
import {
  CheckoutInvalidStateError,
  checkoutBooking,
} from '@src/services/booking-service';
import { Button, Card, Input } from '@src/shared/ui';
import { colors, radius, shadows, spacing, typography } from '@src/theme';

const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
const URGENT_THRESHOLD_MS = 2 * 60 * 1000;

function countdownColor(remainingMs: number): { bg: string; fg: string } {
  if (remainingMs <= URGENT_THRESHOLD_MS) return { bg: '#FEE2E2', fg: '#991B1B' };
  if (remainingMs <= WARNING_THRESHOLD_MS) return { bg: '#FEF3C7', fg: '#92400E' };
  return { bg: colors.surface.soft, fg: colors.text.secondary };
}

type CardErrors = {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  cardholderName?: string;
};

const EXPIRY_RE = /^(0[1-9]|1[0-2])\/(\d{2})$/;

// Visa "decline" test card. Triggers force_decline on the backend so QA can
// exercise the failure path against the mock PSP. Any other number behaves
// normally and authorizes through the happy path.
const FORCE_DECLINE_TEST_CARD = '4000000000000002';

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { cart, loading, clearCart } = useCart();
  const countdown = useCountdown(cart?.hold_expires_at);
  const polling = usePaymentPolling();

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [errors, setErrors] = useState<CardErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The CART snapshot is our only source for property name, room name, and
  // hero image (the booking service only returns IDs). Capture them the
  // moment the payment authorizes, BEFORE clearing the cart, so the success
  // view can render a richer summary without a second catalog fetch.
  const [successExtras, setSuccessExtras] = useState<{
    property_name: string;
    room_name: string;
    image_url?: string;
  } | null>(null);
  const cartClearedRef = useRef(false);
  useEffect(() => {
    if (polling.status === 'authorized' && !cartClearedRef.current) {
      if (cart) {
        setSuccessExtras({
          property_name: cart.property_name,
          room_name: cart.room_name,
          image_url: cart.image_url,
        });
      }
      cartClearedRef.current = true;
      void clearCart();
    }
  }, [polling.status, cart, clearCart]);

  const palette = useMemo(() => countdownColor(countdown.remainingMs), [countdown.remainingMs]);

  const validate = (): boolean => {
    const next: CardErrors = {};
    const digits = cardNumber.replace(/\s/g, '');
    if (!digits) next.cardNumber = t('booking.payment.errors.required');
    else if (digits.length < 13 || digits.length > 19)
      next.cardNumber = t('booking.payment.errors.invalidCard');

    if (!expiry) next.expiry = t('booking.payment.errors.required');
    else if (!EXPIRY_RE.test(expiry))
      next.expiry = t('booking.payment.errors.invalidExpiry');

    if (!cvv) next.cvv = t('booking.payment.errors.required');
    else if (cvv.length < 3 || cvv.length > 4)
      next.cvv = t('booking.payment.errors.invalidCvv');

    if (!cardholderName.trim()) next.cardholderName = t('booking.payment.errors.required');

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePay = async () => {
    if (!cart) return;
    if (countdown.expired) return;
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    const forceDecline = cardNumber.replace(/\s/g, '') === FORCE_DECLINE_TEST_CARD;
    try {
      await checkoutBooking(cart.id, forceDecline);
      polling.startPolling(cart.id);
    } catch (err) {
      if (err instanceof CheckoutInvalidStateError) {
        if (err.code === 'CHECKOUT_GUESTS_INCOMPLETE') {
          setSubmitError(t('booking.payment.errors.guestsIncomplete'));
        } else {
          setSubmitError(t('booking.payment.errors.holdExpired'));
        }
      } else {
        setSubmitError(t('booking.payment.errors.checkoutFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isAuthorized = polling.status === 'authorized';
  const authorizedDetail = polling.bookingDetail;

  // After the payment authorizes, cart is cleared and becomes null. Render
  // the success view INSTEAD of the "no cart" empty state so the transition
  // feels natural.
  if (isAuthorized && authorizedDetail) {
    return (
      <>
        <Stack.Screen
          options={{ title: t('booking.success.title'), headerBackVisible: false }}
        />
        <View style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.successContent}
            showsVerticalScrollIndicator={false}
          >
            {successExtras?.image_url ? (
              <Image source={{ uri: successExtras.image_url }} style={styles.hero} />
            ) : (
              <View style={[styles.hero, styles.heroPlaceholder]}>
                <Ionicons name="bed-outline" size={48} color={colors.text.muted} />
              </View>
            )}

            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={72} color={colors.status.success} />
              <Text style={styles.successTitle}>{t('booking.success.title')}</Text>
              <Text style={styles.successSubtitle}>{t('booking.success.subtitle')}</Text>
            </View>

            <Card style={styles.summaryCard}>
              {successExtras?.property_name ? (
                <Text style={styles.propertyName}>{successExtras.property_name}</Text>
              ) : null}
              {successExtras?.room_name ? (
                <Text style={styles.roomName}>{successExtras.room_name}</Text>
              ) : null}
              <View style={styles.datesRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
                <Text style={styles.dates}>
                  {authorizedDetail.checkin} → {authorizedDetail.checkout}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('booking.success.totalLabel')}</Text>
                <Text style={styles.total}>
                  {authorizedDetail.grand_total} {authorizedDetail.currency_code}
                </Text>
              </View>
            </Card>

            <View style={styles.statusNoteWrap}>
              <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.statusNote}>{t('booking.success.statusNote')}</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t('booking.success.viewBookings')}
              onPress={() => router.replace('/trips')}
            />
            <Button
              title={t('booking.success.home')}
              variant="outline"
              onPress={() => router.replace('/')}
            />
          </View>
        </View>
      </>
    );
  }

  if (!cart) {
    return (
      <>
        <Stack.Screen options={{ title: t('booking.payment.title') }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('booking.payment.noReservation')}</Text>
          <Button
            title={t('booking.payment.backToCatalog')}
            onPress={() => router.replace('/')}
          />
        </View>
      </>
    );
  }

  const isProcessing = polling.status === 'processing';
  const isTimeout = polling.status === 'timeout';
  const isFailed = polling.status === 'failed';
  const isBusy = submitting || isProcessing;
  const payDisabled = countdown.expired || isBusy;
  // grand_total = subtotal + taxes + service_fee. This is the figure shown on
  // the checkout screen and the amount the backend actually charges. Showing
  // total_amount (subtotal only) here would mismatch both.
  const payLabel = t('booking.payment.payButton', {
    amount: cart.grand_total,
    currency: cart.currency_code,
  });

  return (
    <>
      <Stack.Screen options={{ title: t('booking.payment.title') }} />
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              {cart.grand_total} {cart.currency_code}
            </Text>
          </Card>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('booking.payment.cardDetails')}</Text>
            <Input
              label={t('booking.payment.cardNumber')}
              value={cardNumber}
              onChangeText={(v) => {
                setCardNumber(formatCardNumber(v));
                setErrors((e) => ({ ...e, cardNumber: undefined }));
                setSubmitError(null);
              }}
              placeholder={t('booking.payment.cardNumberPlaceholder')}
              keyboardType="number-pad"
              error={errors.cardNumber}
              editable={!isBusy}
              maxLength={23}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Input
                  label={t('booking.payment.expiry')}
                  value={expiry}
                  onChangeText={(v) => {
                    setExpiry(formatExpiry(v));
                    setErrors((e) => ({ ...e, expiry: undefined }));
                    setSubmitError(null);
                  }}
                  placeholder={t('booking.payment.expiryPlaceholder')}
                  keyboardType="number-pad"
                  error={errors.expiry}
                  editable={!isBusy}
                  maxLength={5}
                />
              </View>
              <View style={styles.flex}>
                <Input
                  label={t('booking.payment.cvv')}
                  value={cvv}
                  onChangeText={(v) => {
                    setCvv(v.replace(/\D/g, '').slice(0, 4));
                    setErrors((e) => ({ ...e, cvv: undefined }));
                    setSubmitError(null);
                  }}
                  placeholder={t('booking.payment.cvvPlaceholder')}
                  keyboardType="number-pad"
                  secureTextEntry
                  error={errors.cvv}
                  editable={!isBusy}
                  maxLength={4}
                />
              </View>
            </View>
            <Input
              label={t('booking.payment.cardholderName')}
              value={cardholderName}
              onChangeText={(v) => {
                setCardholderName(v);
                setErrors((e) => ({ ...e, cardholderName: undefined }));
                setSubmitError(null);
              }}
              autoCapitalize="words"
              error={errors.cardholderName}
              editable={!isBusy}
            />
          </View>

          {submitError ? (
            <Text style={styles.submitError} accessibilityLiveRegion="polite">
              {submitError}
            </Text>
          ) : null}
          {isFailed ? (
            <Text style={styles.submitError} accessibilityLiveRegion="polite">
              {t('booking.payment.errors.checkoutFailed')}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={payLabel}
            onPress={handlePay}
            loading={isBusy}
            disabled={payDisabled}
          />
        </View>

        {/* Processing overlay — blocks interaction while polling */}
        <Modal visible={isProcessing} transparent animationType="fade">
          <View style={styles.processingBackdrop}>
            <View style={styles.processingSheet}>
              <ActivityIndicator
                size="large"
                color={colors.primary}
                accessibilityLabel={t('booking.payment.processing')}
              />
              <Text style={styles.processingTitle}>{t('booking.payment.processing')}</Text>
              <Text style={styles.processingHint}>{t('booking.payment.processingHint')}</Text>
            </View>
          </View>
        </Modal>

        {/* Timeout overlay — user should check My bookings */}
        <Modal visible={isTimeout} transparent animationType="fade">
          <View style={styles.expiredBackdrop}>
            <View style={styles.expiredSheet}>
              <Text style={styles.expiredTitle}>{t('booking.payment.errors.timeout')}</Text>
              <View style={styles.expiredActions}>
                <Button
                  title={t('booking.payment.backToTrips')}
                  onPress={() => router.replace('/trips')}
                  style={styles.flex}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Expired hold overlay */}
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
  screen: { flex: 1, backgroundColor: colors.surface.white },
  emptyState: {
    flex: 1,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
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
  total: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
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
    gap: spacing.sm,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  processingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  processingSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  processingTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  processingHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
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
  successContent: {
    paddingBottom: 180,
  },
  hero: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface.soft,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  successTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    color: colors.text.primary,
    textAlign: 'center',
  },
  successSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  summaryCard: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    gap: spacing.xs,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border.default,
  },
  totalLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  statusNoteWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.base,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.soft,
  },
  statusNote: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
