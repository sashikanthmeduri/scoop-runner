# Store launch guide

Scoop Runner is packaged for **Google Play** and the **Apple App Store**. The game is the web build in `public/`; native shells load a synced copy in `www/`.

## App identifiers

- Android/Google Play package: `com.sashikanth.scooprunner`
- Apple App Store bundle id: `com.sashikanthmeduri.scooprunner`

Version: **1.1.0** (build **2**)

## 1. Refresh game assets

From the repo root:

```bash
bash scripts/sync-native-www.sh
python3 scripts/generate-store-icons.py
```

This syncs assets into `android/app/src/main/assets/www/` and `ios/ScoopRunner/www/`. Run it after game art or logic changes, then commit.

## 2. Google Play (Android)

1. Open `android/` in [Android Studio](https://developer.android.com/studio) with JDK 17.
2. Build → Generate Signed App Bundle / APK.
3. Choose **Android App Bundle** (`.aab`) and upload `app-release.aab` in [Play Console](https://play.google.com/console).

Play listing assets are in `store/listing/`; host `public/privacy.html` for the privacy policy. Suggested copy: “Chase scoops through a chaotic city.” Content rating: **Everyone 9+** / PEGI 7. Category: **Game → Arcade**. No ads or in-app purchases in this build.

## 3. Apple App Store (iOS)

On a Mac with Xcode 15+, open `ios/ScoopRunner.xcodeproj`, select your Team, and archive for App Store Connect. The iOS bundle id remains `com.sashikanthmeduri.scooprunner`.

## 4. Native app permissions

The native apps may vibrate, access the network for the optional scoreboard and flag images, and save high scores, mute state, and recorded runs on device. They do not use the camera, microphone, contacts, or advertising ID.
