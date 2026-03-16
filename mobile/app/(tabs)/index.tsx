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
import { colors, typography, spacing, radius, shadows } from '@src/theme';
import { Card } from '@src/shared/ui';

const POPULAR_DESTINATIONS = [
  { id: '1', name: 'Cusco', country: 'Peru', emoji: '🇵🇪' },
  { id: '2', name: 'Río de Janeiro', country: 'Brazil', emoji: '🇧🇷' },
  { id: '3', name: 'Cartagena', country: 'Colombia', emoji: '🇨🇴' },
  { id: '4', name: 'Ciudad de México', country: 'Mexico', emoji: '🇲🇽' },
];

const MOCK_RECOMMENDED = [
  {
    id: '1',
    name: 'Hotel Boutique San Blas',
    city: 'Cusco',
    rating: 4.8,
    reviewCount: 124,
    price: 85,
    currency: 'USD',
  },
  {
    id: '2',
    name: 'Casa del Mar Resort',
    city: 'Cartagena',
    rating: 4.6,
    reviewCount: 89,
    price: 120,
    currency: 'USD',
  },
  {
    id: '3',
    name: 'Copacabana Palace',
    city: 'Río de Janeiro',
    rating: 4.9,
    reviewCount: 256,
    price: 200,
    currency: 'USD',
  },
];

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

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

        {/* Search Bar */}
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={t('home.searchPlaceholder')}
        >
          <Ionicons name="search" size={20} color={colors.text.muted} />
          <Text style={styles.searchPlaceholder}>
            {t('home.searchPlaceholder')}
          </Text>
        </Pressable>

        {/* Popular Destinations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.popularDestinations')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationsRow}
          >
            {POPULAR_DESTINATIONS.map((dest) => (
              <Pressable
                key={dest.id}
                style={styles.destinationChip}
                onPress={() => router.push('/search')}
                accessibilityRole="button"
                accessibilityLabel={`${dest.name}, ${dest.country}`}
                accessibilityHint="Search stays in this destination"
              >
                <Text style={styles.destinationEmoji}>{dest.emoji}</Text>
                <Text style={styles.destinationName}>{dest.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recommended */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.recommended')}</Text>
          <View style={styles.recommendedList}>
            {MOCK_RECOMMENDED.map((property) => (
              <Card
                key={property.id}
                elevated
                onPress={() => router.push(`/property/${property.id}`)}
                accessibilityLabel={`${property.name}, ${property.city}. ${property.rating} stars, ${property.reviewCount} reviews. $${property.price} per night`}
                accessibilityHint="View property details"
                style={styles.propertyCard}
              >
                <View style={styles.propertyImagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={colors.border.default} />
                </View>
                <View style={styles.propertyInfo}>
                  <Text style={styles.propertyName} numberOfLines={1}>
                    {property.name}
                  </Text>
                  <Text style={styles.propertyCity}>{property.city}</Text>
                  <View style={styles.propertyFooter}>
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
          </View>
        </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    paddingHorizontal: spacing.base,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchPlaceholder: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.muted,
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
  destinationsRow: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  destinationEmoji: {
    fontSize: 18,
  },
  destinationName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  recommendedList: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  propertyCard: {
    padding: 0,
    overflow: 'hidden',
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
