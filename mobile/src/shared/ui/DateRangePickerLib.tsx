import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radius } from "@src/theme";

interface DateRangePickerLibProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (checkin: string, checkout: string) => void;
  initialCheckin?: string;
  initialCheckout?: string;
}

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMarkedDates(checkin: string | null, checkout: string | null) {
  const marked: Record<string, any> = {};

  if (!checkin) return marked;

  if (checkin && !checkout) {
    marked[checkin] = {
      startingDay: true,
      endingDay: true,
      color: colors.primary,
      textColor: colors.onPrimary,
    };
    return marked;
  }

  // Fill range
  const start = new Date(checkin + "T00:00:00");
  const end = new Date(checkout! + "T00:00:00");
  const current = new Date(start);

  while (current <= end) {
    const key = current.toISOString().split("T")[0];
    const isStart = key === checkin;
    const isEnd = key === checkout;

    marked[key] = {
      startingDay: isStart,
      endingDay: isEnd,
      color: isStart || isEnd ? colors.primary : colors.primary10,
      textColor: isStart || isEnd ? colors.onPrimary : colors.primary,
    };

    current.setDate(current.getDate() + 1);
  }

  return marked;
}

export function DateRangePickerLib({
  visible,
  onClose,
  onConfirm,
  initialCheckin,
  initialCheckout,
}: DateRangePickerLibProps) {
  const { t } = useTranslation();

  const [checkin, setCheckin] = useState<string | null>(initialCheckin ?? null);
  const [checkout, setCheckout] = useState<string | null>(
    initialCheckout ?? null,
  );

  const today = useMemo(() => getToday(), []);

  const handleDayPress = useCallback(
    (day: DateData) => {
      if (!checkin || (checkin && checkout)) {
        setCheckin(day.dateString);
        setCheckout(null);
      } else {
        if (day.dateString <= checkin) {
          setCheckin(day.dateString);
          setCheckout(null);
        } else {
          setCheckout(day.dateString);
        }
      }
    },
    [checkin, checkout],
  );

  const handleConfirm = useCallback(() => {
    if (checkin && checkout) {
      onConfirm(checkin, checkout);
      onClose();
    }
  }, [checkin, checkout, onConfirm, onClose]);

  const markedDates = useMemo(
    () => getMarkedDates(checkin, checkout),
    [checkin, checkout],
  );

  const canConfirm = checkin !== null && checkout !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t("home.selectDates")}</Text>

            <Calendar
              minDate={today}
              markingType="period"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                textDayFontFamily: typography.fontFamily.regular,
                textMonthFontFamily: typography.fontFamily.bold,
                textDayHeaderFontFamily: typography.fontFamily.medium,
                textDayFontSize: typography.fontSize.sm,
                textMonthFontSize: typography.fontSize.base,
                textDayHeaderFontSize: typography.fontSize.xs,
              }}
            />

            {/* Summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t("home.checkIn")}</Text>
                <Text style={styles.summaryValue}>{checkin ?? "—"}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t("home.checkOut")}</Text>
                <Text style={styles.summaryValue}>{checkout ?? "—"}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={styles.cancelButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("common.cancel")}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton,
                  !canConfirm && styles.confirmDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm}
                accessibilityRole="button"
                accessibilityLabel={t("common.confirm")}
              >
                <Text style={styles.confirmText}>{t("common.confirm")}</Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  confirmDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.onPrimary,
  },
});
