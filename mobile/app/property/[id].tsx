import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';
import { Button } from '@src/shared/ui';
import { useProperty } from '@src/features/catalog/use-property';

const MOCK_REVIEWS = [
  {
    id: '1',
    user_name: 'María G.',
    rating: 5,
    comment: 'Absolutely stunning hotel! The staff was incredibly welcoming and the breakfast was delicious.',
    created_at: '2025-12-15',
  },
  {
    id: '2',
    user_name: 'John D.',
    rating: 4,
    comment: 'Great location and beautiful rooms. The spa was a wonderful surprise.',
    created_at: '2025-11-28',
  },
  {
    id: '3',
    user_name: 'Ana L.',
    rating: 5,
    comment: 'Best hotel experience in Cusco. Will definitely come back!',
    created_at: '2025-11-10',
  },
];

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { property, loading, error, retry } = useProperty(id!);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.text.muted} />
        <Text style={styles.errorText}>{error}</Text>
        <Button title={t('common.retry')} onPress={retry} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Placeholder */}
      <View style={styles.imagePlaceholder}>
        <Ionicons name="image-outline" size={60} color={colors.border.default} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.locationText}>
                {property.city.name}, {property.city.country}
              </Text>
            </View>
          </View>
        </View>

        {/* Description — connected to backend */}
        {property.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('property.description')}</Text>
            <Text
              style={styles.descriptionText}
              numberOfLines={showFullDescription ? undefined : 3}
            >
              {property.description}
            </Text>
            <Pressable onPress={() => setShowFullDescription(!showFullDescription)}>
              <Text style={styles.showMoreText}>
                {showFullDescription ? t('property.showLess') : t('property.showMore')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Amenities — connected to backend */}
        {property.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('property.amenities')}</Text>
            <View style={styles.amenitiesGrid}>
              {property.amenities.map((amenity) => (
                <View key={amenity.code} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={styles.amenityText}>{amenity.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews (mock por ahora) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('property.reviews')}</Text>
          {MOCK_REVIEWS.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>{review.user_name}</Text>
                <View style={styles.reviewRating}>
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Ionicons key={i} name="star" size={12} color="#F59E0B" />
                  ))}
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              <Text style={styles.reviewDate}>{review.created_at}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Button
          title={t('property.viewAvailability')}
          onPress={() => {
            // TODO: navigate to room selection
          }}
          style={styles.ctaButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.base,
    backgroundColor: colors.surface.white,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  imagePlaceholder: {
    height: 280,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  propertyName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    color: colors.text.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  locationText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  ratingText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  reviewCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  showMoreText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '45%',
  },
  amenityText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  reviewCard: {
    backgroundColor: colors.surface.soft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reviewUser: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  reviewDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
  ctaButton: {
    marginTop: spacing.lg,
  },
});
