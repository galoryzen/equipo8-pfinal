import React from 'react';
import { Stack } from 'expo-router';

import { colors, typography } from '@src/theme';

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
          fontFamily: typography.fontFamily.bold,
          color: colors.text.primary,
        },
      }}
    />
  );
}
