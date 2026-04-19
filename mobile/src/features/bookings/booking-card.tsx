import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, radius, shadows, spacing, typography } from '@src/theme';
import { formatBookingCode, statusI18nKey } from './bookings-helpers';
import type { EnrichedBookingListItem } from './use-my-bookings';

interface BookingCardProps {
  booking: EnrichedBookingListItem;
  onPress: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const { t } = useTranslation();
  const statusLabel = t(statusI18nKey(booking.status));
  const code = formatBookingCode(booking.id);
  const propertyName = booking.property_name || t('trips.card.unknownProperty');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('trips.card.viewDetails')}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {booking.image_url ? (
        <Image source={{ uri: booking.image_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="bed-outline" size={28} color={colors.text.secondary} />
        </View>
      )}
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.property}>
          {propertyName}
        </Text>
        {booking.city_name ? (
          <Text numberOfLines={1} style={styles.city}>
            {booking.city_name}
          </Text>
        ) : null}
        <Text style={styles.dates}>
          {booking.checkin} → {booking.checkout}
        </Text>
        <View style={styles.footerRow}>
          <View style={[styles.statusPill, pillStyleFor(booking.status)]}>
            <Text style={[styles.statusText, pillTextStyleFor(booking.status)]}>
              {statusLabel}
            </Text>
          </View>
          <Text style={styles.code}>{code}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
    </Pressable>
  );
}

function pillStyleFor(status: string) {
  if (status === 'CONFIRMED') return styles.pillSuccess;
  if (status === 'CANCELLED' || status === 'REJECTED') return styles.pillDanger;
  return styles.pillNeutral;
}

function pillTextStyleFor(status: string) {
  if (status === 'CONFIRMED') return styles.pillSuccessText;
  if (status === 'CANCELLED' || status === 'REJECTED') return styles.pillDangerText;
  return styles.pillNeutralText;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.9,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.soft,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  property: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  city: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  dates: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
  },
  pillSuccess: { backgroundColor: '#DCFCE7' },
  pillSuccessText: { color: '#166534' },
  pillDanger: { backgroundColor: '#FEE2E2' },
  pillDangerText: { color: '#991B1B' },
  pillNeutral: { backgroundColor: colors.surface.soft },
  pillNeutralText: { color: colors.text.secondary },
  code: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
});
