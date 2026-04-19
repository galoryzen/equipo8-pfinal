import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '@src/theme';
import { Button } from '@src/shared/ui';
import { useCart } from '@src/features/booking/cart-context';
import { useCountdown } from '@src/features/booking/use-countdown';
import { BookingCard } from '@src/features/bookings/booking-card';
import { useMyBookings } from '@src/features/bookings/use-my-bookings';

export default function TripsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const { cart } = useCart();
  const countdown = useCountdown(cart?.hold_expires_at ?? null);

  const scope = activeTab === 'upcoming' ? 'active' : 'past';
  const { bookings, loading, error, refetch } = useMyBookings(scope);

  const hasCart = !!cart && !countdown.expired;
  const showBigEmpty =
    !loading && !error && bookings.length === 0 && !hasCart && activeTab === 'upcoming';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {hasCart && (
        <View style={styles.inProgressWrap}>
          <Text style={styles.inProgressTitle}>{t('trips.inProgress.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('trips.inProgress.continueCta')}
            onPress={() => router.push('/booking/checkout')}
            style={({ pressed }) => [styles.inProgressCard, pressed && styles.pressed]}
          >
            {cart!.image_url ? (
              <Image source={{ uri: cart!.image_url }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="bed-outline" size={28} color={colors.text.secondary} />
              </View>
            )}
            <View style={styles.inProgressText}>
              <Text numberOfLines={1} style={styles.inProgressProperty}>{cart!.property_name}</Text>
              <Text numberOfLines={1} style={styles.inProgressRoom}>{cart!.room_name}</Text>
              <Text style={styles.inProgressDates}>{cart!.checkin} → {cart!.checkout}</Text>
              <View style={styles.countdownRow}>
                <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.countdownText}>
                  {t('trips.inProgress.countdown', { label: countdown.label })}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </Pressable>
        </View>
      )}

      <View style={styles.tabSwitcher}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'upcoming' }}
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}
          >
            {t('trips.upcoming')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'past' }}
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}
          >
            {t('trips.past')}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.muted} />
          <Text style={styles.errorText}>{t('trips.loadError')}</Text>
          <Button title={t('common.retry')} onPress={refetch} style={styles.retryButton} />
        </View>
      ) : bookings.length > 0 ? (
        <View style={styles.list}>
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onPress={() =>
                router.push({ pathname: '/booking/[id]', params: { id: b.id } })
              }
            />
          ))}
        </View>
      ) : showBigEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={64} color={colors.border.default} />
          <Text style={styles.emptyTitle}>{t('trips.noTrips')}</Text>
          <Text style={styles.emptyHint}>{t('trips.noTripsHint')}</Text>
          <Button
            title={t('trips.explore')}
            onPress={() => router.push('/')}
            style={styles.exploreButton}
          />
        </View>
      ) : (
        <View style={styles.centerState}>
          <Text style={styles.emptyHint}>
            {activeTab === 'upcoming' ? t('trips.noUpcoming') : t('trips.noPast')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  inProgressWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  inProgressTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inProgressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.9,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.soft,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inProgressText: {
    flex: 1,
    gap: 2,
  },
  inProgressProperty: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  inProgressRoom: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  inProgressDates: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  countdownText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    backgroundColor: colors.surface.soft,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface.white,
  },
  tabText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  centerState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  loadingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  emptyHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  exploreButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
