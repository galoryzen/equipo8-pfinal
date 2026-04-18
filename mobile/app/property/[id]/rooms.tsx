import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '@src/theme';
import {
  Button,
  CartHeaderButton,
  RoomTypeCard,
  type SelectedRoomInfo,
} from '@src/shared/ui';
import { useProperty } from '@src/features/catalog/use-property';

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const month = date.toLocaleString('en', { month: 'short' });
  return `${month} ${d}`;
}

export default function SelectRoomScreen() {
  const { id, checkin, checkout, guests } = useLocalSearchParams<{
    id: string;
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>();
  const { t } = useTranslation();
  const router = useRouter();
  const hasDates = Boolean(checkin && checkout);
  const guestsCount = guests ? parseInt(guests, 10) : 0;
  const { property, loading, error, retry } = useProperty(id!, {
    checkin,
    checkout,
  });

  const handleSelect = (selection: SelectedRoomInfo) => {
    router.push({
      pathname: '/property/[id]/rooms/[roomId]',
      params: {
        id: id!,
        roomId: selection.roomTypeId,
        ratePlanId: selection.ratePlanId,
        unitPrice: String(selection.unitPrice),
        currency: selection.currencyCode,
        ...(selection.originalUnitPrice != null
          ? { originalUnitPrice: String(selection.originalUnitPrice) }
          : {}),
        ...(selection.promotion
          ? {
              promotionType: selection.promotion.discountType,
              promotionValue: String(selection.promotion.discountValue),
            }
          : {}),
        ...(checkin ? { checkin } : {}),
        ...(checkout ? { checkout } : {}),
        ...(guests ? { guests } : {}),
      },
    });
  };

  const datesLabel =
    checkin && checkout
      ? `${formatShortDate(checkin)} - ${formatShortDate(checkout)}`
      : null;
  const guestsLabel =
    guestsCount > 0 ? t('search.guestsCount', { count: guestsCount }) : null;
  const metaLabel = [datesLabel, guestsLabel].filter(Boolean).join(' · ');

  const renderHeader = () => (
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
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {property?.name ?? ''}
          </Text>
          {metaLabel.length > 0 && (
            <Text style={styles.headerDates} numberOfLines={1}>
              {metaLabel}
            </Text>
          )}
        </View>
      </View>
      <CartHeaderButton />
    </View>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          {renderHeader()}
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          {renderHeader()}
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.text.muted} />
            <Text style={styles.errorText}>{error}</Text>
            <Button title={t('common.retry')} onPress={retry} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const bookableRoomTypes = property.room_types.filter(
    (rt) => rt.rate_plans.length > 0,
  );
  const anyPriceAvailable = bookableRoomTypes.some((rt) =>
    rt.rate_plans.some((rp) => rp.min_price != null),
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + subtitle */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t('rooms.selectTitle')}</Text>
            <Text style={styles.subtitle}>{t('rooms.pricesIncludeTaxes')}</Text>
          </View>

          {!hasDates && (
            <Text style={styles.hintText}>{t('rooms.selectDatesHint')}</Text>
          )}
          {hasDates && !anyPriceAvailable && (
            <Text style={styles.hintText}>{t('rooms.noAvailability')}</Text>
          )}

          <View style={styles.roomList}>
            {bookableRoomTypes.map((room) => (
              <RoomTypeCard
                key={room.id}
                room={room}
                hasDates={hasDates}
                onSelect={handleSelect}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  headerDates: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  content: {
    padding: spacing.base,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  titleBlock: {
    gap: 2,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['2xl'],
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  hintText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  roomList: {
    gap: spacing.md,
  },
});
