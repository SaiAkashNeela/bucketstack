#!/bin/bash
#
# Notarize and staple a built BucketStack.app, then create a signed DMG.
# Usage: scripts/notarize.sh [path/to/BucketStack.app]
#   If no path provided, finds the app in target/release/bundle/
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

APP_NAME="BucketStack"
BUNDLE_DIR="target/release/bundle"
MACOS_BUNDLE="$BUNDLE_DIR/macos/${APP_NAME}.app"
NOTARY_TIMEOUT=1200

# Load .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✓ Loaded .env"
else
  echo "❌ .env not found. Create .env with notarization credentials."
  exit 1
fi

# Find app path
if [ -n "$1" ]; then
  APP_PATH="$1"
else
  APP_PATH=""
  if [ -d "$MACOS_BUNDLE" ]; then
    APP_PATH="$MACOS_BUNDLE"
  fi
  if [ -z "$APP_PATH" ]; then
    APP_PATH="$(find "$BUNDLE_DIR" -maxdepth 4 -name "${APP_NAME}.app" -type d 2>/dev/null | head -1)"
  fi
fi

if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
  echo "❌ App not found. Provide path or build first:"
  echo "   scripts/build.sh"
  exit 1
fi

# Signing identity required for DMG creation
if [ -z "$APPLE_SIGNING_IDENTITY" ]; then
  echo "❌ APPLE_SIGNING_IDENTITY not set in .env (needed for DMG signing)"
  exit 1
fi

echo "📤 Notarizing: $APP_PATH"
echo ""

# Notary: need either API key or keychain profile
USE_KEYCHAIN=
if [ -n "$APPLE_KEYCHAIN_PROFILE" ]; then
  USE_KEYCHAIN=1
  APPLE_KEYCHAIN_PROFILE_SAVED="$APPLE_KEYCHAIN_PROFILE"
  echo "✓ Notary: using keychain profile: $APPLE_KEYCHAIN_PROFILE"
elif [ -n "$APPLE_API_ISSUER" ] && [ -n "$APPLE_API_KEY" ] && [ -n "$APPLE_API_KEY_PATH" ]; then
  if [ ! -f "$APPLE_API_KEY_PATH" ]; then
    echo "❌ APPLE_API_KEY_PATH file not found: $APPLE_API_KEY_PATH"
    exit 1
  fi
  APPLE_API_ISSUER_SAVED="$APPLE_API_ISSUER"
  APPLE_API_KEY_SAVED="$APPLE_API_KEY"
  APPLE_API_KEY_PATH_SAVED="$APPLE_API_KEY_PATH"
  echo "✓ Notary: using API key from file"
else
  echo "❌ Set either APPLE_KEYCHAIN_PROFILE or (APPLE_API_ISSUER + APPLE_API_KEY + APPLE_API_KEY_PATH) in .env"
  exit 1
fi

# ---------------------------------------------------------------------------
ZIP_PATH="${APP_PATH%/*}/${APP_NAME}-notarize.zip"
echo "📦 Creating ZIP for notarization..."
rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"
echo "✓ Created: $ZIP_PATH"
echo ""

# ---------------------------------------------------------------------------
echo "📤 Submitting to Apple for notarization (this may take 5–15 minutes)..."
SUBMISSION_ID=""
SUBMIT_OUTPUT=""
STATUS_OUTPUT=""
if [ -n "$USE_KEYCHAIN" ]; then
  SUBMIT_OUTPUT=$(xcrun notarytool submit "$ZIP_PATH" \
    --keychain-profile "$APPLE_KEYCHAIN_PROFILE_SAVED" \
    --wait \
    --timeout "$NOTARY_TIMEOUT" 2>&1) || true
else
  SUBMIT_OUTPUT=$(xcrun notarytool submit "$ZIP_PATH" \
    --issuer "$APPLE_API_ISSUER_SAVED" \
    --key-id "$APPLE_API_KEY_SAVED" \
    --key "$APPLE_API_KEY_PATH_SAVED" \
    --wait \
    --timeout "$NOTARY_TIMEOUT" 2>&1) || true
