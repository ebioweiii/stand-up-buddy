# ADR-002: Synthesize the chiptune blip at runtime with Web Audio

## Status
**Status:** Accepted
**Date:** 2026-08-12

## Context

When a reminder pops up, Stand Up Buddy plays a short 8-bit "blip" to draw
attention. The conventional approach is to ship a small audio file (`.wav`/
`.mp3`/`.ogg`) and play it back through an `<audio>` element or decoded buffer.

ADR-001 established a broader principle — keep the app self-contained and free
of an external asset pipeline — and named runtime audio synthesis as part of
that direction. This ADR records the audio-specific decision on its own so the
sound layer has a durable rationale independent of the pixel-art choice: the
constraints differ (latency, autoplay policy, licensing, playback failure),
and the sound may evolve without revisiting the art decision.

The renderer already runs in a Chromium context, so the Web Audio API is
available with no added dependency.

## Decision

**We will synthesize the blip live with the Web Audio API — a short rising
square-wave arpeggio built from `OscillatorNode` + `GainNode` — rather than
bundling an audio file, because it keeps the app self-contained, adds no
dependency or asset-licensing concern, and lets the sound be tuned in code.**

The blip is a three-note arpeggio (660 → 880 → 1320 Hz) using `square`
oscillators with a fast exponential attack/decay envelope. Playback is wrapped
in a `try/catch` and treated as a nice-to-have: if audio fails (e.g. autoplay
restrictions, no output device), the popup still appears normally. A mute
toggle short-circuits playback. See `src/popup/popup.js` (`playBlipOnce`).

## Alternatives Considered

### Option A: Runtime synthesis via Web Audio (chosen)
- **Pros:** No bundled audio file; no codec/licensing concerns; the sound is
  defined in code and easy to tweak (notes, envelope, timbre); tiny footprint;
  no decode/network step, so effectively zero playback latency once the context
  is running.
- **Cons:** Sound design is bounded by what oscillators/envelopes can express
  (no sampled/recorded timbres); requires understanding Web Audio to change;
  subject to browser autoplay/gesture policies (mitigated by graceful failure).

### Option B: Bundled audio file
- **Pros:** Any sound is possible, including richly produced samples; familiar
  workflow; a sound designer can iterate without touching code.
- **Cons:** Adds a binary asset to bundle and version; codec/format and
  licensing considerations; another artifact that can drift from the code;
  conflicts with the self-contained direction from ADR-001.

## Consequences

### Positive
- The app ships with no audio files — fully self-contained, consistent with
  ADR-001.
- The blip can be redesigned by editing a few numbers (frequencies, envelope,
  waveform) rather than re-recording and re-bundling audio.
- Audio failure never blocks the core reminder — the popup is independent.

### Negative / Trade-offs
- The palette of achievable sounds is limited to synthesizable timbres; a
  richer, sampled sound would require revisiting this decision.
- Contributors must understand Web Audio scheduling (oscillators, gain
  envelopes, `currentTime`) rather than swapping an audio file.
