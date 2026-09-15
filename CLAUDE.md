# Project: Reverie

## What We're Building
A desktop e-reader that plays background music matching the mood of what you're reading.
It is a **fork of [Readest](https://github.com/readest/readest)** with betterReading's mood engine
added on top, running **fully on-device**: no server, no upload, no network needed.

Sister project: `~/Projects/Personal/betterReading` (the web version). The mood logic,
emotion mapping, smoothing and music player are ported from there.

## Stack
- **App**: Readest fork. Next.js 16 + TypeScript UI, wrapped as a desktop app by Tauri v2 (Rust)
- **Book rendering**: foliate-js (git submodule in `packages/foliate-js`)
- **Mood model**: `monologg/bert-base-cased-goemotions-original`, converted to ONNX, run locally
- **Music**: Howler.js crossfade player (ported from betterReading)
- **No backend, no Supabase, no auth.** Everything stays on the user's machine.

## Key Rules
- **Mood feature is EPUB + PDF only.** Other formats (MOBI, CBZ, TXT…) open normally, no mood UI.
- **Keep mood code isolated.** All new code lives in its own folder (planned: `apps/readest-app/src/mood/`).
  Touch Readest's own files as little as possible, and list every touch point in `notes/plan.md`.
  This keeps pulling in upstream Readest updates manageable.
- **Never block the reader.** Book analysis runs in the background (web worker or Rust side).
  The book must be readable immediately; music starts once moods are ready.
- **License is AGPL-3.0** (inherited from Readest). The repo stays open source.

## Workflow Rules
- Branch per phase (`phase-N-<name>`). Never commit directly to main. Merge only when the user says so.
- Commit after each working chunk.
- `notes/` is local working notes. Never commit it (ignored in `.gitignore`). `docs/` belongs to Readest.
- After each phase, update `notes/plan.md` with what was built, bugs found, and decisions made.
- Never add Claude attribution to commits or PRs.
- Run a shutdown check (dev servers / Tauri processes) when the user signs off.

## Golden Rule
Spikes before building. Prove the two risky parts first (position matching, on-device model),
then build the vertical slice: **open book → analyse locally → read → mood music**.
One phase at a time. Do not skip ahead.

## Communication Style
- Explain things simply without jargon
- Concise over verbose, simple and direct
