# Scoop Runner

Arcade endless runner. You are a reporter sprinting the city for scoops.

## Play on the web

```bash
npm install
npm run dev
```

Hit **Play**. Check **Record my game** to tape a run. Touch: gun = Scoop-x, Jump on the right. Keyboard: Space jump, Down slide, F/J Scoop-x, G jetpack.

## Ship to Play Store / App Store

See **[STORE.md](STORE.md)**. Short version:

```bash
bash scripts/sync-native-www.sh
python3 scripts/generate-store-icons.py
```

- Android: open `android/` in Android Studio → signed **.aab**
- iOS: open `ios/ScoopRunner.xcodeproj` on a Mac → Archive

App id: `com.sashikanthmeduri.scooprunner`

## Privacy

[public/privacy.html](public/privacy.html)
