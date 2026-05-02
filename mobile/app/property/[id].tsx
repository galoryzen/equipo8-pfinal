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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, shadows } from '@src/theme';
import { Button, CartHeaderButton } from '@src/shared/ui';
import { useProperty } from '@src/features/catalog/use-property';
import { ReviewCard } from '@src/features/catalog/review-card';
import { RatingHeader } from '@src/features/catalog/rating-header';

const REVIEWS_PREVIEW_SIZE = 5;

export default function PropertyDetailScreen() {
  const { id, checkin, checkout, guests } = useLocalSearchParams<{
    id: string;
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { property, reviews, ratingAvg, loading, error, retry } = useProperty(
    id!,
    {
      checkin,
      checkout,
      reviewPageSize: REVIEWS_PREVIEW_SIZE,
    },
  );

  // Tint the cart icon white because the root Stack gives this screen a
  // transparent header that overlaps the hero image.
  const headerRight = () => <CartHeaderButton tint="#fff" />;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerRight }} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <Stack.Screen options={{ headerRight }} />
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.muted} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title={t('common.retry')} onPress={retry} />
        </View>
      </>
    );
  }

  const handleViewAvailability = () => {
    router.push({
      pathname: '/property/[id]/rooms',
      params: {
        id: id!,
        ...(checkin ? { checkin } : {}),
        ...(checkout ? { checkout } : {}),
        ...(guests ? { guests } : {}),
      },
    });
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerRight }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('property.reviews')}</Text>
            <RatingHeader
              ratingAvg={ratingAvg}
              reviewCount={reviews?.total ?? 0}
            />
            {reviews && reviews.items.length > 0 ? (
              <>
                {reviews.items.slice(0, REVIEWS_PREVIEW_SIZE).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
                {reviews.total > REVIEWS_PREVIEW_SIZE && (
                  <Button
                    variant="outline"
                    title={t('property.seeAllReviews', { count: reviews.total })}
                    onPress={() => router.push(`/property/${id}/reviews`)}
                    style={styles.seeAllButton}
                  />
                )}
              </>
            ) : (
              <Text style={styles.emptyReviews}>{t('property.noReviews')}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('property.viewAvailability')}
          onPress={handleViewAvailability}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  scrollContent: {
    paddingBottom: 96,
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
    paddingBottom: spacing.xl,
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
  seeAllButton: {
    marginTop: spacing.sm,
  },
  emptyReviews: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
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
});
