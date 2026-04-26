import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';
import { formatCurrency } from '@src/shared/utils/format-currency';
import type { RateBreakdown } from '@src/features/catalog/rate-breakdown';
import type { SelectedRoomInfo } from './RoomTypeCard';

interface PriceBreakdownPanelProps {
  selection: SelectedRoomInfo;
  /** Pre-built breakdown from authoritative pricing (per-night + server fees). */
  breakdown: RateBreakdown;
}

export function PriceBreakdownPanel({ selection, breakdown }: PriceBreakdownPanelProps) {
  const { t } = useTranslation();

  const currency = selection.currencyCode;
  const hasPromo = breakdown.discount != null && breakdown.discount > 0;
  const promo = selection.promotion;

  // When there's a discount, show original × nights as the "starting" line.
  // When no discount, show the regular unit price × nights.
  const firstLinePrice = hasPromo
    ? breakdown.originalPricePerNight ?? breakdown.pricePerNight
    : breakdown.pricePerNight;
  const firstLineAmount = hasPromo
    ? breakdown.originalSubtotal ?? breakdown.subtotal
    : breakdown.subtotal;

  const discountLabelDetail = promo
    ? promo.discountType === 'PERCENT'
      ? `−${Math.round(promo.discountValue)}%`
      : `−${formatCurrency(Math.round(promo.discountValue), currency, { maximumFractionDigits: 0 })}${t('rooms.breakdown.perNightShort')}`
    : null;

  return (
    <View style={styles.container} accessibilityRole="summary">
      {/* Avg price × nights. When per-night pricing varies, ``firstLinePrice``
          is the average derived from the authoritative breakdown — the total
          still matches the sum of per-night rates exactly. */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>
          {t('rooms.breakdown.perNightLine', {
            price: formatCurrency(firstLinePrice, currency),
            count: breakdown.nights,
          })}
        </Text>
        <Text style={styles.rowValue}>{formatCurrency(firstLineAmount, currency)}</Text>
      </View>

      {/* Discount line (only when promo) */}
      {hasPromo && breakdown.discount != null && (
        <View style={styles.row}>
          <Text style={styles.discountLabel}>
            {t('rooms.breakdown.discount')}
            {discountLabelDetail ? ` (${discountLabelDetail})` : ''}
          </Text>
          <Text style={styles.discountValue}>
            −{formatCurrency(breakdown.discount, currency)}
          </Text>
        </View>
      )}

      {/* Subtotal after discount (only when promo) */}
      {hasPromo && (
        <>
          <View style={styles.subtleDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('rooms.breakdown.subtotal')}</Text>
            <Text style={styles.rowValue}>{formatCurrency(breakdown.subtotal, currency)}</Text>
          </View>
        </>
      )}

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('rooms.breakdown.taxes')}</Text>
        <Text style={styles.rowValue}>{formatCurrency(breakdown.taxes, currency)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('rooms.breakdown.serviceFee')}</Text>
        <Text style={styles.rowValue}>{formatCurrency(breakdown.serviceFee, currency)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>{t('rooms.breakdown.total')}</Text>
        <Text style={styles.totalValue}>{formatCurrency(breakdown.total, currency)}</Text>
      </View>

      {hasPromo && breakdown.discount != null && (
        <Text style={styles.savedHint}>
          {t('rooms.breakdown.youSaved', {
            amount: formatCurrency(breakdown.discount, currency),
          })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.soft,
    borderRadius: radius.md,
    padding: spacing.base,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  rowValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  discountLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.status.success,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  discountValue: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.status.success,
  },
  subtleDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  totalValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  savedHint: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.status.success,
    textAlign: 'right',
    marginTop: 2,
  },
});
