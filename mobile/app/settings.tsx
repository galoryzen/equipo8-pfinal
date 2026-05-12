import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { usePreferences } from '@src/services/preferences-context';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@src/i18n/i18n';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@src/shared/utils/fx-rates';
import { colors, radius, spacing, typography } from '@src/theme';

interface RadioRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  hint?: string;
}

function RadioRow({ label, selected, onPress, hint }: RadioRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <View style={styles.radio}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {selected ? (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { locale, displayCurrency, setLocale, setDisplayCurrency } = usePreferences();

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        accessibilityLabel={t('settings.title')}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <Text style={styles.sectionHint}>{t('settings.languageHint')}</Text>
          <View style={styles.group}>
            {SUPPORTED_LOCALES.map((tag: SupportedLocale) => (
              <RadioRow
                key={tag}
                label={t(`settings.languages.${tag}`)}
                selected={locale === tag}
                onPress={() => {
                  void setLocale(tag);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.displayCurrency')}</Text>
          <Text style={styles.sectionHint}>{t('settings.displayCurrencyHint')}</Text>
          <View style={styles.group}>
            {SUPPORTED_CURRENCIES.map((code: SupportedCurrency) => (
              <RadioRow
                key={code}
                label={t(`settings.currencies.${code}`)}
                selected={displayCurrency === code}
                onPress={() => {
                  void setDisplayCurrency(code);
                }}
              />
            ))}
          </View>
          <Text style={styles.note}>{t('settings.approximateNote')}</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  content: {
    padding: spacing.base,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  sectionHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    lineHeight: 20,
  },
  group: {
    backgroundColor: colors.surface.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    minHeight: 48,
  },
  rowPressed: {
    backgroundColor: colors.surface.soft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rowLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  note: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
