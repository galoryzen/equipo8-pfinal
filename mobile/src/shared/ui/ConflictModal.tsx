import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@src/shared/ui/Button';
import { colors, radius, shadows, spacing, typography } from '@src/theme';

export interface ConflictModalProps {
  visible: boolean;
  currentProperty: string;
  currentRoom: string;
  currentCheckin: string;
  currentCheckout: string;
  onReplace: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConflictModal({
  visible,
  currentProperty,
  currentRoom,
  currentCheckin,
  currentCheckout,
  onReplace,
  onCancel,
  loading = false,
}: ConflictModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{t('booking.cart.conflict.title')}</Text>
          <Text style={styles.body}>
            {currentProperty || currentRoom
              ? t('booking.cart.conflict.body', {
                  property: currentProperty || '—',
                  room: currentRoom || '—',
                  checkin: currentCheckin,
                  checkout: currentCheckout,
                })
              : t('booking.cart.conflict.bodyGeneric', {
                  checkin: currentCheckin,
                  checkout: currentCheckout,
                })}
          </Text>

          <View style={styles.row}>
            <Button
              title={t('booking.cart.conflict.cancel')}
              variant="outline"
              onPress={onCancel}
              disabled={loading}
              style={styles.flex}
            />
            <Button
              title={t('booking.cart.conflict.replace')}
              onPress={onReplace}
              loading={loading}
              style={styles.flex}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  flex: { flex: 1 },
});
