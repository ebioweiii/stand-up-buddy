# ADR-003: Ship unsigned installers with a local re-signing fix

## Status
**Status:** Accepted
**Date:** 2026-08-12

## Context

Stand Up Buddy is distributed as downloadable installers (macOS `.dmg`,
Windows `.exe`) built by the tag-driven GitHub Actions pipeline. Operating
systems flag downloaded apps from unidentified developers:

- **macOS** applies a quarantine attribute to downloads. Without Apple
  notarization, Gatekeeper blocks the app — and on some macOS versions it does
  not even show the "unidentified developer" prompt; it moves the app straight
  to the Trash.
- **Windows** SmartScreen shows "Windows protected your PC" for unrecognized
  publishers.

Removing these warnings the official way requires **paid** credentials: an
Apple Developer ID (~$99/yr) plus notarization, and a Windows code-signing
certificate. This is a free, MIT-licensed hobby app, and paying for signing
certificates is out of scope.

## Decision

**We will ship unsigned installers and give users a one-time local re-signing
path, rather than paying for code-signing certificates, because the project is
free/hobby-scale and paid signing is out of scope — while still giving users a
clear, inspectable way to launch the app.**

For macOS we bundle `scripts/fix-mac-security-block.command` directly on the
DMG (next to the app and the `/Applications` link). It clears the quarantine
attribute (`xattr -cr`), removes stray `._*`/`.DS_Store` files, and ad-hoc
re-signs the app under the user's own machine authority
(`codesign --force --deep --sign -`), so macOS trusts it locally. The README
also documents the equivalent one-line Terminal command for users who prefer
it. For Windows, the README documents the SmartScreen **More info → Run
anyway** path. The fix script touches only Stand Up Buddy and is plain,
readable shell so users can inspect exactly what it does before running it.

See `scripts/fix-mac-security-block.command`, the `dmg.contents` entry in
`package.json`, and the "First-launch warning" section of `README.md`.

## Alternatives Considered

### Option A: Unsigned + local re-signing (chosen)
- **Pros:** $0 cost; no dependency on Apple/Windows developer accounts; keeps
  the project free and self-published; the fix is transparent and inspectable
  and only touches this app; documented Terminal fallback.
- **Cons:** First-launch friction and a scary-looking OS warning; users must
  run a script / extra steps and trust it; ad-hoc signing is per-machine, not a
  real trust chain; an ongoing support/documentation burden.

### Option B: Paid Apple Developer ID + notarization (and Windows cert)
- **Pros:** Clean first-launch experience; no user workarounds; higher
  perceived trust; notarization scans for known malware.
- **Cons:** Recurring cost (~$99/yr Apple + a Windows cert); account setup and
  a notarization step wired into CI; overkill for a free hobby app — out of
  scope.

### Option C: Distribute source only (users build/run locally)
- **Pros:** No signing needed at all; fully transparent.
- **Cons:** Requires Node.js and build tooling from every user; excludes
  non-technical users, who are much of the audience for a "stand up" nudge.

## Consequences

### Positive
- Releases stay free to produce and require no paid credentials or accounts.
- Users have a clear, documented, inspectable path to launch on both platforms.
- The fix is scoped to Stand Up Buddy and re-signs under the user's own
  authority, not a bundled or third-party key.

### Negative / Trade-offs
- First-launch friction and an alarming OS warning may cost some installs and
  generates support questions (a Friction Log candidate).
- Ad-hoc/local signing is not a genuine trust chain — it satisfies Gatekeeper
  on that machine but conveys no publisher identity.
- If the app ever needs auto-update or broad non-technical distribution, this
  decision should be revisited in favor of real signing/notarization.
