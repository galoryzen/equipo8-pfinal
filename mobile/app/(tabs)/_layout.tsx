import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '@src/theme';
import { useAuth } from '@src/services/auth-context';
import { useCart } from '@src/features/booking/cart-context';

export default function TabLayout() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { hasActiveCart } = useCart();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tab.activeIcon,
        tabBarInactiveTintColor: colors.tab.inactiveIcon,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: 11,
        },
        tabBarStyle: {
          borderTopColor: colors.border.subtle,
        },
        headerTitleStyle: {
          fontFamily: typography.fontFamily.bold,
          color: colors.text.primary,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Search is accessed from Home, hide from tabs */}
      <Tabs.Screen
        name="search"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('tabs.trips'),
          headerTitle: t('trips.title'),
          href: isLoggedIn ? '/trips' : null,
          tabBarBadge: hasActiveCart ? 1 : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isLoggedIn ? t('tabs.profile') : t('profile.login'),
          headerTitle: isLoggedIn ? t('tabs.profile') : t('profile.login'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isLoggedIn ? 'person-outline' : 'log-in-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
