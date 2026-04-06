import React, { useCallback, useState } from 'react';
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

interface GuestPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (guests: number) => void;
  initialGuests?: number;
}

const MIN_GUESTS = 1;
const MAX_GUESTS = 10;

export function GuestPicker({
  visible,
  onClose,
  onConfirm,
  initialGuests = 1,
}: GuestPickerProps) {
  const { t } = useTranslation();
  const [guests, setGuests] = useState(initialGuests);

  const decrement = useCallback(() => {
    setGuests((g) => Math.max(MIN_GUESTS, g - 1));
  }, []);

  const increment = useCallback(() => {
    setGuests((g) => Math.min(MAX_GUESTS, g + 1));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(guests);
    onClose();
  }, [guests, onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

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
            <Text style={styles.title}>{t('home.guests')}</Text>

            <View style={styles.counterRow}>
              <Pressable
                style={[styles.counterButton, guests <= MIN_GUESTS && styles.counterButtonDisabled]}
                onPress={decrement}
                disabled={guests <= MIN_GUESTS}
                accessibilityRole="button"
                accessibilityLabel={t('guests.decrease')}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={guests <= MIN_GUESTS ? colors.border.default : colors.text.primary}
                />
              </Pressable>

              <Text style={styles.counterValue} accessibilityLabel={`${guests} ${t('home.guests')}`}>
                {guests}
              </Text>

              <Pressable
                style={[styles.counterButton, guests >= MAX_GUESTS && styles.counterButtonDisabled]}
                onPress={increment}
                disabled={guests >= MAX_GUESTS}
                accessibilityRole="button"
                accessibilityLabel={t('guests.increase')}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={guests >= MAX_GUESTS ? colors.border.default : colors.text.primary}
                />
              </Pressable>
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
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonDisabled: {
    opacity: 0.4,
  },
  counterValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['2xl'],
    color: colors.text.primary,
    minWidth: 40,
    textAlign: 'center',
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
