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
import { colors, typography, spacing } from '@src/theme';
import { Button, Input } from '@src/shared/ui';
import { useAuth } from '@src/services/auth-context';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    if (mode === 'login') {
      await login(email, password);
    } else {
      await signup({ fullName, email, password, phone });
    }
    router.dismissAll();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
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

            {mode === 'signup' && (
              <>
                <Input
                  label={t('profile.fullName')}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <Input
                  label={t('profile.phone')}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </>
            )}

            <Input
              label={t('profile.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label={t('profile.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title={t('profile.continueBtn')}
              onPress={handleSubmit}
              style={styles.submitButton}
            />

            <Pressable
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={styles.switchMode}
            >
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
