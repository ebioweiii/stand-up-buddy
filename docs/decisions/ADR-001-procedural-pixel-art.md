# ADR-001: Generate pixel art procedurally at runtime

## Status
**Status:** Accepted
**Date:** 2026-08-12

## Context

Stand Up Buddy needs a retro pixel-art character and tray icon, plus a short
8-bit "blip" sound when the reminder pops up. The conventional approach is to
bundle static assets: sprite-sheet PNGs for the art and an audio file for the
sound.

For a small, cross-platform Electron tray app distributed as unsigned installers,
bundled binary assets add weight, need to be authored/maintained in external
tools, and must render crisply across Retina and standard displays and across
the macOS menu bar and Windows tray. A decision on the asset strategy was needed
before building out the visual and audio layers.

## Decision

**We will generate the character and tray icon procedurally at runtime — from a
circle/ellipse formula plus edge-detection — and synthesize the chiptune blip
live with the Web Audio API, rather than bundling sprite sheets or audio files,
because it keeps the app self-contained, resolution-independent, and free of an
external art/audio pipeline.**

See `src/trayIcon.js` and `src/popup/sprite.js`.

## Alternatives Considered

### Option A: Procedural generation at runtime (chosen)
- **Pros:** No binary art/audio assets to bundle or version; resolution-independent
  (render at any DPI); tweak the look by changing code, not re-exporting art;
  smaller repo and installer; no external design tooling required.
- **Cons:** Visual fidelity bounded by what the formula can express; art changes
  require code changes; more compute at runtime (negligible for this app).

### Option B: Bundled sprite sheets + audio file
- **Pros:** Full artistic control; standard, well-understood workflow; designers
  can iterate without touching code.
- **Cons:** Requires an art/audio pipeline and source files; multiple resolutions
  to maintain for Retina/standard; larger bundle; assets drift from code.

## Consequences

### Positive
- The app is fully self-contained — no image or sound files in the bundle.
- Art and sound scale to any display and can be adjusted directly in code.
- Contributors can change the buddy's look via a formula, no design tools needed.

### Negative / Trade-offs
- The visual style is constrained by the generation algorithm; richer or more
  detailed art would require revisiting this decision.
- Anyone extending the art must understand the procedural approach rather than
  editing a familiar sprite sheet.
