import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius, shadows } from '@src/theme';
import { Button, PriceBreakdownPanel, type SelectedRoomInfo } from '@src/shared/ui';
import { useProperty } from '@src/features/catalog/use-property';
import { calculateNights } from '@src/features/catalog/rate-breakdown';

const GALLERY_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = 280;

export default function RoomDetailScreen() {
  const {
    id,
    roomId,
    ratePlanId,
    unitPrice,
    originalUnitPrice,
    currency,
    promotionType,
    promotionValue,
    checkin,
    checkout,
  } = useLocalSearchParams<{
    id: string;
    roomId: string;
    ratePlanId: string;
    unitPrice: string;
    originalUnitPrice?: string;
    currency?: string;
    promotionType?: 'PERCENT' | 'FIXED';
    promotionValue?: string;
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>();
  const { t } = useTranslation();

  const { property, loading, error, retry } = useProperty(id!, {
    checkin,
    checkout,
  });

  const room = useMemo(
    () => property?.room_types.find((rt) => rt.id === roomId) ?? null,
    [property, roomId],
  );

  const nights = useMemo(
    () => (checkin && checkout ? calculateNights(checkin, checkout) : 0),
    [checkin, checkout],
  );

  const selection: SelectedRoomInfo | null = useMemo(() => {
    if (!room) return null;
    const price = Number(unitPrice);
    if (!Number.isFinite(price)) return null;
    const ratePlan = room.rate_plans.find((rp) => rp.id === ratePlanId);
    return {
      roomTypeId: room.id,
      ratePlanId: ratePlanId!,
      roomName: room.name,
      ratePlanName: ratePlan?.name ?? '',
      unitPrice: price,
      originalUnitPrice: originalUnitPrice ? Number(originalUnitPrice) : undefined,
      currencyCode: currency ?? 'USD',
      promotion:
        promotionType && promotionValue
          ? {
              discountType: promotionType,
              discountValue: Number(promotionValue),
            }
          : undefined,
    };
  }, [room, ratePlanId, unitPrice, originalUnitPrice, currency, promotionType, promotionValue]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t('rooms.detailTitle') }} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (error || !room) {
    return (
      <>
        <Stack.Screen options={{ title: t('rooms.detailTitle') }} />
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.text.muted} />
          <Text style={styles.errorText}>{error ?? t('common.error')}</Text>
          <Button title={t('common.retry')} onPress={retry} />
        </View>
      </>
    );
  }

  const galleryImages = [...room.images].sort(
    (a, b) => a.display_order - b.display_order,
  );

  return (
    <>
      <Stack.Screen options={{ title: t('rooms.detailTitle') }} />
      <View style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Gallery */}
          {galleryImages.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
            >
              {galleryImages.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.url }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                  accessibilityLabel={img.caption}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Ionicons name="bed-outline" size={60} color={colors.border.default} />
            </View>
          )}

          <View style={styles.content}>
            <Text style={styles.roomName}>{room.name}</Text>
            <View style={styles.capacityRow}>
              <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.capacityText}>
                {t('rooms.guestsCount', { count: room.capacity })}
              </Text>
            </View>

            {room.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('rooms.description')}</Text>
                <Text style={styles.descriptionText}>{room.description}</Text>
              </View>
            )}

            {room.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('rooms.amenities')}</Text>
                <View style={styles.amenitiesGrid}>
                  {room.amenities.map((a) => (
                    <View key={a.code} style={styles.amenityItem}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      <Text style={styles.amenityText}>{a.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selection && nights > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('rooms.priceBreakdown')}</Text>
                <PriceBreakdownPanel selection={selection} nights={nights} />
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={t('rooms.continueToBooking')}
            disabled
            // TODO SCRUM-123: conectar a flujo de carrito / revisión.
            onPress={undefined}
          />
        </View>
      </View>
    </>
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
  gallery: {
    height: GALLERY_HEIGHT,
    backgroundColor: colors.surface.soft,
  },
  galleryImage: {
    width: GALLERY_WIDTH,
    height: GALLERY_HEIGHT,
  },
  galleryPlaceholder: {
    height: GALLERY_HEIGHT,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  roomName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    color: colors.text.primary,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  capacityText: {
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
