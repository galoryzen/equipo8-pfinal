import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, typography, spacing } from '@src/theme';

interface RatingHeaderProps {
  ratingAvg: number | null;
  reviewCount: number;
}

export function RatingHeader({ ratingAvg, reviewCount }: RatingHeaderProps) {
  const { t } = useTranslation();

  if (ratingAvg == null) {
    return (
      <View style={styles.row}>
        <Text style={styles.noRating}>{t('property.noRating')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Ionicons name="star" size={20} color={colors.status.warning} />
      <Text style={styles.avg}>{ratingAvg.toFixed(1)}</Text>
      <Text style={styles.count}>
        {' · '}
        {t('property.reviewsCount', { count: reviewCount })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avg: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  count: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  noRating: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
