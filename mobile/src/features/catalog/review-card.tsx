import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, typography, spacing, radius } from '@src/theme';
import type { Review } from '@src/types/catalog';

interface ReviewCardProps {
  review: Review;
}

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function ReviewCard({ review }: ReviewCardProps) {
  const { t, i18n } = useTranslation();
  const stars = Math.max(0, Math.min(5, Math.round(review.rating)));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={colors.text.secondary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.user}>{t('property.guest')}</Text>
          <Text style={styles.date}>{formatDate(review.created_at, i18n.language)}</Text>
        </View>
        <View style={styles.rating}>
          {Array.from({ length: stars }).map((_, i) => (
            <Ionicons key={i} name="star" size={12} color={colors.status.warning} />
          ))}
        </View>
      </View>
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.soft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  user: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  date: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  rating: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
