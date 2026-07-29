# Stand Up Buddy

A whimsical retro pixel-art tray app that pops up every so often to remind you to stand up and stretch.

![platform](https://img.shields.io/badge/platform-mac%20%7C%20windows-lightgrey)

## Download

Grab the latest installer from the [Releases page](https://github.com/ebioweiii/stand-up-buddy/releases/latest):

- **macOS** — `Stand.Up.Buddy-x.y.z-universal.dmg` (Intel + Apple Silicon)
- **Windows** — `Stand.Up.Buddy.Setup.x.y.z.exe`

### First-launch warning (expected)

These builds aren't code-signed (that requires a paid Apple Developer ID / Windows certificate), so your OS will flag them as being from an unidentified developer the first time. This is normal, not a sign anything is broken.

- **macOS**: after copying the app to Applications, **right-click → Open** the first time (instead of double-clicking). Click "Open" on the dialog that appears. You only need to do this once.
- **Windows**: SmartScreen will show "Windows protected your PC". Click **More info**, then **Run anyway**.

## What it does

- Lives in the tray / menu bar — no dock icon, no clutter
- Every 30 minutes (configurable to 15/45/60), a small pixel-art buddy pops up in the corner of your screen with a short 8-bit blip
- **Standing! 🎉** dismisses and resets the timer, **5 more min** snoozes
- Pause/resume and change the interval from the tray menu
- Settings persist locally between launches

## Development

Requires Node.js 18+.

```bash
npm install
npm start
```

> **Apple Silicon note:** the plain npm `electron` binary is unsigned, so macOS may flag it as malware on first run and delete it. If that happens, re-run `npm install` and then ad-hoc sign it before starting:
> ```bash
> codesign --force --deep --sign - node_modules/electron/dist/Electron.app
> npm start
> ```

### Building installers locally

```bash
npm run dist:mac    # -> dist/*.dmg
npm run dist:win    # -> dist/*.exe (cross-build needs Wine on non-Windows, or run on Windows)
```

### Releasing

Pushing a tag like `v1.0.1` triggers [`.github/workflows/build.yml`](.github/workflows/build.yml), which builds both installers on GitHub-hosted runners and attaches them to a new GitHub Release automatically.

```bash
git tag v1.0.1
git push origin v1.0.1
```

## How the pixel art works

The character and tray icon aren't sprite-sheet images — they're generated procedurally at runtime from a circle/ellipse formula plus edge-detection (see [`src/trayIcon.js`](src/trayIcon.js) and [`src/popup/sprite.js`](src/popup/sprite.js)). The chiptune blip is likewise synthesized live with the Web Audio API rather than a bundled sound file.

## License

MIT
