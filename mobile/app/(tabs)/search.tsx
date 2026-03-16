import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';
import { Input, Card, Chip } from '@src/shared/ui';

const AMENITIES = ['WiFi', 'Pool', 'Spa', 'Gym', 'Parking', 'Breakfast'];

const MOCK_RESULTS = [
  {
    id: '1',
    name: 'Hotel Boutique San Blas',
    city: 'Cusco, Peru',
    rating: 4.8,
    reviewCount: 124,
    price: 85,
    amenities: ['WiFi', 'Breakfast', 'Spa'],
  },
  {
    id: '2',
    name: 'Casa del Mar Resort',
    city: 'Cartagena, Colombia',
    rating: 4.6,
    reviewCount: 89,
    price: 120,
    amenities: ['WiFi', 'Pool', 'Gym'],
  },
  {
    id: '3',
    name: 'Copacabana Palace',
    city: 'Río de Janeiro, Brazil',
    rating: 4.9,
    reviewCount: 256,
    price: 200,
    amenities: ['WiFi', 'Pool', 'Spa', 'Gym'],
  },
  {
    id: '4',
    name: 'Hotel Zócalo Central',
    city: 'Ciudad de México, Mexico',
    rating: 4.5,
    reviewCount: 178,
    price: 95,
    amenities: ['WiFi', 'Parking', 'Breakfast'],
  },
];

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search" size={20} color={colors.text.muted} />
          <Input
            placeholder={t('home.searchPlaceholder')}
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
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
          <Text style={styles.filterLabel}>{t('search.amenities')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {AMENITIES.map((amenity) => (
              <Chip
                key={amenity}
                label={amenity}
                selected={selectedAmenities.includes(amenity)}
                onPress={() => toggleAmenity(amenity)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results count */}
      <Text style={styles.resultsCount}>
        {t('search.results', { count: MOCK_RESULTS.length })}
      </Text>

      {/* Results */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultsList}
      >
        {MOCK_RESULTS.map((property) => (
          <Card
            key={property.id}
            elevated
            onPress={() => router.push(`/property/${property.id}`)}
            accessibilityLabel={`${property.name}, ${property.city}. ${property.rating} stars, ${property.reviewCount} reviews. $${property.price} per night. ${property.amenities.join(', ')}`}
            accessibilityHint="View property details"
            style={styles.resultCard}
          >
            <View style={styles.resultImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color={colors.border.default} />
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName} numberOfLines={1}>
                {property.name}
              </Text>
              <Text style={styles.resultCity}>{property.city}</Text>
              <View style={styles.amenitiesRow}>
                {property.amenities.slice(0, 3).map((a) => (
                  <View key={a} style={styles.miniChip}>
                    <Text style={styles.miniChipText}>{a}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.resultFooter}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {property.rating} ({property.reviewCount})
                  </Text>
                </View>
                <Text style={styles.priceText}>
                  ${property.price}
                  <Text style={styles.perNight}>{t('home.perNight')}</Text>
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.soft,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
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
  resultsList: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  resultCard: {
    padding: 0,
    overflow: 'hidden',
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
