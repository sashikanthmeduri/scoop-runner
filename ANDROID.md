# Android (Google Play)

Full store steps live in [STORE.md](STORE.md).

```bash
bash scripts/sync-native-www.sh
```

Then open the `android/` folder in Android Studio and generate a signed **Android App Bundle** (`.aab`).

- applicationId: `com.sashikanthmeduri.scooprunner`
- minSdk 24 / targetSdk 35 / version 1.1.0 (2)
