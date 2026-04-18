import React, { useMemo } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '@src/theme';
import { formatCurrency } from '@src/shared/utils/format-currency';
import { Button } from './Button';
import type { RoomTypeOut, RatePlanOut } from '@src/types/catalog';

export interface SelectedRoomInfo {
  roomTypeId: string;
  ratePlanId: string;
  roomName: string;
  ratePlanName: string;
  unitPrice: number;
  originalUnitPrice?: number;
  currencyCode: string;
  promotion?: {
    discountType: 'PERCENT' | 'FIXED';
    discountValue: number;
  };
}

interface RoomTypeCardProps {
  room: RoomTypeOut;
  onSelect: (info: SelectedRoomInfo) => void;
  hasDates: boolean;
}

function pickCheapestPlan(room: RoomTypeOut): RatePlanOut | null {
  const plans = room.rate_plans.filter((rp) => rp.min_price != null);
  if (plans.length === 0) return null;
  return plans.reduce((a, b) => (a.min_price! < b.min_price! ? a : b));
}

export function RoomTypeCard({ room, onSelect, hasDates }: RoomTypeCardProps) {
  const { t } = useTranslation();

  const cheapest = useMemo(() => pickCheapestPlan(room), [room]);
  const currency = cheapest?.currency_code ?? 'USD';
  const price = cheapest?.min_price;
  const originalPrice = cheapest?.original_min_price;
  const promotion = cheapest?.promotion;
  const hasPromotion = originalPrice != null && price != null && originalPrice > price;
  const primaryImage = room.images[0];

  const handleSelect = () => {
    if (!cheapest || cheapest.min_price == null || !hasDates) return;
    onSelect({
      roomTypeId: room.id,
      ratePlanId: cheapest.id,
      roomName: room.name,
      ratePlanName: cheapest.name,
      unitPrice: cheapest.min_price,
      originalUnitPrice: cheapest.original_min_price,
      currencyCode: currency,
      promotion: promotion
        ? {
            discountType: promotion.discount_type,
            discountValue: promotion.discount_value,
          }
        : undefined,
    });
  };

  const canSelect = hasDates && price != null;
  const promoLabel = promotion
    ? promotion.discount_type === 'PERCENT'
      ? t('rooms.promoBadgePercent', { value: Math.round(promotion.discount_value) })
      : t('rooms.promoBadgeFixed', {
          amount: formatCurrency(Math.round(promotion.discount_value), currency, {
            maximumFractionDigits: 0,
          }),
        })
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage.url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="bed-outline" size={44} color={colors.border.default} />
          </View>
        )}
        {promoLabel && (
          <View style={styles.promoBadge} accessibilityLabel={promoLabel}>
            <Text style={styles.promoBadgeText}>{promoLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.roomName} numberOfLines={2}>
          {room.name}
        </Text>

        <View style={styles.amenitiesRow}>
          <View style={[styles.amenityPill, styles.capacityPill]}>
            <Ionicons name="people-outline" size={13} color={colors.text.muted} />
            <Text style={styles.amenityText}>
              {t('rooms.guestsCount', { count: room.capacity })}
            </Text>
          </View>
          {room.amenities.slice(0, 3).map((a) => (
            <View key={a.code} style={styles.amenityPill}>
              <Text style={styles.amenityText}>{a.name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          {price != null ? (
            <View style={styles.priceBlock}>
              {hasPromotion && originalPrice != null && (
                <Text style={styles.originalPrice}>
                  {formatCurrency(Math.round(originalPrice), currency, {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              )}
              <View style={styles.priceLine}>
                <Text style={styles.price}>
                  {formatCurrency(Math.round(price), currency, {
                    maximumFractionDigits: 0,
                  })}
                </Text>
                <Text style={styles.perNight}>{t('rooms.perNight')}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noPrice}>—</Text>
          )}
          <Button
            title={t('rooms.selectRoom')}
            onPress={handleSelect}
            disabled={!canSelect}
            style={styles.selectButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.white,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: colors.surface.soft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  promoBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xs,
    color: colors.onPrimary,
  },
  body: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  roomName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    color: colors.text.primary,
    lineHeight: 26,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  amenityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  capacityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amenityText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  priceBlock: {
    flex: 1,
    gap: 2,
  },
  priceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  originalPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  price: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    color: colors.primary,
  },
  perNight: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  noPrice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.muted,
  },
  selectButton: {
    paddingHorizontal: spacing.lg,
    height: 40,
  },
});
