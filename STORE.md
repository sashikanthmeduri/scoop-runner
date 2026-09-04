# Store launch guide

Scoop Runner is packaged for **Google Play** and the **Apple App Store**.
The game itself is the web build in `public/`. Native shells load a synced copy in `www/`.

App ID on both stores: `com.sashikanthmeduri.scooprunner`  
Version: **1.1.0** (build **2**)

## 1. Refresh game assets into the apps

From the repo root:

```bash
bash scripts/sync-native-www.sh
python3 scripts/generate-store-icons.py
```

This copies `public/play.html`, `public/scoop-game.js`, sprites, and skies into:

- `android/app/src/main/assets/www/`
- `ios/ScoopRunner/www/`

Run it after every game art or logic change, then commit.

## 2. Google Play (Android)

On a computer with [Android Studio](https://developer.android.com/studio):

1. **Open** the `android/` folder.
2. Let Gradle sync (JDK 17). If it offers a Gradle wrapper, accept.
3. **Build → Generate Signed App Bundle / APK**
4. Create a Play App Signing keystore and keep the password somewhere safe. You cannot rotate this casually.
5. Choose **Android App Bundle** (`.aab`).
6. Upload `app-release.aab` in [Play Console](https://play.google.com/console).

### Play Console listing

Use files in `store/listing/`:

| Asset | File |
|---|---|
| App icon 512 | `icon-512.png` |
| Feature graphic 1024×500 | `feature-graphic-1024x500.png` |
| Privacy policy | host `public/privacy.html` and paste the URL |

Suggested copy:

- **Short:** Chase scoops through a chaotic city.
- **Full:** You are the city desk’s last honest reporter. Sprint the skyline, grab the exclusive, and file it before the competition. Jump, Scoop-x, and jetpack over the crowd. Optional run recording stays on your phone.

Content rating: **Everyone 9+** / PEGI 7 (cartoon obstacles, no blood).  
Category: **Game → Arcade**.  
No ads, no in-app purchases in this build.

## 3. Apple App Store (iOS)

This must be done on a **Mac** with Xcode 15+ and an Apple Developer account ($99/year).

1. Run the sync script above.
2. Open `ios/ScoopRunner.xcodeproj`.
3. Signing & Capabilities → your **Team**. The bundle id is `com.sashikanthmeduri.scooprunner`.
4. Select **Any iOS Device**, **Product → Archive**.
5. Distribute App → App Store Connect.
6. In App Store Connect, attach:
   - Icon 1024 (`store/listing/icon-1024.png` is also the Xcode AppIcon)
   - iPhone 6.7" and 6.1" screenshots
   - Privacy policy URL (`public/privacy.html` hosted)
   - Age 9+
   - Category: Games / Action

`ITSAppUsesNonExemptEncryption` is already `false` (HTTPS only).  
`PrivacyInfo.xcprivacy` declares no tracking.

## 4. What the native apps are allowed to do

- Vibrate on jump / Scoop-x
- Network for the optional global scoreboard and flag images
- Save high score, mute, and recorded runs **on device only**

They do **not** use the camera, microphone, contacts, or advertising ID.

## 5. After you change the game

```bash
bash scripts/sync-native-www.sh
# commit, then rebuild the .aab / Xcode archive
```
