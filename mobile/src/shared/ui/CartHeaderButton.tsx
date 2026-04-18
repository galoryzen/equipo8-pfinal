import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useCart } from '@src/features/booking/cart-context';
import { colors, spacing } from '@src/theme';

/**
 * Shortcut to the checkout screen that surfaces an active cart from pages
 * outside the tabs group (where the bottom bar + Trips badge are hidden).
 * Returns null when there's no active cart so it stays invisible until needed.
 */
export function CartHeaderButton({ tint = colors.text.primary }: { tint?: string }) {
  const router = useRouter();
  const { hasActiveCart } = useCart();

  if (!hasActiveCart) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open reservation in progress"
      onPress={() => router.push('/booking/checkout')}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      hitSlop={8}
    >
      <Ionicons name="cart-outline" size={24} color={tint} />
      <View style={styles.badge} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface.white,
  },
});
