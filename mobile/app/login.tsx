import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CountryPicker, { type Country, type CountryCode } from 'react-native-country-picker-modal';
import { colors, typography, spacing, radius } from '@src/theme';
import { Button, Input } from '@src/shared/ui';
import { useAuth, AuthError, type AuthErrorCode } from '@src/services/auth-context';
import {
  hasErrors,
  validateAuthForm,
  type AuthFieldErrors,
  type AuthMode,
} from '@src/features/auth/validation';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('CO');
  const [country, setCountry] = useState<Country | null>(null);

  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (current: AuthMode): AuthFieldErrors =>
    validateAuthForm({ email, password, fullName, phone, countryCode }, current, t);

  const validateField = (field: keyof AuthFieldErrors) => {
    const all = validate(mode);
    setErrors((prev) => ({ ...prev, [field]: all[field] }));
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setErrors({});
    setFormError(null);
  };

  const handleSubmit = async () => {
    const validation = validate(mode);
    setErrors(validation);
    if (hasErrors(validation)) return;

    setSubmitting(true);
    setFormError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup({ fullName, email, password, phone, country_code: countryCode });
      }
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (e) {
      const code: AuthErrorCode = e instanceof AuthError ? e.code : 'UNKNOWN';
      setFormError(t(`profile.errors.${code}`));
    } finally {
      setSubmitting(false);
    }
  };

  const countryDisplay = country?.name
    ? typeof country.name === 'string'
      ? country.name
      : (country.name.common ?? countryCode)
    : countryCode;

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </Pressable>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>
              {mode === 'login' ? t('profile.login') : t('profile.signup')}
            </Text>

            {formError && (
              <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                <Text style={styles.errorBannerText}>{formError}</Text>
              </View>
            )}

            {mode === 'signup' && (
              <>
                <Input
                  label={t('profile.fullName')}
                  value={fullName}
                  onChangeText={setFullName}
                  onBlur={() => validateField('fullName')}
                  autoCapitalize="words"
                  error={errors.fullName}
                />
                <Input
                  label={t('profile.phone')}
                  value={phone}
                  onChangeText={setPhone}
                  onBlur={() => validateField('phone')}
                  keyboardType="phone-pad"
                  error={errors.phone}
                />
                <View style={styles.countryField}>
                  <Text style={styles.countryLabel}>{t('profile.country')}</Text>
                  <View style={[styles.countryControl, errors.country && styles.countryControlError]}>
                    <CountryPicker
                      countryCode={countryCode}
                      withFilter
                      withFlag
                      withCountryNameButton
                      withAlphaFilter
                      withCallingCode={false}
                      withEmoji
                      onSelect={(c: Country) => {
                        setCountry(c);
                        setCountryCode(c.cca2);
                        setErrors((prev) => ({ ...prev, country: undefined }));
                      }}
                    />
                    <Text style={styles.countryValue} accessibilityLabel={String(countryDisplay)}>
                      {countryCode}
                    </Text>
                  </View>
                  {errors.country && <Text style={styles.fieldError}>{errors.country}</Text>}
                </View>
              </>
            )}

            <Input
              label={t('profile.email')}
              value={email}
              onChangeText={setEmail}
              onBlur={() => validateField('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />
            <Input
              label={t('profile.password')}
              value={password}
              onChangeText={setPassword}
              onBlur={() => validateField('password')}
              secureTextEntry
              error={errors.password}
            />

            <Button
              title={t('profile.continueBtn')}
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
            />

            <Pressable onPress={switchMode} style={styles.switchMode} disabled={submitting}>
              <Text style={styles.switchText}>
                {mode === 'login' ? t('profile.noAccount') : t('profile.hasAccount')}{' '}
                <Text style={styles.switchLink}>
                  {mode === 'login' ? t('profile.signup') : t('profile.login')}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  flex: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  formContainer: {
    gap: spacing.base,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['2xl'],
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.status.error,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.status.errorText,
  },
  countryField: {
    gap: spacing.xs,
  },
  countryLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  countryControl: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surface.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryControlError: {
    borderColor: colors.status.error,
  },
  countryValue: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  fieldError: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    color: colors.status.error,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  switchText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  switchLink: {
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
  },
});
