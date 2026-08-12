# Handoff

**Contract:** Handoff
**Problem coordinated:** What changed recently? What's next?

**Updated:** 2026-08-12

---

## Overview (paste)

Overview is a projection of the current Handoff. Do not edit it independently.
Generate it from Delta, Horizon, Blocked, and Next.

```text
## Overview — 2026-08-12

Completed
- Adopted Anchor: init, MCP wiring, Project Entry, ADR-001
- Recorded ADR-002 (runtime chiptune synthesis) and ADR-003 (unsigned + local re-signing)

In Progress
- None

Blocked
- None

Next
- Commit the untracked Anchor scaffolding (.anchor/, .mcp.json, ai/, docs/, marketing/)
```

---

## Delta

<What changed this session. One bullet per meaningful change. Newest first.>

- Recorded ADR-002 (`docs/decisions/ADR-002-runtime-chiptune-synthesis.md`) —
  synthesize the blip live via Web Audio vs. bundling an audio file.
- Recorded ADR-003 (`docs/decisions/ADR-003-unsigned-with-local-resigning.md`) —
  ship unsigned installers + local re-signing vs. paid code signing.
- Adopted Anchor coordination runtime: installed `@jon4ohio/anchor-runtime`,
  ran `anchor init` (`.anchor/config.json`), and wired the MCP server into
  `.mcp.json` using the bundled Node's absolute path.
- Created Project Entry (`docs/project/entry.md`) mapping where truths live.
- Recorded ADR-001 — procedural pixel art & runtime audio synthesis.

## Horizon

<What is active now. Ordered. 1–7 items.>

1. Commit the untracked Anchor scaffolding once reviewed.

## Next

<Concrete, actionable next steps.>

- Commit the untracked Anchor scaffolding (`.anchor/`, `.mcp.json`, `ai/`,
  `docs/`, `marketing/`) — currently unversioned.
- Consider whether ADR-001's audio mention should point to ADR-002 (now the
  authoritative record for the sound decision).

## Blocked

<What cannot proceed, and on what. Or "None".>

- None

## Roadmap

- **Release:** No release in progress; tag-driven pipeline (`v*`) builds installers.
- **Focus:** Establishing Anchor contracts (Entry, ADRs, Handoff).
- **Out of scope:** Paid code signing; migrating existing docs into new structure.

---

## Friction Log

<Repeated coordination friction. Fill the Contract column when it maps to one.>

| Date | Repeated explanation | Contract | Root cause | Action |
|---|---|---|---|---|
| 2026-08-12 | Node/npm not on global PATH; only bundled in `.tools/node` | — | No system Node install | `.mcp.json` uses absolute bundled-node path |

**Graduation rule:** Unchanged items after three cycles promote to another contract or are deleted.
