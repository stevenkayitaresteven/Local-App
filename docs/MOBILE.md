# Mobile app (iOS · Android · web)

`apps/mobile` is an [Expo](https://expo.dev) + React Native app using Expo Router
(file-based navigation). One codebase ships to **iOS, Android, and web**.

## Run it

```bash
# from the repo root — make sure the API is running first (npm run dev:api)
npm run mobile          # starts the Expo dev server

# then:
#   press  i   → iOS simulator (macOS + Xcode)
#   press  a   → Android emulator (Android Studio) or a connected device
#   press  w   → web browser
#   or scan the QR code with Expo Go on a physical phone
```

### Pointing the app at your API

`src/lib/config.ts` resolves the API base URL:

- iOS simulator / web → `http://localhost:4000`
- Android emulator → `http://10.0.2.2:4000` (the emulator's host loopback)
- **Physical device** → set your machine's LAN IP:
  `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000 npm run mobile`
  (or edit `extra.apiUrl` in `app.json`).

## Structure

```
app/                         # routes (Expo Router)
  _layout.tsx                # providers: React Query, SafeArea, auth bootstrap
  index.tsx                  # auth-gated redirect
  (auth)/                    # welcome · login · register
  (tabs)/                    # Ahabanza · Umuryango · Ikarita · Ubutumwa · Konti
  isoko/[id].tsx             # listing detail (chat / buy)
  ubutumwa/[id].tsx          # realtime conversation
  sell.tsx · search.tsx
src/
  theme/                     # design tokens (palette, spacing, type, shadows)
  components/                # Button, Chip, Avatar, AgaciroBadge, ListingCard, PostCard…
  lib/                       # api client, socket, hooks (React Query), storage, format
  store/                     # zustand auth store
```

## How it talks to the backend

- **REST** through a small typed `fetch` client (`src/lib/api.ts`) with automatic
  access-token refresh on `401` and secure token storage (Keychain/Keystore via
  `expo-secure-store`, `localStorage` on web).
- **Realtime** through `socket.io-client` (`src/lib/socket.ts`) — live messages, typing
  indicators, read receipts, and notifications.
- **Server state** via React Query (infinite lists, cache invalidation, pull-to-refresh).

## Building for the stores (EAS)

Producing actual `.ipa` / `.aab` binaries uses [EAS Build](https://docs.expo.dev/build/introduction/)
(cloud builds; no local Xcode/Android Studio required):

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform ios        # App Store build
eas build --platform android    # Play Store build (.aab)
eas submit --platform ios       # upload to App Store Connect
eas submit --platform android   # upload to Google Play
```

Bundle identifiers are set in `app.json` (`rw.umuturanyi.app`). Set production secrets
(`EXPO_PUBLIC_API_URL`, etc.) via EAS environment variables / `eas.json` build profiles.

## Notes

- A native map (`react-native-maps`) drops into the **Ikarita** tab for device builds; the
  current screen shares the `/listings?sort=nearby` distance ranking so it works everywhere,
  including web.
- Custom display fonts (Baloo 2, Plus Jakarta Sans) can be loaded with `expo-font`; the theme
  exposes `font.display` / `font.body` swap points.
