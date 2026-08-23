#!/usr/bin/env bash
# Build a standalone release APK (JS bundle embedded — no Metro at runtime).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing apps/mobile/.env — copy .env.example and set EXPO_PUBLIC_API_BASE_URL."
  exit 1
fi

echo "Using EXPO_PUBLIC_API_BASE_URL from .env (baked into the APK at build time)."
npx expo prebuild --platform android --no-install

cd android
./gradlew assembleRelease "$@"

APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "Release APK ready:"
echo "  $APK"
echo ""
echo "Install on a connected device:"
echo "  adb install -r \"$APK\""
