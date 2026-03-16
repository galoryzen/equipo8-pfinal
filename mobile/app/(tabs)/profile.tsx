import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@src/theme';
import { Button } from '@src/shared/ui';
import { useAuth } from '@src/services/auth-context';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="person-circle-outline" size={80} color={colors.border.default} />
          <Text style={styles.loginPrompt}>{t('profile.noAccount')}</Text>
          <Button
            title={t('profile.login')}
            onPress={() => router.push('/login')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0).toUpperCase() ?? 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.fullName}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Button
          title={t('profile.logout')}
          variant="outline"
          onPress={() => {
            logout();
            router.replace('/welcome');
          }}
          style={styles.logoutButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  loginPrompt: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 32,
    color: colors.primary,
  },
  userName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    color: colors.text.primary,
  },
  userEmail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  logoutButton: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.xl,
  },
});
