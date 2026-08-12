# Project Entry: Stand Up Buddy

**Contract:** Entry
**Problem coordinated:** What is this project, and where do its durable truths live?

**Updated:** 2026-08-12

---

## Identity

A whimsical retro pixel-art tray app (Electron, macOS + Windows) that pops up
every so often to remind you to stand up and stretch. Lives in the menu bar / tray
with no dock icon. Character art and tray icon are generated procedurally at
runtime; the chiptune blip is synthesized live via the Web Audio API.

- **Product page for visitors:** [`README.md`](../../README.md) — install, usage, dev setup.
- **License:** MIT

## Where truths live (contract map)

| Responsibility | Contract | Location |
|----------------|----------|----------|
| Project identity / index | Entry | `docs/project/entry.md` (this file) |
| Decisions that constrain work | ADR | `docs/decisions/` |
| Session continuity | Handoff | `ai/handoff.md` |
| Quality gates | Review | via Anchor `review@1` capability |
| Product/install/dev docs | — | `README.md` |
| Build & release pipeline | — | `.github/workflows/build.yml`, `scripts/` |

## Adopted Anchor capabilities

Declared in [`.anchor/config.json`](../../.anchor/config.json):

- `orientation@1` — this Entry
- `decision@1` — ADRs in `docs/decisions/`
- `continuity@1` — Handoff at `ai/handoff.md`
- `review@1` — quality-gate reviews

## Orientation notes

- **Runtime:** Node.js 18+ (a pinned Node 20.18.1 is bundled locally under `.tools/node`).
- **Key source:** `src/trayIcon.js` and `src/popup/sprite.js` (procedural art),
  audio synthesized in the popup layer.
- **Not code-signed** — installers require local re-signing on first launch
  (see README + `scripts/fix-mac-security-block.command`).
