import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import QRCode from "react-native-qrcode-svg";

import { Button, Card } from "@src/shared/ui";
import { colors, radius, spacing, typography } from "@src/theme";
import { canShowCheckInQr } from "@src/features/booking/check-in-eligibility";
import { useCheckInStatus } from "@src/features/booking/use-check-in-status";
import { formatBookingCode } from "@src/features/bookings/bookings-helpers";

export default function CheckInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, bookingDetail, error } = useCheckInStatus(id);

  const title = t("trips.checkIn.title");

  if (status === "loading" && !bookingDetail) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  if (status === "error" && !bookingDetail) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.text.muted}
          />
          <Text style={styles.bodyText}>{t("trips.detail.loadError")}</Text>
        </View>
      </>
    );
  }

  if (!bookingDetail) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.centerState}>
          <Text style={styles.bodyText}>{t("trips.detail.loadError")}</Text>
        </View>
      </>
    );
  }

  const isCheckedIn = status === "checked_in";
  const eligible = canShowCheckInQr(bookingDetail, new Date());
  const primaryGuestName = bookingDetail.guests?.find(
    (g) => g.is_primary,
  )?.full_name;
  const code = formatBookingCode(bookingDetail.id);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
        {isCheckedIn ? (
          <Card style={styles.card}>
            <View style={styles.successIconWrap}>
              <Ionicons
                name="checkmark-circle"
                size={72}
                color={colors.primary}
              />
            </View>
            <Text style={styles.successTitle}>
              {t("trips.checkIn.successTitle")}
            </Text>
            <Text style={styles.bodyText}>
              {t("trips.checkIn.successBodyGeneric")}
            </Text>
            <Button
              title={t("trips.checkIn.backToTrip")}
              onPress={() => router.back()}
              style={styles.backBtn}
            />
          </Card>
        ) : eligible ? (
          <Card style={styles.card}>
            <Text style={styles.label}>{t("trips.detail.code")}</Text>
            <Text style={styles.value}>{bookingDetail.id}</Text>
            {primaryGuestName ? (
              <>
                <Text style={[styles.label, styles.spaced]}>
                  {t("trips.detail.guests")}
                </Text>
                <Text style={styles.value}>{primaryGuestName}</Text>
              </>
            ) : null}
            <Text style={[styles.label, styles.spaced]}>
              {t("trips.detail.checkIn")}
            </Text>
            <Text style={styles.value}>{bookingDetail.checkin}</Text>

            <View style={styles.qrWrap}>
              <QRCode
                value={bookingDetail.id}
                size={220}
                backgroundColor="#ffffff"
              />
            </View>

            <Text style={styles.instructions}>
              {t("trips.checkIn.qrInstructions")}
            </Text>
            <View style={styles.waitingRow}>
              <ActivityIndicator color={colors.text.muted} size="small" />
              <Text style={styles.waitingText}>
                {t("trips.checkIn.waitingForHotel")}
              </Text>
            </View>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.bodyText}>
              {bookingDetail.status === "CONFIRMED"
                ? t("trips.checkIn.notYetAvailable", {
                    date: bookingDetail.checkin,
                  })
                : t("trips.checkIn.notEligible")}
            </Text>
            <Button
              title={t("trips.checkIn.backToTrip")}
              onPress={() => router.back()}
              style={styles.backBtn}
            />
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  scroll: {
    padding: spacing.base,
    gap: spacing.md,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surface.white,
  },
  card: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  spaced: {
    marginTop: spacing.sm,
  },
  qrWrap: {
    alignSelf: "center",
    padding: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  instructions: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  waitingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  bodyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    textAlign: "center",
  },
  successIconWrap: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  successTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  backBtn: {
    marginTop: spacing.md,
  },
});
