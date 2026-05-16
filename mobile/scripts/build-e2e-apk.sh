#!/usr/bin/env bash
# Build the standalone Android APK that CI installs for Maestro.
# Output: mobile/e2e/app-debug.apk
#
# Idempotent — safe to re-run after any mobile/ change.
#
# We build the RELEASE variant because React Native's gradle plugin only
# embeds the JS bundle into release APKs by default. Debug APKs expect
# Metro to serve JS at runtime, which doesn't exist in CI. Expo's prebuild
# template signs release with the debug keystore when no release keystore
# is configured, so this is safe locally and in CI.

set -euo pipefail

# Resolve mobile/ dir relative to this script so it works from anywhere.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
MOBILE_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$MOBILE_DIR"

# Pinned URL — 10.0.2.2 is the host loopback from inside an Android emulator.
# CI uses this; local emulator runs use this. Physical devices need their own build.
export EXPO_PUBLIC_API_URL="http://10.0.2.2:8080"

echo "==> Regenerating android/ via expo prebuild"
npx expo prebuild --platform android --clean

echo "==> Building release APK (Gradle — bundles JS automatically)"
( cd android && ./gradlew :app:assembleRelease )

# RN release APK lands here when no custom signing is configured.
SRC_APK="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$SRC_APK" ]; then
  # Some templates emit *-unsigned.apk when release signing isn't set up.
  SRC_APK="android/app/build/outputs/apk/release/app-release-unsigned.apk"
fi
if [ ! -f "$SRC_APK" ]; then
  echo "✗ No release APK at expected paths under android/app/build/outputs/apk/release/"
  ls -la android/app/build/outputs/apk/release/ 2>/dev/null || true
  exit 1
fi

echo "==> Copying APK to e2e/ for commit (renamed app-debug.apk for CI compatibility)"
mkdir -p e2e
cp "$SRC_APK" e2e/app-debug.apk

# Sanity check: confirm the JS bundle is inside the APK.
# (Capture the listing first to avoid a SIGPIPE/pipefail false negative when
# `grep -q` short-circuits the pipe.)
APK_LISTING=$(unzip -l e2e/app-debug.apk)
if echo "$APK_LISTING" | grep -q "assets/index.android.bundle"; then
  echo "✓ APK ready at mobile/e2e/app-debug.apk ($(du -h e2e/app-debug.apk | cut -f1))"
  echo "  - JS bundle embedded — APK is standalone, no Metro needed"
  echo "  Commit it: git add mobile/e2e/app-debug.apk"
else
  echo "✗ APK does NOT contain index.android.bundle"
  echo "  Contents that match 'bundle' or 'assets/':"
  echo "$APK_LISTING" | grep -E "(bundle|assets/)" | head -20
  exit 1
fi
