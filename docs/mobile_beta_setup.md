# BrightNews Mobile Beta Setup

This project now has Capacitor shells for both iOS and Android.

## Current native identity

- App name: `BrightNews`
- App ID / custom scheme: `com.brightnews.app`
- Native auth callback: `com.brightnews.app://auth/callback`

## Commands

```bash
npm run mobile:build
npm run cap:open:ios
npm run cap:open:android
```

`npm run mobile:build` rebuilds the web app and syncs Capacitor assets/plugins into both native projects.

## Auth configuration

### Supabase

In `Authentication -> URL Configuration`, allow:

- `http://localhost:5173`
- `com.brightnews.app://auth/callback`

For hosted web later, also add the production site URL and set:

```env
VITE_WEB_AUTH_REDIRECT_URL=https://your-domain.com
```

### Google OAuth

Google Cloud should keep using the Supabase callback URI, not the custom mobile scheme:

- `https://njuhdiargdcpbhbdqzkz.supabase.co/auth/v1/callback`

For local web testing, keep:

- Authorized JavaScript origin: `http://localhost:5173`

## iOS

Prerequisites:

- Xcode installed
- Apple developer session working

Once Xcode is available:

1. Run `npm run mobile:build`
2. Run `npm run cap:open:ios`
3. Select an iPhone simulator
4. Press Run
5. Test Google sign-in round trip

## Android

Prerequisites:

- Android Studio installed

Then:

1. Run `npm run mobile:build`
2. Run `npm run cap:open:android`
3. Let Gradle sync
4. Run on emulator or device
5. Test Google sign-in round trip

## Remaining beta-store tasks

- Replace default Capacitor app icons and splash assets
- Set production bundle IDs/signing in Xcode and Android Studio
- Add privacy policy URL and support URL
- Test Google sign-in on both native platforms
- Verify saved-story sync after native auth
- Prepare store screenshots and metadata
