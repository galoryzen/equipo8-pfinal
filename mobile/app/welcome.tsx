import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors, typography, spacing, radius } from "@src/theme";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Center content */}
      <View style={styles.content} accessible={true} accessibilityLabel={`${t("app.name")}. ${t("welcome.subtitle")}`}>
        <View style={styles.iconContainer} accessibilityElementsHidden={true}>
          <Ionicons name="globe-outline" size={72} color={colors.primary} />
          <View style={styles.searchIconOverlay}>
            <Ionicons name="search" size={26} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.appName}>{t("app.name")}</Text>
        <Text style={styles.subtitle}>{t("welcome.subtitle")}</Text>
      </View>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.replace("/(tabs)")}
          accessibilityRole="button"
          accessibilityLabel={t("welcome.searchStays")}
        >
          <Ionicons name="search" size={18} color={colors.onPrimary} />
          <Text style={styles.searchButtonText}>
            {t("welcome.searchStays")}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/login")}
          style={styles.loginLink}
          accessibilityRole="button"
          accessibilityLabel={t("welcome.loginSignup")}
        >
          <Text style={styles.loginLinkText}>{t("welcome.loginSignup")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.white,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  searchIconOverlay: {
    position: "absolute",
    bottom: 12,
    right: 8,
    backgroundColor: colors.surface.white,
    borderRadius: radius.full,
    padding: 3,
  },
  appName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 48,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.base,
    alignItems: "center",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  searchButtonText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.base,
    color: colors.onPrimary,
  },
  loginLink: {
    paddingVertical: spacing.md,
  },
  loginLinkText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
