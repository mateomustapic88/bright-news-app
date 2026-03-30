# Firebase Analytics Setup

BrightNews now logs basic beta-usage events through Firebase Analytics on native builds.

## What gets tracked

- screen changes
- region/category/language filter changes
- story opens
- saves / unsaves
- shares
- feedback clicks
- refresh taps
- Google sign-in start / success / sign-out
- onboarding dismissal

## Android setup

1. Open Firebase Console and create or reuse a Firebase project with Google Analytics enabled.
2. Add an Android app with package name:
   - `com.mateomustapic.brightnews`
3. Download `google-services.json`
4. Place it here:
   - `android/app/google-services.json`
5. Sync native dependencies:
   ```bash
   npx cap sync android
   ```
6. Build and install a new beta build.

## iOS setup later

When you come back to iOS, add the same app to Firebase for iOS and place:

- `GoogleService-Info.plist` in `ios/App/App/`

Then run:

```bash
npx cap sync ios
```

## Notes

- The current tracking layer is native-first. Web builds safely no-op for these custom events.
- If the Firebase config files are missing, analytics calls fail silently instead of breaking the app.
