import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';

const PRICE_MIN = 0;
const PRICE_MAX = 1000;
const THUMB_SIZE = 24;

interface PriceRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (min?: number, max?: number) => void;
  initialMin?: number;
  initialMax?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function PriceRangePicker({
  visible,
  onClose,
  onConfirm,
  initialMin,
  initialMax,
}: PriceRangePickerProps) {
  const { t } = useTranslation();
  const [minVal, setMinVal] = useState(initialMin ?? PRICE_MIN);
  const [maxVal, setMaxVal] = useState(initialMax ?? PRICE_MAX);
  const trackWidth = useRef(0);
  const trackX = useRef(0);

  const toPosition = (price: number) =>
    trackWidth.current > 0
      ? ((price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * trackWidth.current
      : 0;

  const toPrice = (x: number) =>
    trackWidth.current > 0
      ? Math.round(
          ((x / trackWidth.current) * (PRICE_MAX - PRICE_MIN) + PRICE_MIN) / 5,
        ) * 5
      : PRICE_MIN;

  const minRef = useRef(minVal);
  const maxRef = useRef(maxVal);
  minRef.current = minVal;
  maxRef.current = maxVal;
  const startMinPos = useRef(0);
  const startMaxPos = useRef(0);

  const minPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMinPos.current = toPosition(minRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        const x = clamp(
          startMinPos.current + gesture.dx,
          0,
          toPosition(maxRef.current),
        );
        const price = clamp(toPrice(x), PRICE_MIN, maxRef.current);
        setMinVal(price);
      },
    }),
  ).current;

  const maxPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMaxPos.current = toPosition(maxRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        const x = clamp(
          startMaxPos.current + gesture.dx,
          toPosition(minRef.current),
          trackWidth.current,
        );
        const price = clamp(toPrice(x), minRef.current, PRICE_MAX);
        setMaxVal(price);
      },
    }),
  ).current;

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    trackX.current = e.nativeEvent.layout.x;
  }, []);

  const handleMinText = useCallback(
    (text: string) => {
      const num = parseInt(text, 10);
      if (!text) {
        setMinVal(PRICE_MIN);
        return;
      }
      if (!isNaN(num)) {
        setMinVal(clamp(num, PRICE_MIN, maxVal));
      }
    },
    [maxVal],
  );

  const handleMaxText = useCallback(
    (text: string) => {
      const num = parseInt(text, 10);
      if (!text) {
        setMaxVal(PRICE_MAX);
        return;
      }
      if (!isNaN(num)) {
        setMaxVal(clamp(num, minVal, PRICE_MAX));
      }
    },
    [minVal],
  );

  const handleConfirm = useCallback(() => {
    const min = minVal > PRICE_MIN ? minVal : undefined;
    const max = maxVal < PRICE_MAX ? maxVal : undefined;
    onConfirm(min, max);
    onClose();
  }, [minVal, maxVal, onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    setMinVal(initialMin ?? PRICE_MIN);
    setMaxVal(initialMax ?? PRICE_MAX);
    onClose();
  }, [onClose, initialMin, initialMax]);

  const leftPct = ((minVal - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const rightPct = ((maxVal - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('search.priceRange')}</Text>

            {/* Range slider */}
            <View style={styles.sliderContainer}>
              <View style={styles.track} onLayout={onTrackLayout}>
                {/* Active range highlight */}
                <View
                  style={[
                    styles.trackActive,
                    { left: `${leftPct}%`, right: `${100 - rightPct}%` },
                  ]}
                />
              </View>

              {/* Min thumb */}
              <View
                style={[styles.thumb, { left: `${leftPct}%` }]}
                {...minPan.panHandlers}
              />

              {/* Max thumb */}
              <View
                style={[styles.thumb, { left: `${rightPct}%` }]}
                {...maxPan.panHandlers}
              />
            </View>

            {/* Labels under slider */}
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>${PRICE_MIN}</Text>
              <Text style={styles.sliderLabel}>${PRICE_MAX}</Text>
            </View>

            {/* Text inputs for precision */}
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('search.minPrice')}</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={minVal > PRICE_MIN ? minVal.toString() : ''}
                    onChangeText={handleMinText}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.text.muted}
                    accessibilityLabel={t('search.minPrice')}
                  />
                </View>
              </View>

              <Text style={styles.separator}>—</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('search.maxPrice')}</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={maxVal < PRICE_MAX ? maxVal.toString() : ''}
                    onChangeText={handleMaxText}
                    keyboardType="numeric"
                    placeholder={PRICE_MAX.toString()}
                    placeholderTextColor={colors.text.muted}
                    accessibilityLabel={t('search.maxPrice')}
                  />
                </View>
              </View>
            </View>

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
                style={styles.confirmButton}
                onPress={handleConfirm}
                accessibilityRole="button"
                accessibilityLabel={t('common.confirm')}
              >
                <Text style={styles.confirmText}>{t('common.confirm')}</Text>
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
    marginBottom: spacing.lg,
  },
  sliderContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  track: {
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
  },
  trackActive: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.surface.white,
    borderWidth: 2,
    borderColor: colors.primary,
    marginLeft: -(THUMB_SIZE / 2),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sliderLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  currencySymbol: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    padding: 0,
  },
  separator: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.lg,
    color: colors.text.muted,
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
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
  confirmText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.base,
    color: colors.onPrimary,
  },
});
