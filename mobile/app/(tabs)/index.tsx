import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '@src/theme';
import { Card, Button } from '@src/shared/ui';
import { useFeatured } from '@src/features/catalog/use-featured';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { destinations, properties, loading, error, retry } = useFeatured();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>{t('app.name')}</Text>
            <Text style={styles.greeting}>{t('home.greeting')}</Text>
          </View>
          <Pressable
            onPress={toggleLanguage}
            style={styles.langButton}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.language')}: ${i18n.language.toUpperCase()}`}
            accessibilityHint="Toggles between English and Spanish"
          >
            <Ionicons name="globe-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.langText}>{i18n.language.toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* Search Card */}
        <View style={styles.searchCard}>
          <Text style={styles.searchCardTitle}>{t('home.planTrip')}</Text>
          <Text style={styles.searchCardSubtitle}>{t('home.planTripHint')}</Text>

          <Pressable
            style={styles.searchInput}
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel={t('home.searchPlaceholder')}
          >
            <Ionicons name="search" size={20} color={colors.text.muted} />
            <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
          </Pressable>

          <View style={styles.searchFiltersRow}>
            <Pressable style={styles.filterChip} accessibilityRole="button">
              <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
              <View>
                <Text style={styles.filterLabel}>{t('home.checkIn')}</Text>
                <Text style={styles.filterValue}>{t('home.addDates')}</Text>
              </View>
            </Pressable>
            <Pressable style={styles.filterChip} accessibilityRole="button">
              <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
              <View>
                <Text style={styles.filterLabel}>{t('home.guests')}</Text>
                <Text style={styles.filterValue}>{t('home.addGuests')}</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            style={styles.searchButton}
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel={t('home.search')}
          >
            <Ionicons name="search" size={18} color={colors.onPrimary} />
            <Text style={styles.searchButtonText}>{t('home.searchHotels')}</Text>
          </Pressable>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.text.muted} />
            <Text style={styles.errorText}>{error}</Text>
            <Button title={t('common.retry')} onPress={retry} variant="outline" />
          </View>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Popular Destinations */}
            {destinations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('home.popularDestinations')}</Text>
                <View style={styles.destinationsGrid}>
                  {destinations.map((dest) => (
                    <Pressable
                      key={dest.id}
                      style={styles.destinationCard}
                      onPress={() => router.push('/search')}
                      accessibilityRole="button"
                      accessibilityLabel={`${dest.name}, ${dest.country}`}
                      accessibilityHint="Search stays in this destination"
                    >
                      <Image
                        source={{ uri: dest.image_url }}
                        style={styles.destinationImage}
                        resizeMode="cover"
                      />
                      <View style={styles.destinationOverlay}>
                        <Text style={styles.destinationName}>{dest.name}</Text>
                        <Text style={styles.destinationCountry}>{dest.country}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Recommended */}
            {properties.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('home.recommended')}</Text>
                <View style={styles.recommendedList}>
                  {properties.map((property) => (
                    <Card
                      key={property.id}
                      elevated
                      onPress={() => router.push(`/property/${property.id}`)}
                      accessibilityLabel={`${property.name}, ${property.city.name}. ${property.rating_avg} stars, ${property.review_count} reviews. $${property.min_price} per night`}
                      accessibilityHint="View property details"
                      style={styles.propertyCard}
                    >
                      {property.image?.url ? (
                        <Image
                          source={{ uri: property.image.url }}
                          style={styles.propertyImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.propertyImagePlaceholder}>
                          <Ionicons name="image-outline" size={40} color={colors.border.default} />
                        </View>
                      )}
                      <View style={styles.propertyInfo}>
                        <Text style={styles.propertyName} numberOfLines={1}>
                          {property.name}
                        </Text>
                        <Text style={styles.propertyCity}>
                          {property.city.name}, {property.city.country}
                        </Text>
                        <View style={styles.propertyFooter}>
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color={colors.status.warning} />
                            <Text style={styles.ratingText}>
                              {property.rating_avg} ({property.review_count})
                            </Text>
                          </View>
                          {property.min_price != null && (
                            <Text style={styles.priceText}>
                              ${property.min_price}
                              <Text style={styles.perNight}>{t('home.perNight')}</Text>
                            </Text>
                          )}
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  appName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['2xl'],
    color: colors.primary,
  },
  greeting: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  langText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  searchCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchCardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  searchCardSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchPlaceholder: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  searchFiltersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  filterValue: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadows.ctaPrimary,
  },
  searchButtonText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.onPrimary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.base,
    paddingHorizontal: spacing.base,
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  destinationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  destinationCard: {
    width: '48%',
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  destinationImage: {
    width: '100%',
    height: '100%',
  },
  destinationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  destinationName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: '#FFFFFF',
  },
  destinationCountry: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  recommendedList: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  propertyCard: {
    padding: 0,
    overflow: 'hidden',
  },
  propertyImage: {
    width: '100%',
    height: 160,
  },
  propertyImagePlaceholder: {
    height: 160,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    padding: spacing.md,
  },
  propertyName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  propertyCity: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  priceText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.primary,
  },
  perNight: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
});
