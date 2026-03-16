# TravelHub Mobile

Expo SDK 55 + TypeScript + Expo Router

## Setup

```bash
npm install
npx expo start
```

> [!NOTE]
> Expo Go for SDK 55 is not yet available on the App Store / Play Store. Install it directly from the CLI:
> ```bash
> # Android (USB debugging enabled)
> npx expo install:client:android
> ```
> Or press `shift + a` in the Expo dev server to install it on a connected device.

## Structure

```
app/            # Screens (Expo Router file-based)
src/
  theme/        # Design tokens (colors, typography, spacing)
  i18n/         # en/es translations
  services/     # API client, auth context
  shared/ui/    # Button, Input, Card, Chip
  features/     # catalog, auth, booking, notifications
  types/        # TypeScript interfaces
```

## Stack

React Native, Expo Router, Axios, i18next, Plus Jakarta Sans
