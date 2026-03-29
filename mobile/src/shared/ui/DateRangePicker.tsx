import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';

interface DateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (checkin: string, checkout: string) => void;
  initialCheckin?: string;
  initialCheckout?: string;
}

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function DateRangePicker({
  visible,
  onClose,
  onConfirm,
  initialCheckin,
  initialCheckout,
}: DateRangePickerProps) {
  const { i18n, t } = useTranslation();
  const isEs = i18n.language === 'es';

  const [currentYear, setCurrentYear] = useState(() => {
    if (initialCheckin) return parseISO(initialCheckin).getFullYear();
    return new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialCheckin) return parseISO(initialCheckin).getMonth();
    return new Date().getMonth();
  });

  const [checkin, setCheckin] = useState<Date | null>(
    initialCheckin ? parseISO(initialCheckin) : null,
  );
  const [checkout, setCheckout] = useState<Date | null>(
    initialCheckout ? parseISO(initialCheckout) : null,
  );

  const today = useMemo(() => getToday(), []);
  const weekdays = isEs ? WEEKDAYS_ES : WEEKDAYS_EN;
  const months = isEs ? MONTHS_ES : MONTHS_EN;

  const canGoPrev = useMemo(() => {
    return currentYear > today.getFullYear() || currentMonth > today.getMonth();
  }, [currentYear, currentMonth, today]);

  const goNext = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth, canGoPrev]);

  // Build grid: array of 6 rows x 7 cols (null for empty cells)
  const days = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const grid: (Date | null)[][] = [];
    let day = 1;

    for (let row = 0; row < 6; row++) {
      const week: (Date | null)[] = [];
      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < firstDay) {
          week.push(null);
        } else if (day > daysInMonth) {
          week.push(null);
        } else {
          week.push(new Date(currentYear, currentMonth, day));
          day++;
        }
      }
      grid.push(week);
    }
    return grid;
  }, [currentYear, currentMonth]);

  const handleDayPress = useCallback(
    (date: Date) => {
      if (isBefore(date, today)) return;

      if (!checkin || (checkin && checkout)) {
        // Start new selection
        setCheckin(date);
        setCheckout(null);
      } else {
        // Have check-in, selecting check-out
        if (isBefore(date, checkin) || isSameDay(date, checkin)) {
          // Tapped before or same as check-in: reset
          setCheckin(date);
          setCheckout(null);
        } else {
          setCheckout(date);
        }
      }
    },
    [checkin, checkout, today],
  );

  const handleConfirm = useCallback(() => {
    if (checkin && checkout) {
      onConfirm(formatISO(checkin), formatISO(checkout));
      onClose();
    }
  }, [checkin, checkout, onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const getDayStyle = useCallback(
    (date: Date) => {
      const disabled = isBefore(date, today);
      const isCheckin = checkin && isSameDay(date, checkin);
      const isCheckout = checkout && isSameDay(date, checkout);
      const inRange =
        checkin &&
        checkout &&
        date.getTime() > checkin.getTime() &&
        date.getTime() < checkout.getTime();

      return { disabled, isCheckin, isCheckout, inRange };
    },
    [checkin, checkout, today],
  );

  const canConfirm = checkin !== null && checkout !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <TouchableWithoutFeedback><View style={styles.sheet}>
          {/* Title */}
          <Text style={styles.title}>{t('home.selectDates')}</Text>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <Pressable
              onPress={goPrev}
              disabled={!canGoPrev}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={8}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={canGoPrev ? colors.text.primary : colors.border.default}
              />
            </Pressable>
            <Text style={styles.monthLabel}>
              {months[currentMonth]} {currentYear}
            </Text>
            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekRow}>
            {weekdays.map((wd) => (
              <Text key={wd} style={styles.weekdayLabel}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Day Grid */}
          {days.map((week, rowIdx) => (
            <View key={rowIdx} style={styles.weekRow}>
              {week.map((date, colIdx) => {
                if (!date) {
                  return <View key={colIdx} style={styles.dayCell} />;
                }
                const { disabled, isCheckin, isCheckout, inRange } =
                  getDayStyle(date);
                const isEndpoint = isCheckin || isCheckout;

                return (
                  <View
                    key={colIdx}
                    style={[
                      styles.dayCell,
                      inRange && styles.dayCellInRange,
                      (isCheckin && checkout) && styles.dayCellRangeStart,
                      isCheckout && styles.dayCellRangeEnd,
                    ]}
                  >
                    {isCheckin && checkout && (
                      <View style={[styles.rangeHalf, styles.rangeHalfRight]} />
                    )}
                    {isCheckout && (
                      <View style={[styles.rangeHalf, styles.rangeHalfLeft]} />
                    )}
                    <Pressable
                      style={[
                        styles.dayCircle,
                        isEndpoint && styles.dayCircleSelected,
                      ]}
                      onPress={() => handleDayPress(date)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel={`${date.getDate()} ${months[date.getMonth()]}`}
                      accessibilityState={{ disabled, selected: !!isEndpoint }}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          disabled && styles.dayTextDisabled,
                          isEndpoint && styles.dayTextSelected,
                          inRange && styles.dayTextInRange,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Selection Summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('home.checkIn')}</Text>
              <Text style={styles.summaryValue}>
                {checkin ? formatISO(checkin) : '—'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('home.checkOut')}</Text>
              <Text style={styles.summaryValue}>
                {checkout ? formatISO(checkout) : '—'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !canConfirm && styles.confirmDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
              accessibilityRole="button"
              accessibilityLabel={t('common.confirm')}
            >
              <Text style={styles.confirmText}>{t('common.confirm')}</Text>
            </Pressable>
          </View>
        </View></TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}

const DAY_SIZE = 40;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
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
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  dayCell: {
    flex: 1,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInRange: {
    backgroundColor: colors.primary10,
  },
  dayCellRangeStart: {
    overflow: 'hidden',
  },
  dayCellRangeEnd: {
    overflow: 'hidden',
  },
  rangeHalf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: colors.primary10,
  },
  rangeHalfRight: {
    right: 0,
  },
  rangeHalfLeft: {
    left: 0,
  },
  dayCircle: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DAY_SIZE / 2,
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  dayTextDisabled: {
    color: colors.border.default,
  },
  dayTextSelected: {
    color: colors.onPrimary,
    fontFamily: typography.fontFamily.bold,
  },
  dayTextInRange: {
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
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
