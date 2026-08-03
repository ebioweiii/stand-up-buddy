#!/bin/bash
# Stand Up Buddy isn't notarized by Apple (that requires a paid Apple
# Developer account), so on some Macs Gatekeeper flags it as unverified and
# moves it straight to the Trash instead of showing the usual "unidentified
# developer" prompt. This script clears that flag and re-signs the app
# locally so macOS trusts it again. It only touches Stand Up Buddy.
set -e

APP_PATH="/Applications/Stand Up Buddy.app"

echo "Stand Up Buddy — macOS security fix"
echo "===================================="
echo

if [ ! -d "$APP_PATH" ]; then
  echo "Couldn't find \"$APP_PATH\"."
  echo "Drag Stand Up Buddy.app into your Applications folder first, then double-click this script again."
  echo
  read -r -p "Press Enter to close..."
  exit 1
fi

echo "This will ask for your Mac login password (typing is invisible, that's normal)."
echo

sudo xattr -cr "$APP_PATH"
find "$APP_PATH" -name "._*" -delete
find "$APP_PATH" -name ".DS_Store" -delete
sudo codesign --force --deep --sign - "$APP_PATH"

echo
echo "Done! You can now open Stand Up Buddy from your Applications folder as normal."
echo
read -r -p "Press Enter to close..."