fi

# Extract submission ID even if command failed (it might have been submitted before timeout)
SUBMISSION_ID=$(echo "$SUBMIT_OUTPUT" | grep -i "id:" | head -1 | awk '{print $NF}' | tr -d '\r\n' || true)

# Check if submission succeeded or if we got an ID to check later
if echo "$SUBMIT_OUTPUT" | grep -qi "status: Accepted\|accepted\|success"; then
  echo ""
  echo "✅ Notarization accepted."
elif [ -n "$SUBMISSION_ID" ]; then
  echo ""
  echo "⚠️  Connection timeout, but submission was received (ID: $SUBMISSION_ID)"
  echo "   Checking status..."
  
  # Try to check status
  if [ -n "$USE_KEYCHAIN" ]; then
    STATUS_OUTPUT=$(xcrun notarytool info "$SUBMISSION_ID" \
      --keychain-profile "$APPLE_KEYCHAIN_PROFILE_SAVED" 2>&1) || true
  else
    STATUS_OUTPUT=$(xcrun notarytool info "$SUBMISSION_ID" \
      --issuer "$APPLE_API_ISSUER_SAVED" \
      --key-id "$APPLE_API_KEY_SAVED" \
      --key "$APPLE_API_KEY_PATH_SAVED" 2>&1) || true
  fi
  
  if echo "$STATUS_OUTPUT" | grep -qi "status: Accepted\|accepted"; then
    echo "✅ Notarization accepted (checked via status)."
  elif echo "$STATUS_OUTPUT" | grep -qi "status: In Progress\|in progress"; then
    echo "⏳ Notarization in progress. Check status later with:"
    if [ -n "$USE_KEYCHAIN" ]; then
      echo "   xcrun notarytool info $SUBMISSION_ID --keychain-profile $APPLE_KEYCHAIN_PROFILE_SAVED"
    else
      echo "   xcrun notarytool info $SUBMISSION_ID --issuer $APPLE_API_ISSUER_SAVED --key-id $APPLE_API_KEY_SAVED --key $APPLE_API_KEY_PATH_SAVED"
    fi
    echo ""
    echo "   Once accepted, run: xcrun stapler staple \"$APP_PATH\""
    exit 0
  else
    echo "❌ Could not verify status. Check manually:"
    if [ -n "$USE_KEYCHAIN" ]; then
      echo "   xcrun notarytool info $SUBMISSION_ID --keychain-profile $APPLE_KEYCHAIN_PROFILE_SAVED"
      echo "   xcrun notarytool log $SUBMISSION_ID --keychain-profile $APPLE_KEYCHAIN_PROFILE_SAVED"
    else
      echo "   xcrun notarytool info $SUBMISSION_ID --issuer $APPLE_API_ISSUER_SAVED --key-id $APPLE_API_KEY_SAVED --key $APPLE_API_KEY_PATH_SAVED"
      echo "   xcrun notarytool log $SUBMISSION_ID --issuer $APPLE_API_ISSUER_SAVED --key-id $APPLE_API_KEY_SAVED --key $APPLE_API_KEY_PATH_SAVED"
    fi
    echo ""
    echo "   If accepted, staple with: xcrun stapler staple \"$APP_PATH\""
    exit 1
  fi
else
  echo ""
  echo "❌ Notarization submission failed. Output:"
  echo "$SUBMIT_OUTPUT"
  exit 1
fi
echo ""

# ---------------------------------------------------------------------------
# Only staple if we confirmed acceptance
NOTARIZED=0
if echo "$SUBMIT_OUTPUT" | grep -qi "status: Accepted\|accepted\|success"; then
  NOTARIZED=1
elif [ -n "$STATUS_OUTPUT" ] && echo "$STATUS_OUTPUT" | grep -qi "status: Accepted\|accepted"; then
  NOTARIZED=1
fi

