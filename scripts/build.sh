#!/bin/bash
#
# Build BucketStack for macOS: compile, sign with Developer ID, and sign updater artifacts.
# Run scripts/setup-updater.sh first if you want updater artifacts signed.
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

APP_NAME="BucketStack"
BUNDLE_DIR="target/release/bundle"
MACOS_BUNDLE="$BUNDLE_DIR/macos/${APP_NAME}.app"

# Load .env if present
[ -f .env ] && set -a && source .env && set +a

# Signing identity required
if [ -z "$APPLE_SIGNING_IDENTITY" ]; then
  echo "❌ APPLE_SIGNING_IDENTITY not set in .env"
  exit 1
fi
echo "✓ Signing identity: $APPLE_SIGNING_IDENTITY"

# Package manager: detect by lockfile (bun > pnpm > npm)
if [ -f bun.lock ]; then
  PKG_CMD="bun"
elif [ -f pnpm-lock.yaml ]; then
  PKG_CMD="pnpm"
else
  PKG_CMD="npm"
fi
echo "✓ Package manager: $PKG_CMD"
echo ""

# Setup updater if key exists (optional)
UPDATER_KEY="${TAURI_SIGNING_PRIVATE_KEY:-$HOME/.bucketstack-updater.key}"
if [ -f "$UPDATER_KEY" ] && [ -f "${UPDATER_KEY}.pub" ]; then
  echo "🔑 Updater key found, updating tauri.conf.json..."
  PROJECT_ROOT="$PROJECT_ROOT" UPDATER_KEY="$UPDATER_KEY" PKG_CMD="$PKG_CMD" node -e '
  const fs = require("fs");
  const path = require("path");
  const confPath = path.join(process.env.PROJECT_ROOT, "tauri.conf.json");
  const pubPath = process.env.UPDATER_KEY + ".pub";
  let pubkey = fs.readFileSync(pubPath, "utf8").trim();
  let endpoint = process.env.TAURI_UPDATER_ENDPOINT || "";
  if (!endpoint) {
    // try {
    //   const url = require("child_process").spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).stdout;
    //   if (url) {
    //     const m = url.trim().match(/github\.com[:/]([^/.]+)\/([^/.]+?)(\.git)?$/);
    //     if (m) endpoint = "https://github.com/" + m[1] + "/" + m[2].replace(/\.git$/, "") + "/releases/latest/download/latest.json";
    //   }
    // } catch (_) {}
  }
  const j = JSON.parse(fs.readFileSync(confPath, "utf8"));
  if (j.plugins && j.plugins.updater) {
    j.plugins.updater.pubkey = pubkey;
    // Only update endpoint if expressly found (or let it stay as is if we commented out detection)
    if (endpoint) j.plugins.updater.endpoints = [endpoint];
  }
  if (j.build) {
    j.build.beforeDevCommand = process.env.PKG_CMD + " run dev";
    j.build.beforeBuildCommand = process.env.PKG_CMD + " run build";
  }
  fs.writeFileSync(confPath, JSON.stringify(j, null, 2));
  ' || true
  export TAURI_SIGNING_PRIVATE_KEY="$UPDATER_KEY"
  echo "✓ Updater signing enabled"
  echo ""
fi

# ---------------------------------------------------------------------------
echo "🧹 Clean previous bundle..."
rm -rf "$BUNDLE_DIR"
echo ""

# ---------------------------------------------------------------------------
echo "🔨 Building app..."
export APPLE_SIGNING_IDENTITY
export APPLE_CERTIFICATE_IDENTITY="$APPLE_SIGNING_IDENTITY"
# Unset notarization vars so Tauri doesn't auto-notarize during build
unset APPLE_API_ISSUER APPLE_API_KEY APPLE_API_KEY_PATH APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID APPLE_KEYCHAIN_PROFILE
$PKG_CMD run tauri build -- --verbose

# Find built app
APP_PATH=""
if [ -d "$MACOS_BUNDLE" ]; then
  APP_PATH="$MACOS_BUNDLE"
fi
if [ -z "$APP_PATH" ]; then
  APP_PATH="$(find "$BUNDLE_DIR" -maxdepth 4 -name "${APP_NAME}.app" -type d 2>/dev/null | head -1)"
fi
if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
  echo "❌ Build failed: ${APP_NAME}.app not found under $BUNDLE_DIR"
  exit 1
fi

echo "✓ App built: $APP_PATH"
echo ""

# ---------------------------------------------------------------------------
echo "🔐 Ensure code signature (Developer ID, hardened runtime, timestamp)..."
SIGNATURE_INFO=$(codesign -dv "$APP_PATH" 2>&1 || true)
if echo "$SIGNATURE_INFO" | grep -q "adhoc"; then
  echo "  Re-signing with Developer ID and hardened runtime..."
  codesign --force --deep --sign "$APPLE_SIGNING_IDENTITY" \
    --options runtime \
    --timestamp \
    "$APP_PATH"
  echo "✓ Re-signed"
elif echo "$SIGNATURE_INFO" | grep -q "Authority=Developer ID Application"; then
  echo "✓ Already signed with Developer ID"
else
  codesign --force --deep --sign "$APPLE_SIGNING_IDENTITY" \
    --options runtime \
    --timestamp \
    "$APP_PATH"
  echo "✓ Signed"
fi
echo ""

# Updater artifacts
UPDATER_TARGZ="$(find "$BUNDLE_DIR" -maxdepth 4 -name "*.tar.gz" -type f 2>/dev/null | head -1)"
UPDATER_SIG="$(find "$BUNDLE_DIR" -maxdepth 4 -name "*.tar.gz.sig" -type f 2>/dev/null | head -1)"
if [ -n "$UPDATER_TARGZ" ]; then
  echo "Updater artifacts:"
  echo "  $UPDATER_TARGZ"
  [ -n "$UPDATER_SIG" ] && echo "  $UPDATER_SIG" || echo "  ⚠ No .sig (run scripts/setup-updater.sh first)"
  echo ""
fi

# Find DMG if Tauri created one (it will, since targets: "all")
DMG_PATH="$(find "$BUNDLE_DIR" -maxdepth 4 -name "*.dmg" -type f 2>/dev/null | head -1)"
if [ -n "$DMG_PATH" ]; then
  echo "📦 Tauri created DMG: $DMG_PATH"
  echo "   ⚠️  This DMG contains unsigned .app - NOT ready for distribution"
  echo "   ✓ Run scripts/notarize.sh to create final notarized DMG"
fi
echo ""

echo "✅ Build complete: $APP_PATH"
echo ""
echo "Next: Run scripts/notarize.sh to notarize and create final DMG for distribution."