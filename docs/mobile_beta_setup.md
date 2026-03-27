# BrightNews Mobile Beta Setup

This project now has Capacitor shells for both iOS and Android.

## Current native identity

- App name: `BrightNews`
- App ID / custom scheme: `com.mateomustapic.brightnews`
- Native auth callback: `com.mateomustapic.brightnews://auth/callback`
- Beta version: `0.1.0`

## Commands

```bash
npm run mobile:build
npm run android:bundle:release
npm run android:apk:release
npm run cap:open:ios
npm run cap:open:android
```

`npm run mobile:build` rebuilds the web app and syncs Capacitor assets/plugins into both native projects.

## Auth configuration

### Supabase

In `Authentication -> URL Configuration`, allow:

- `http://localhost:5173`
- `com.mateomustapic.brightnews://auth/callback`

For hosted web later, also add the production site URL and set:

```env
VITE_WEB_AUTH_REDIRECT_URL=https://your-domain.com
```

### Google OAuth

Google Cloud should keep using the Supabase callback URI, not the custom mobile scheme:

- `https://njuhdiargdcpbhbdqzkz.supabase.co/auth/v1/callback`

For local web testing, keep:

- Authorized JavaScript origin: `http://localhost:5173`

## Android release signing

For Play internal testing, set up an upload keystore once.

1. Copy `android/keystore.properties.example` to `android/keystore.properties`
2. Fill:
   - `storeFile`
   - `storePassword`
   - `keyAlias`
   - `keyPassword`
3. Keep the real file and keystore out of git

You can also provide the same values through environment variables:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Then create the Play bundle with:

```bash
npm run mobile:build
npm run android:bundle:release
```

Expected output:

- `android/app/build/outputs/bundle/release/app-release.aab`

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

- Configure signing in Xcode and Android Studio
- Add privacy policy URL and support URL
- Test Google sign-in on both native platforms
- Verify saved-story sync after native auth
- Prepare store screenshots and metadata

## Fastest beta path

### iOS TestFlight

1. Install Xcode and sign in with the Apple developer account.
2. Open `ios/App/App.xcodeproj`.
3. Confirm signing for bundle ID `com.mateomustapic.brightnews`.
4. Archive and upload the build to App Store Connect.
5. Create an internal TestFlight group first.
6. Add the processed build to internal testing.
7. After that, create an external group only if you want wider beta access.

### Google Play internal testing

1. Open `android/` in Android Studio.
2. Let Gradle sync.
3. Generate an upload key and configure `android/keystore.properties`.
4. Build an Android App Bundle for release.
5. Create an Internal testing track in Play Console.
6. Upload the app bundle.
7. Add up to 100 internal testers and share the opt-in link.

Internal testing is the fastest route on both stores.
