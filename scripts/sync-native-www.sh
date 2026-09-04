#!/usr/bin/env bash
# Copy the playable web game into Android and iOS bundles.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WWW_ANDROID="$ROOT/android/app/src/main/assets/www"
WWW_IOS="$ROOT/ios/ScoopRunner/www"

sync_www() {
  local dest="$1"
  mkdir -p "$dest/sprites" "$dest/bg"
  rm -rf "$dest/assets" "$dest/game.js" "$dest/style.css" "$dest/sw.js" "$dest/manifest.webmanifest" "$dest/site.json"
  cp "$ROOT/public/play.html" "$dest/index.html"
  cp "$ROOT/public/scoop-game.js" "$dest/scoop-game.js"
  cp "$ROOT/public/favicon.svg" "$dest/favicon.svg"
  cp "$ROOT/public/privacy.html" "$dest/privacy.html"
  cp "$ROOT/public/sprites/"*.png "$dest/sprites/"
  cp "$ROOT/public/bg/"*.jpg "$dest/bg/"
  echo "Synced www → $dest"
}

sync_www "$WWW_ANDROID"
sync_www "$WWW_IOS"
echo "Native web bundles are up to date."
