import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows } from '@src/theme';

interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export function Card({
  children,
  elevated = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CardProps) {
  const cardStyle = [
    styles.base,
    elevated && shadows.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pressed: {
    opacity: 0.9,
  },
});