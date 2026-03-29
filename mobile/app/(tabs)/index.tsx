import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { Card, Button, DateRangePicker } from '@src/shared/ui';
import { useFeatured } from '@src/features/catalog/use-featured';
import { searchCities } from '@src/features/catalog/catalog-service';
import type { CityInfo } from '@src/types/catalog';

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDate();
  const month = date.toLocaleString('en', { month: 'short' });
  return `${month} ${day}`;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { destinations, properties, loading, error, retry } = useFeatured();

  // City autocomplete state
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CityInfo[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityInfo | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search input position for dropdown
  const searchInputRef = useRef<View>(null);
  const [dropdownTop, setDropdownTop] = useState(0);

  const measureSearchInput = useCallback(() => {
    searchInputRef.current?.measureInWindow((_x, y, _w, h) => {
      setDropdownTop(y + h + spacing.xs);
    });
  }, []);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [checkin, setCheckin] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<string | null>(null);

  const handleDatesConfirm = useCallback((ci: string, co: string) => {
    setCheckin(ci);
    setCheckout(co);
  }, []);

  const showDropdown = !selectedCity && citySuggestions.length > 0;

  // Debounced city search
  useEffect(() => {
    if (selectedCity || cityQuery.length < 2) {
      setCitySuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingCities(true);
      try {
        const cities = await searchCities(cityQuery);
        setCitySuggestions(cities);
      } catch {
        setCitySuggestions([]);
      } finally {
        setLoadingCities(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cityQuery, selectedCity]);

  const handleSelectCity = useCallback((city: CityInfo) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setCitySuggestions([]);
  }, []);

  const handleClearCity = useCallback(() => {
    setSelectedCity(null);
    setCityQuery('');
    setCitySuggestions([]);
  }, []);

  const dismissSuggestions = useCallback(() => {
    setCitySuggestions([]);
    setLoadingCities(false);
  }, []);

  const handleSearch = useCallback(() => {
    if (!selectedCity) return;
    router.push({
      pathname: '/(tabs)/search',
      params: {
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        cityCountry: selectedCity.country,
        cityDepartment: selectedCity.department ?? '',
        checkin: checkin ?? '',
        checkout: checkout ?? '',
      },
    });
  }, [selectedCity, router, checkin, checkout]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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

          <View ref={searchInputRef} onLayout={measureSearchInput} style={styles.searchInput}>
            <Ionicons name="search" size={20} color={colors.text.muted} />
            {selectedCity ? (
              <View style={styles.selectedCityRow}>
                <Text style={styles.selectedCityText} numberOfLines={1}>
                  {selectedCity.name}, {selectedCity.country}
                </Text>
                <Pressable
                  onPress={handleClearCity}
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected city"
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                </Pressable>
              </View>
            ) : (
              <TextInput
                placeholder={t('search.searchCity')}
                placeholderTextColor={colors.text.muted}
                value={cityQuery}
                onChangeText={setCityQuery}
                style={styles.cityTextInput}
              />
            )}
          </View>

          {loadingCities && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.inlineLoader} />
          )}

          <View style={styles.searchFiltersRow}>
            <Pressable
              style={[styles.filterChip, checkin && styles.filterChipActive]}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t('home.addDates')}
            >
              <Ionicons name="calendar-outline" size={16} color={checkin ? colors.primary : colors.text.secondary} />
              <Text style={[styles.filterValue, checkin && styles.filterValueActive]}>
                {checkin && checkout
                  ? `${formatShortDate(checkin)} - ${formatShortDate(checkout)}`
                  : t('home.addDates')}
              </Text>
            </Pressable>
            <Pressable style={styles.filterChip} accessibilityRole="button">
              <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.filterValue}>{t('home.addGuests')}</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.searchButton, !selectedCity && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={!selectedCity}
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
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/search',
                          params: {
                            cityId: dest.id,
                            cityName: dest.name,
                            cityCountry: dest.country,
                            cityDepartment: dest.department ?? '',
                            checkin: checkin ?? '',
                            checkout: checkout ?? '',
                          },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${dest.name}, ${dest.country}`}
                      accessibilityHint="Search this destination"
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

      {/* City suggestions — inline overlay, rendered last so it sits on top */}
      {showDropdown && (
        <>
          <Pressable
            style={styles.suggestionsBackdrop}
            onPress={dismissSuggestions}
          />
          <View style={[styles.suggestionsDropdown, { top: dropdownTop }]}>
            <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
              {citySuggestions.map((city) => (
                <Pressable
                  key={city.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectCity(city)}
                  accessibilityRole="button"
                  accessibilityLabel={`${city.name}, ${city.country}`}
                >
                  <Ionicons name="location-outline" size={18} color={colors.text.secondary} />
                  <View>
                    <Text style={styles.suggestionName}>{city.name}</Text>
                    <Text style={styles.suggestionDetail}>
                      {city.department ? `${city.department}, ` : ''}
                      {city.country}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      {/* Date Range Picker */}
      <DateRangePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDatesConfirm}
        initialCheckin={checkin ?? undefined}
        initialCheckout={checkout ?? undefined}
      />
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
  cityTextInput: {
    flex: 1,
    height: 44,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  selectedCityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectedCityText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  suggestionsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  suggestionsDropdown: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.surface.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    maxHeight: 280,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  suggestionName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  suggestionDetail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  inlineLoader: {
    marginTop: spacing.sm,
    alignSelf: 'center',
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
    paddingVertical: spacing.base,
    borderRadius: radius.md,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary10,
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
  filterValueActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.medium,
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
  searchButtonDisabled: {
    opacity: 0.5,
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
