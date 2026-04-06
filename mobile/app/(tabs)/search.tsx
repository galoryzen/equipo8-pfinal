import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';
import { Card, Chip, GuestPicker } from '@src/shared/ui';
import { useSearch } from '@src/features/catalog/use-search';
import type { CityInfo } from '@src/types/catalog';

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const month = date.toLocaleString('en', { month: 'short' });
  return `${d} ${month}`;
}

const AMENITIES = [
  { code: 'FREE_WIFI', label: 'WiFi' },
  { code: 'POOL', label: 'Pool' },
  { code: 'SPA', label: 'Spa' },
  { code: 'GYM', label: 'Gym' },
  { code: 'PARKING', label: 'Parking' },
  { code: 'BREAKFAST', label: 'Breakfast' },
];

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    cityId?: string;
    cityName?: string;
    cityCountry?: string;
    cityDepartment?: string;
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>();

  const initialCity: CityInfo | null =
    params.cityId && params.cityName && params.cityCountry
      ? {
          id: params.cityId,
          name: params.cityName,
          country: params.cityCountry,
          department: params.cityDepartment || undefined,
        }
      : null;

  const initialGuests = params.guests ? parseInt(params.guests, 10) : undefined;

  const {
    selectedCity,
    results,
    loading,
    error,
    total,
    amenityFilters,
    toggleAmenity,
    checkin,
    checkout,
    guests,
    setGuests,
  } = useSearch(
    initialCity,
    params.checkin || undefined,
    params.checkout || undefined,
    initialGuests,
  );

  const [showFilters, setShowFilters] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with city name and filter toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          {selectedCity && (
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {selectedCity.name}, {selectedCity.country}
              </Text>
              {checkin && checkout && (
                <Text style={styles.headerDates}>
                  {formatShortDate(checkin)} - {formatShortDate(checkout)}
                  {` · ${t('search.guestsCount', { count: guests })}`}
                </Text>
              )}
            </View>
          )}
        </View>
        <Pressable
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
          accessibilityRole="button"
          accessibilityLabel={t('search.filters')}
          accessibilityState={{ expanded: showFilters }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showFilters ? colors.onPrimary : colors.text.secondary}
          />
        </Pressable>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>{t('home.guests')}</Text>
          <Pressable
            style={styles.guestChip}
            onPress={() => setShowGuestPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.addGuests')}
          >
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.guestChipText}>
              {t('search.guestsCount', { count: guests })}
            </Text>
          </Pressable>

          <Text style={[styles.filterLabel, { marginTop: spacing.md }]}>{t('search.amenities')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {AMENITIES.map((amenity) => (
              <Chip
                key={amenity.code}
                label={amenity.label}
                selected={amenityFilters.includes(amenity.code)}
                onPress={() => toggleAmenity(amenity.code)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.muted} />
          <Text style={styles.emptyStateText}>{error}</Text>
        </View>
      )}

      {/* Results count */}
      {!loading && !error && (
        <Text style={styles.resultsCount}>
          {total > 0
            ? t('search.results', { count: total })
            : t('search.noResults')}
        </Text>
      )}

      {/* No results */}
      {!loading && !error && total === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bed-outline" size={48} color={colors.text.muted} />
          <Text style={styles.emptyStateText}>{t('search.noResults')}</Text>
          <Text style={styles.emptyStateHint}>{t('search.noResultsHint')}</Text>
        </View>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
        >
          {results.map((property) => (
            <Card
              key={property.id}
              elevated
              onPress={() => router.push(`/property/${property.id}`)}
              accessibilityLabel={`${property.name}, ${property.city.name}. ${property.rating_avg} stars, ${property.review_count} reviews. $${property.min_price ?? '—'} per night. ${property.amenities.map((a) => a.name).join(', ')}`}
              accessibilityHint="View property details"
              style={styles.resultCard}
            >
              {property.image?.url ? (
                <Image
                  source={{ uri: property.image.url }}
                  style={styles.resultImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.resultImagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={colors.border.default} />
                </View>
              )}
              <View style={styles.resultInfo}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {property.name}
                </Text>
                <Text style={styles.resultCity}>
                  {property.city.name}, {property.city.country}
                </Text>
                <View style={styles.amenitiesRow}>
                  {property.amenities.slice(0, 3).map((a) => (
                    <View key={a.code} style={styles.miniChip}>
                      <Text style={styles.miniChipText}>{a.name}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.resultFooter}>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
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
        </ScrollView>
      )}
      {/* Guest Picker */}
      <GuestPicker
        visible={showGuestPicker}
        onClose={() => setShowGuestPicker(false)}
        onConfirm={setGuests}
        initialGuests={guests}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  headerDates: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  filtersContainer: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  filterLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  guestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary10,
    marginBottom: spacing.sm,
  },
  guestChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  chipRow: {
    gap: spacing.sm,
  },
  resultsCount: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
    paddingHorizontal: spacing.base,
  },
  emptyStateText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyStateHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    textAlign: 'center',
  },
  resultsList: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  resultCard: {
    padding: 0,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: 140,
  },
  resultImagePlaceholder: {
    height: 140,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    padding: spacing.md,
  },
  resultName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  resultCity: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  amenitiesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  miniChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.soft,
  },
  miniChipText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
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
