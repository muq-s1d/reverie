# Reverie — Project Spec

## Overview
A desktop e-reader (Readest fork) where background music adapts to the emotional tone of the
book. When the user opens an EPUB or PDF, the app chunks the text and classifies each chunk's
mood **on the device**, then crossfades ambient music as the user reads.

## Core User Flow
1. User adds an EPUB or PDF to their library (normal Readest flow)
2. App analyses the book in the background, locally (progress shown, reading not blocked)
3. User reads. The app knows where they are, looks up that part's mood
4. Music crossfades to match. Mood result is cached, so the book is only analysed once

## Emotion Categories (15)
Joy · Excitement · Anticipation · Wonder/Awe · Mystery · Romance · Tenderness · Peace/Calm ·
Neutral · Sadness · Grief/Despair · Fear · Tension/Suspense · Anger · Disgust

## Phase Checklist

### Phase 0 — Fork + Build
- [x] Own repo muq-s1d/reverie from readest/readest (not a GitHub fork), with submodules
- [x] Get `tauri dev` running on Linux, untouched
- [x] Find how Readest stores per-book data locally (where to cache mood results)
- [x] Find where foliate-js reports reading position (`relocate` event) in Readest

### Phase 1 — Spike A: Position Matching
- [ ] Extract text per section from foliate-js's parsed book (EPUB chapter / PDF page)
- [ ] Chunk each section, tag chunks with `{ sectionIndex, startOffset, endOffset }`
- [ ] While scrolling/paging, log "section X, Y% through → chunk N"
- [ ] Verify by eye on one EPUB and one PDF that the chunk matches what's on screen

### Phase 2 — Spike B: On-Device Model
- [x] Convert model to ONNX (HF `optimum`), try full + int8-quantized versions
- [x] Run it on the test book, compare against Python results (Neutral % ≈ 41.8%, label agreement)
- [x] Measure speed + memory on CPU; pick runtime (transformers.js in a worker vs `ort` in Rust)
- [x] Decide: bundle model in installer vs download once on first use → bundle fp16 (218 MB)

### Phase 3 — Local Mood Pipeline
- [x] Reuse Readest's CfiChunker; port 28→15 emotion map, Neutral threshold (0.70), smoothing (window 3) to TypeScript
- [x] Background analysis job with progress, EPUB/PDF only
- [x] Cache mood timeline per book; skip re-analysis on reopen

### Phase 4 — Reader Integration
- [x] Current position → chunk → smoothed mood
- [x] Mood indicator in the reader UI
- [x] Mood UI hidden for non-EPUB/PDF formats

### Phase 5 — Music Engine
- [ ] Port `useMoodPlayer` (dual Howl crossfade, prefetch, fade-leak fix)
- [ ] Ship default CC0/CC-BY mood tracks (see notes/plan.md sources); credit each
- [ ] Custom music folder per mood (user picks a local folder)
- [ ] Music settings (on/off, volume, mute) in Readest's settings UI

### Phase 6 — Polish + Packaging
- [ ] Installers: Linux (AppImage/deb), Windows, macOS
- [ ] App size check (model + ~204MB music)
- [ ] Rename/rebrand from Readest (name, icon, app id), keep AGPL notices
- [ ] End-to-end test on a fresh machine, offline