if [ $NOTARIZED -eq 1 ]; then
  echo "📎 Stapling notarization ticket to app..."
  xcrun stapler staple "$APP_PATH"
  echo "✓ Stapled"
  echo ""
  
  echo "🔍 Verification..."
  if spctl -a -vv -t execute "$APP_PATH" 2>&1 | grep -q "accepted"; then
    echo "✓ Gatekeeper: accepted"
  else
    spctl -a -vv -t execute "$APP_PATH" || true
  fi
  echo ""
  
  echo "✅ App notarization complete: $APP_PATH"
  
  # Clean up temporary ZIP (only used for notarization, not for distribution)
  if [ -f "$ZIP_PATH" ]; then
    rm -f "$ZIP_PATH"
    echo "✓ Cleaned up temporary ZIP (only used for notarization)"
  fi
  echo ""
  echo "📝 Note: ZIP was only used temporarily for .app notarization (Apple requirement)."
  echo "   Creating DMG from notarized app, then notarizing the DMG directly (no ZIP needed)..."
  
  # Create DMG from notarized app
  echo ""
  echo "📦 Creating DMG from notarized app..."
  APP_DIR="$(dirname "$APP_PATH")"
  APP_BASENAME="$(basename "$APP_PATH" .app)"
  # Use version from tauri.conf.json if available, otherwise use date
  VERSION=$(node -e "try { const fs=require('fs'); const j=JSON.parse(fs.readFileSync('$PROJECT_ROOT/tauri.conf.json','utf8')); console.log(j.version || '0.0.1'); } catch(e) { console.log('0.0.1'); }" 2>/dev/null || echo "0.0.1")
  ARCH=$(uname -m | sed 's/x86_64/x64/; s/arm64/aarch64/')
  DMG_NAME="${APP_BASENAME}_${VERSION}_${ARCH}.dmg"
  DMG_PATH="${APP_DIR}/${DMG_NAME}"
  
  # Remove old DMG if exists
  rm -f "$DMG_PATH"
  
  # Ensure no existing volumes are mounted that would conflict
  echo "🧹 Cleaning up existing mounts..."
  hdiutil info | grep "/Volumes/$APP_BASENAME" | awk '{print $1}' | while read -r dev; do
    echo "  Ejecting $dev..."
    hdiutil detach "$dev" -force || true
  done

  # Create DMG using hdiutil
  TEMP_DMG="${APP_DIR}/temp_${DMG_NAME}"
  hdiutil create -srcfolder "$APP_PATH" -volname "$APP_BASENAME" -fs HFS+ -fsargs "-c c=64,a=16,e=16" -format UDRW -size 200m "$TEMP_DMG" 2>/dev/null || \
  hdiutil create -srcfolder "$APP_PATH" -volname "$APP_BASENAME" -fs HFS+ -format UDRW -size 200m "$TEMP_DMG"
  
  # Mount and configure DMG
  MOUNT_INFO=$(hdiutil attach -readwrite -noverify -noautoopen "$TEMP_DMG")
  DEVICE=$(echo "$MOUNT_INFO" | egrep '^/dev/' | sed 1q | awk '{print $1}')
  MOUNT_POINT=$(hdiutil info | grep -A 20 "$DEVICE" | grep "/Volumes/" | awk '{print $NF}' || echo "/Volumes/$APP_BASENAME")
  
  echo "📦 Mounted at: $MOUNT_POINT"
  sleep 2

  # Create /Applications symlink
  echo "🔗 Creating /Applications symlink..."
  ln -s /Applications "$MOUNT_POINT/Applications"

  # Set Volume Icon
  if [ -f "icons/icon.icns" ]; then
    cp "icons/icon.icns" "$MOUNT_POINT/.VolumeIcon.icns"
    chflags hidden "$MOUNT_POINT/.VolumeIcon.icns"
    SetFile -a C "$MOUNT_POINT"
    echo "✓ Set custom volume icon"
  fi
  
  # Set DMG window properties (optional, makes it look nicer)
  echo "🎨 Configuring DMG window..."
  echo '
     tell application "Finder"
       tell disk "'"$APP_BASENAME"'"
         open
         set current view of container window to icon view
         set toolbar visible of container window to false
         set statusbar visible of container window to false
         set the bounds of container window to {400, 100, 920, 420}
         set viewOptions to the icon view options of container window
         set arrangement of viewOptions to not arranged
         set icon size of viewOptions to 100
         set position of item "'"$APP_BASENAME"'" of container window to {160, 160}
         set position of item "Applications" of container window to {360, 160}
         close
         open
         update without registering applications
         delay 2
       end tell
     end tell
  ' | osascript || true

  # Re-apply custom icon attribute just in case AppleScript touched it
  if [ -f "icons/icon.icns" ]; then
    SetFile -a C "$MOUNT_POINT"
  fi
  
  # Wait a bit to ensure Finder updates
  sleep 4
  
  # Unmount
  echo "🔄 Finalizing DMG..."
  hdiutil detach "$DEVICE"
  sleep 2
  
  # Convert to read-only compressed DMG
  hdiutil convert "$TEMP_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_PATH"
  rm -f "$TEMP_DMG"
  
  # Sign the DMG
  echo "🔐 Signing DMG..."
  codesign --force --sign "$APPLE_SIGNING_IDENTITY" \
    --options runtime \
    --timestamp \
    "$DMG_PATH" 2>/dev/null || codesign --force --sign "$APPLE_SIGNING_IDENTITY" "$DMG_PATH"
  echo "✓ DMG signed: $DMG_PATH"
  
  # Notarize the DMG directly (Apple accepts DMG submissions - no ZIP needed!)
  echo ""
  echo "📤 Notarizing DMG directly (Apple accepts DMG submissions, no ZIP needed)..."
  DMG_SUBMIT_OUTPUT=""
  DMG_SUBMISSION_ID=""
  if [ -n "$USE_KEYCHAIN" ]; then
    DMG_SUBMIT_OUTPUT=$(xcrun notarytool submit "$DMG_PATH" \
      --keychain-profile "$APPLE_KEYCHAIN_PROFILE_SAVED" \
      --wait \
      --timeout "$NOTARY_TIMEOUT" 2>&1) || true
  else
    DMG_SUBMIT_OUTPUT=$(xcrun notarytool submit "$DMG_PATH" \
      --issuer "$APPLE_API_ISSUER_SAVED" \
      --key-id "$APPLE_API_KEY_SAVED" \
      --key "$APPLE_API_KEY_PATH_SAVED" \
      --wait \
      --timeout "$NOTARY_TIMEOUT" 2>&1) || true
  fi
  
  DMG_SUBMISSION_ID=$(echo "$DMG_SUBMIT_OUTPUT" | grep -i "id:" | head -1 | awk '{print $NF}' | tr -d '\r\n' || true)
  
  if echo "$DMG_SUBMIT_OUTPUT" | grep -qi "status: Accepted\|accepted\|success"; then
    echo "✅ DMG notarization accepted."
    xcrun stapler staple "$DMG_PATH"
    echo "✓ DMG stapled"
    echo ""
    echo ""
    echo "=========================================="
    echo "✅ Final notarized DMG ready for distribution:"
    echo "   $DMG_PATH"
    echo ""
    echo "📦 Distribution: Share this DMG file (no ZIP needed!)"
    echo "   Users can download and drag to Applications folder."
    echo "=========================================="
  elif [ -n "$DMG_SUBMISSION_ID" ]; then
    echo "⚠️  DMG notarization in progress (ID: $DMG_SUBMISSION_ID)"
    echo "   Check status later and staple when accepted:"
    if [ -n "$USE_KEYCHAIN" ]; then
      echo "   xcrun notarytool info $DMG_SUBMISSION_ID --keychain-profile $APPLE_KEYCHAIN_PROFILE_SAVED"
    else
      echo "   xcrun notarytool info $DMG_SUBMISSION_ID --issuer $APPLE_API_ISSUER_SAVED --key-id $APPLE_API_KEY_SAVED --key $APPLE_API_KEY_PATH_SAVED"
    fi
    echo "   xcrun stapler staple \"$DMG_PATH\""
  else
    echo "⚠️  DMG notarization submission had issues. DMG is signed but not notarized yet."
    echo "   You can manually submit: xcrun notarytool submit \"$DMG_PATH\" ..."
  fi
  
  # Auto-increment version
  echo ""
  echo "🔢 Auto-incrementing version..."
  NEW_VERSION=$(node -e '
  const fs = require("fs");
  const path = require("path");
  const confPath = path.join(process.env.PROJECT_ROOT, "tauri.conf.json");
  const pkgPath = path.join(process.env.PROJECT_ROOT, "package.json");

  try {
    const conf = JSON.parse(fs.readFileSync(confPath, "utf8"));
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

    // Parse current version (e.g., "0.0.1")
    const [major, minor, patch] = (conf.version || "0.0.0").split(".").map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    // Update both files
    conf.version = newVersion;
    pkg.version = newVersion;

    fs.writeFileSync(confPath, JSON.stringify(conf, null, 2));
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    console.log(newVersion);
  } catch (e) {
    console.error("Error auto-incrementing version:", e.message);
    process.exit(1);
  }
  ' 2>/dev/null)

  if [ -n "$NEW_VERSION" ]; then
    echo "✓ Version bumped to: $NEW_VERSION"
    VERSION="$NEW_VERSION"
  else
    echo "⚠️  Version auto-increment failed, using current version"
    VERSION=$(node -e "try { const fs=require('fs'); const j=JSON.parse(fs.readFileSync('$PROJECT_ROOT/tauri.conf.json','utf8')); console.log(j.version || '0.0.1'); } catch(e) { console.log('0.0.1'); }" 2>/dev/null || echo "0.0.1")
  fi
  echo ""

  # Prepare updater tar.gz with architecture suffix
  echo "📦 Preparing updater tar.gz with architecture suffix..."
  ARCH=$(uname -m | sed 's/x86_64/x64/; s/arm64/aarch64/')
  UPDATER_TARGZ="$(find "$BUNDLE_DIR" -maxdepth 4 -name "*.app.tar.gz" -type f 2>/dev/null | head -1)"

  if [ -n "$UPDATER_TARGZ" ]; then
    UPDATER_DIR="$(dirname "$UPDATER_TARGZ")"
    NEW_TARGZ="${UPDATER_DIR}/BucketStack_${VERSION}_${ARCH}.tar.gz"
    NEW_SIG="${NEW_TARGZ}.sig"

    # Rename to include version and arch
    if [ -f "$UPDATER_TARGZ" ]; then
      mv "$UPDATER_TARGZ" "$NEW_TARGZ"
      echo "✓ Renamed: BucketStack.app.tar.gz → BucketStack_${VERSION}_${ARCH}.tar.gz"
    fi

    if [ -f "${UPDATER_TARGZ}.sig" ]; then
      mv "${UPDATER_TARGZ}.sig" "$NEW_SIG"
      echo "✓ Renamed signature: BucketStack.app.tar.gz.sig → BucketStack_${VERSION}_${ARCH}.tar.gz.sig"
    fi
  else
    echo "⚠️  No updater tar.gz found (this is optional for distribution)"
  fi
  echo ""

  # Commit version bump to git
  echo "📝 Committing version bump to git..."
  git add tauri.conf.json package.json 2>/dev/null || true
  git commit -m "Release v$VERSION: Notarized macOS build" 2>/dev/null || echo "  (no changes to commit)"
  git tag "v$VERSION" 2>/dev/null || echo "  (tag may already exist)"
  echo "✓ Tagged: v$VERSION"
else
  echo "⚠️  Skipping stapling - notarization not yet confirmed as accepted."
  if [ -n "$SUBMISSION_ID" ]; then
    echo "   Submission ID: $SUBMISSION_ID"
  fi
  echo "   Once accepted, run: xcrun stapler staple \"$APP_PATH\""
fi
echo ""