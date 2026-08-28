# Build Scoop Runner for Google Play

This repo now includes an Android wrapper. The game is the same HTML/JS code, loaded inside a WebView.

## What you need on a computer

- Android Studio (Hedgehog or newer)
- JDK 17 (bundled with Android Studio)

A phone is not enough to produce the Play Store file.

## Build the upload file (.aab)

1. Clone or download this repo.
2. Open Android Studio → **Open** → select the `android` folder.
3. Let Gradle sync. If it asks to generate a Gradle wrapper, accept.
4. Menu: **Build → Generate Signed App Bundle / APK**
5. Create a keystore (save the password; you cannot replace it later).
6. Choose **Android App Bundle**
7. Output: `app-release.aab`

Upload that `.aab` in [Play Console](https://play.google.com/console).

## App id

`com.sashikanthmeduri.scooprunner`

Change it in `android/app/build.gradle` before the first Play upload if you want a different id. After the first upload, the id is permanent.

## Refresh game files after you edit HTML/JS

Copy the web files into the Android assets folder:

```
index.html, style.css, game.js, site.json, sw.js, manifest.webmanifest
assets/*
  → android/app/src/main/assets/www/
```

Then rebuild.

## Capacitor (optional)

`package.json` and `capacitor.config.json` are included if you later want Capacitor instead of this WebView wrapper. On a machine with Node:

```
npm install
npx @capacitor/cli add android
npx @capacitor/cli sync
```
