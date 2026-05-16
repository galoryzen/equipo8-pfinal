# Mobile E2E — Maestro

End-to-end tests for the TravelHub mobile app. Covers OBJ-005 from the testing strategy: one critical mobile flow (search → booking → trips).

## Prerequisites

1. **Install Maestro CLI** (one-time, host machine):

   ```bash
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   # binary lands at ~/.maestro/bin/maestro
   ```

2. **Backend running** with seed data:

   ```bash
   cd backend && docker compose up -d
   # waits ~30s for healthchecks; seeds load on first boot from db/03-seed.sql
   ```

3. **App built and installed** on the target device/emulator with the API URL pointing at your local gateway:

   ```bash
   # Android emulator → host
   cd mobile
   EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 npx expo run:android
   ```

   For a physical device, use your LAN IP (`http://192.168.x.x:8080`) and make sure the device can reach it.

## Running

```bash
cd mobile
~/.maestro/bin/maestro test .maestro/flows/
```

To run a single flow:

```bash
~/.maestro/bin/maestro test .maestro/flows/search-book-trips.yaml
```

To override the seeded test user / property:

```bash
~/.maestro/bin/maestro test .maestro/flows/search-book-trips.yaml \
  -e TEST_EMAIL=maria@example.com \
  -e TEST_CITY=Bogotá
```

## Layout

```
.maestro/
├── config.yaml                       # shared app id + comments
├── helpers/
│   └── login.yaml                    # reusable subflow (welcome → login → tabs)
└── flows/
    └── search-book-trips.yaml        # OBJ-005 critical flow
```

## Test data

The flow targets seed records from `backend/db/03-seed.sql`:

| Item | Value |
|---|---|
| User | `carlos@example.com` / `travelhub` |
| City | Cancún |
| Card (happy path) | `4242 4242 4242 4242` |
| Card (force decline) | `4000 0000 0000 0002` |

## Stable selectors

The flow tap by `testID` for every CTA. Hand-edited testIDs:

| Screen | testID |
|---|---|
| `app/welcome.tsx` | `welcome-login-cta` (unused by default flow — app boots to tabs, not welcome) |
| `app/(tabs)/_layout.tsx` | `profile-tab` (`tabBarTestID`) |
| `app/(tabs)/profile.tsx` | `profile-login-cta` |
| `app/login.tsx` | `login-submit` |
| `app/(tabs)/index.tsx` | `city-search-input`, `home-search-cta` |
| `app/(tabs)/search.tsx` | `property-card-first`, `property-card-${idx}` |
| `app/property/[id].tsx` | `reserve-cta` |
| `app/property/[id]/rooms.tsx` | `select-room-first`, `select-room-${idx}` |
| `app/property/[id]/rooms/[roomId].tsx` | `continue-to-booking` |
| `app/booking/checkout.tsx` | `checkout-continue` |
| `app/booking/payment.tsx` | `payment-pay`, `success-view-bookings` |
| `app/(tabs)/trips.tsx` | `booking-row-first`, `booking-row-${idx}` |

Form fields (email, password, phone, card number, expiry, CVV, cardholder) are matched by visible label text, which is i18n-driven. If a flow becomes locale-sensitive, switch the affected `tapOn: text:` to a `testID` on the underlying `Input`.

## Debugging

Maestro records each step. After a failed run, find the recording under `~/.maestro/tests/<timestamp>/` and replay with:

```bash
~/.maestro/bin/maestro studio
```

to step through interactively against the running app.
