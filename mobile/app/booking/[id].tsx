import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Card } from '@src/shared/ui';
import { colors, radius, spacing, typography } from '@src/theme';
import { getBookingDetail } from '@src/services/booking-service';
import { getPropertyDetail } from '@src/features/catalog/catalog-service';
import type { BookingDetail } from '@src/types/booking';
import type {
  AmenitySummary,
  PropertyDetail,
  PropertyPolicyOut,
} from '@src/types/catalog';
import {
  formatBookingCode,
  isPastBookingForRebook,
  statusI18nKey,
} from '@src/features/bookings/bookings-helpers';
import {
  buildMailtoUrl,
  buildMapsUrl,
  buildPhoneUrl,
  formatTimeHM,
  houseRuleIcon,
  normalizeWebsite,
  visibleHouseRules,
} from '@src/features/bookings/booking-detail-actions';

export default function BookingDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const room = property?.room_types.find((rt) => rt.id === booking?.room_type_id);
  const mergedAmenities = useMergedAmenities(property?.amenities, room?.amenities);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await getBookingDetail(id);
        if (cancelled) return;
        setBooking(detail);
        try {
          const { detail: propDetail } = await getPropertyDetail(detail.property_id);
          if (!cancelled) setProperty(propDetail);
        } catch {
          if (!cancelled) setProperty(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = t('trips.detail.title');

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  if (error || !booking) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.muted} />
          <Text style={styles.errorText}>{t('trips.detail.loadError')}</Text>
        </View>
      </>
    );
  }

  const heroImage = property?.images
    ? [...property.images].sort((a, b) => a.display_order - b.display_order)[0]
    : undefined;
  const isPast = isPastBookingForRebook(booking, new Date());
  const statusLabel = t(statusI18nKey(booking.status));
  const checkInTime = formatTimeHM(property?.check_in_time);
  const checkOutTime = formatTimeHM(property?.check_out_time);

  const rules = property ? visibleHouseRules(property.policies) : [];
  const hasContact = !!(property?.phone || property?.email || property?.website);
  const isTerminalNonStay =
    booking.status === 'CANCELLED' || booking.status === 'REJECTED';

  const policyText = (() => {
    if (booking.policy_type_applied === 'FULL') return t('trips.detail.policyFull');
    if (booking.policy_type_applied === 'NON_REFUNDABLE')
      return t('trips.detail.policyNonRefundable');
    return t('trips.detail.policyPartial', {
      percent: booking.policy_refund_percent_applied ?? 0,
    });
  })();

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
        {heroImage ? (
          <Image source={{ uri: heroImage.url }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Ionicons name="bed-outline" size={48} color={colors.text.muted} />
          </View>
        )}

        <View style={styles.sections}>
          <Card style={styles.card}>
            <Text style={styles.label}>{t('trips.detail.lodging')}</Text>
            <Text style={styles.propertyName}>
              {property?.name ?? t('trips.card.unknownProperty')}
            </Text>
            {property?.city?.name ? (
              <Text style={styles.meta}>{property.city.name}</Text>
            ) : null}
            {room ? (
              <>
                <Text style={[styles.label, styles.spaced]}>
                  {t('trips.detail.roomType')}
                </Text>
                <Text style={styles.meta}>{room.name}</Text>
              </>
            ) : null}
            {property?.address ? (
              <>
                <Text style={[styles.label, styles.spaced]}>
                  {t('trips.detail.address')}
                </Text>
                <Text style={styles.meta}>{property.address}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.detail.openInMaps')}
                  onPress={() => Linking.openURL(buildMapsUrl(property.address!))}
                  style={({ pressed }) => [
                    styles.inlineAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={styles.inlineActionText}>
                    {t('trips.detail.openInMaps')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.label}>
              {isTerminalNonStay
                ? t('trips.detail.dates')
                : t('trips.detail.itinerary')}
            </Text>
            {isTerminalNonStay ? (
              <Text style={styles.value}>
                {booking.checkin} → {booking.checkout}
              </Text>
            ) : (
              <>
                <View style={styles.itineraryRow}>
                  <Ionicons
                    name="log-in-outline"
                    size={18}
                    color={colors.text.secondary}
                  />
                  <View style={styles.itineraryText}>
                    <Text style={styles.meta}>{t('trips.detail.checkIn')}</Text>
                    <Text style={styles.value}>
                      {booking.checkin}
                      {checkInTime ? ` · ${checkInTime}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.itineraryRow}>
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color={colors.text.secondary}
                  />
                  <View style={styles.itineraryText}>
                    <Text style={styles.meta}>{t('trips.detail.checkOut')}</Text>
                    <Text style={styles.value}>
                      {booking.checkout}
                      {checkOutTime ? ` · ${checkOutTime}` : ''}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <Text style={[styles.label, styles.spaced]}>{t('trips.detail.code')}</Text>
            <Text style={styles.value}>{formatBookingCode(booking.id)}</Text>

            <Text style={[styles.label, styles.spaced]}>{t('trips.detail.status')}</Text>
            <View style={[styles.statusPill, pillStyleFor(booking.status)]}>
              <Text style={[styles.statusText, pillTextStyleFor(booking.status)]}>
                {statusLabel}
              </Text>
            </View>

            <Text style={[styles.label, styles.spaced]}>{t('trips.detail.total')}</Text>
            <Text style={styles.value}>
              {booking.total_amount} {booking.currency_code}
            </Text>
          </Card>

          {hasContact ? (
            <Card style={styles.card}>
              <Text style={styles.label}>{t('trips.detail.contact')}</Text>
              <View style={styles.contactRow}>
                {property!.phone ? (
                  <ContactButton
                    icon="call-outline"
                    label={t('trips.detail.callHotel')}
                    onPress={() => Linking.openURL(buildPhoneUrl(property!.phone!))}
                  />
                ) : null}
                {property!.email ? (
                  <ContactButton
                    icon="mail-outline"
                    label={t('trips.detail.sendEmail')}
                    onPress={() => Linking.openURL(buildMailtoUrl(property!.email!))}
                  />
                ) : null}
                {property!.website ? (
                  <ContactButton
                    icon="globe-outline"
                    label={t('trips.detail.visitWebsite')}
                    onPress={() =>
                      Linking.openURL(normalizeWebsite(property!.website!))
                    }
                  />
                ) : null}
              </View>
            </Card>
          ) : null}

          {mergedAmenities.length > 0 ? (
            <Card style={styles.card}>
              <Text style={styles.label}>{t('trips.detail.amenities')}</Text>
              <View style={styles.amenitiesGrid}>
                {mergedAmenities.map((a) => (
                  <View key={a.code} style={styles.amenityItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.amenityText}>{a.name}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {rules.length > 0 ? (
            <Card style={styles.card}>
              <Text style={styles.label}>{t('trips.detail.houseRules')}</Text>
              {rules.map((rule) => (
                <HouseRuleRow key={rule.id} rule={rule} />
              ))}
            </Card>
          ) : null}

          <Card style={styles.card}>
            <Text style={styles.label}>{t('trips.detail.policy')}</Text>
            <Text style={styles.meta}>{policyText}</Text>
          </Card>

          {isPast ? (
            <Button
              title={t('trips.detail.rebook')}
              onPress={() => {
                if (!property) return;
                router.push({
                  pathname: '/search',
                  params: {
                    cityId: property.city.id,
                    cityName: property.city.name,
                    cityCountry: property.city.country,
                    ...(property.city.department
                      ? { cityDepartment: property.city.department }
                      : {}),
                    ...(room?.capacity
                      ? { guests: String(room.capacity) }
                      : {}),
                  },
                });
              }}
              disabled={!property}
              style={styles.rebookButton}
            />
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function useMergedAmenities(
  propertyAmenities: AmenitySummary[] | undefined,
  roomAmenities: AmenitySummary[] | undefined,
): AmenitySummary[] {
  return useMemo(() => {
    const seen = new Set<string>();
    const out: AmenitySummary[] = [];
    for (const a of [...(propertyAmenities ?? []), ...(roomAmenities ?? [])]) {
      if (seen.has(a.code)) continue;
      seen.add(a.code);
      out.push(a);
    }
    return out;
  }, [propertyAmenities, roomAmenities]);
}

function ContactButton({
  icon,
  label,
  onPress,
}: {
  icon: 'call-outline' | 'mail-outline' | 'globe-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.contactButtonText}>{label}</Text>
    </Pressable>
  );
}

function HouseRuleRow({ rule }: { rule: PropertyPolicyOut }) {
  const { t } = useTranslation();
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={houseRuleIcon(rule.category)}
        size={18}
        color={colors.text.secondary}
      />
      <View style={styles.ruleBody}>
        <Text style={styles.ruleCategory}>
          {t(`trips.detail.ruleCategory.${rule.category}`, rule.category)}
        </Text>
        <Text style={styles.meta}>{rule.description}</Text>
      </View>
    </View>
  );
}

function pillStyleFor(status: string) {
  if (status === 'CONFIRMED') return styles.pillSuccess;
  if (status === 'CANCELLED' || status === 'REJECTED') return styles.pillDanger;
  return styles.pillNeutral;
}

function pillTextStyleFor(status: string) {
  if (status === 'CONFIRMED') return styles.pillSuccessText;
  if (status === 'CANCELLED' || status === 'REJECTED') return styles.pillDangerText;
  return styles.pillNeutralText;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surface.white,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    textAlign: 'center',
  },
  hero: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface.soft,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sections: {
    padding: spacing.base,
    gap: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spaced: {
    marginTop: spacing.sm,
  },
  propertyName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  value: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  meta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  inlineActionText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.6,
  },
  itineraryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  itineraryText: {
    flex: 1,
    gap: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 4,
  },
  statusText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
  },
  pillSuccess: { backgroundColor: '#DCFCE7' },
  pillSuccessText: { color: '#166534' },
  pillDanger: { backgroundColor: '#FEE2E2' },
  pillDangerText: { color: '#991B1B' },
  pillNeutral: { backgroundColor: colors.surface.soft },
  pillNeutralText: { color: colors.text.secondary },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  contactButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.white,
  },
  contactButtonText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
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
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ruleBody: {
    flex: 1,
    gap: 2,
  },
  ruleCategory: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  rebookButton: {
    marginTop: spacing.md,
  },
});
