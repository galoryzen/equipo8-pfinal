import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, type TextInputProps } from 'react-native';
import { colors, typography, spacing, radius } from '@src/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          focused && styles.focused,
          error && styles.error,
          props.editable === false && styles.disabledInput,
          style,
        ]}
        placeholderTextColor={colors.text.muted}
        accessibilityLabel={label ?? props.placeholder}
        accessibilityState={{
          disabled: props.editable === false,
        }}
        accessibilityHint={error ? error : undefined}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <Text style={styles.errorText} accessibilityLiveRegion="polite">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.base,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.surface.white,
  },
  focused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  error: {
    borderColor: colors.status.error,
  },
  disabledInput: {
    backgroundColor: colors.surface.soft,
    color: colors.text.muted,
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.status.error,
  },
});
