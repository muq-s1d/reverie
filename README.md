<div align="center">
  <img src="apps/readest-app/src-tauri/icons/icon.png" alt="Reverie icon" width="120" />
  <h1>Reverie</h1>

An e-reader that plays music matching the mood of what you're reading.<br>
Everything runs on your computer: no account, no server, no internet needed.

[![AGPL Licence](https://img.shields.io/badge/license-AGPL--3.0-teal)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Linux%2C%20Windows%2C%20macOS-green)](#download)

</div>

Reverie is built on [Readest](https://github.com/readest/readest), an open-source ebook reader. It adds a
mood engine: when you open a book, Reverie reads it in the background, works out the mood of each passage,
and crossfades between soundtracks as you turn the pages.

## How it works

1. **Import a book.** EPUB and PDF books get mood music. Other formats open normally, without music.
2. **Keep reading.** The book opens straight away. In the background, Reverie splits it into short passages
   and runs an emotion model on each one, entirely on your machine. It picks up where it left off if you close
   the app mid-way.
3. **Hear the mood.** As you read, the thin line at the top of the page takes the colour of the current mood
   and the music crossfades to match. There are 15 moods:

   Joy · Excitement · Anticipation · Wonder/Awe · Mystery · Romance · Tenderness · Peace/Calm · Neutral ·
   Sadness · Grief/Despair · Fear · Tension/Suspense · Anger · Disgust

Music is off until you turn it on, either from the short tour the first time you open a book or in
**Settings → Music**.

## Features

- **On-device mood analysis.** A BERT emotion model ([GoEmotions][goemotions]) runs inside the app. Your books
  never leave your computer.
- **60 built-in tracks**, four per mood, by Scott Buckley and Kevin MacLeod (CC-BY 4.0).
- **Your own songs.** Add music files to any mood, preview tracks, and switch any track on or off in
  **Settings → Music → Tracks**.
- **Fully offline.** Readest's online features (accounts, cloud sync, AI, translation, online catalogs,
  telemetry) are hidden, and the app is blocked from reaching the internet. Nearby transfer over your local
  network (LocalSend) still works.
- **Everything Readest does offline:** EPUB, PDF, MOBI, AZW3, FB2, CBZ, TXT and Markdown; highlights, notes and
  bookmarks; full-text search; imported dictionaries; system text-to-speech; themes, fonts and layout options.

## Download

Installers for Linux, Windows and macOS are coming soon on the [Releases page][releases].

## Building from source

Reverie is a Next.js + Tauri app, so you need the same setup as Readest: Node.js, pnpm and Rust
(see Readest's [getting started guide](CONTRIBUTING.md#getting-started) for platform requirements).

```bash
git clone --recurse-submodules https://github.com/muq-s1d/reverie.git
cd reverie
pnpm install
pnpm --filter @readest/readest-app setup-vendors
```

The mood model (~220 MB) and music (~190 MB) are too big for git, so they are fetched separately:

```bash
# Music: downloads the 60 tracks and converts them to MP3 (needs curl and ffmpeg)
python3 tools/mood-music/install.py

# Model: exports the model to ONNX (needs Python with optimum, onnx, onnxconverter-common and onnxruntime),
# then copies it into the app
python tools/mood-model/convert.py
sh tools/mood-model/install.sh
```

Then run the desktop app:

```bash
cd apps/readest-app
pnpm tauri dev
```

The mood code lives in [`apps/readest-app/src/mood/`](apps/readest-app/src/mood/), kept separate from
Readest's own code so Readest updates can still be merged in.

## Credits

- **[Readest](https://github.com/readest/readest)** by Bilingify LLC, the reader Reverie is built on (AGPL-3.0).
  It in turn builds on [foliate-js](https://github.com/johnfactotum/foliate-js).
- **Mood model:** [`monologg/bert-base-cased-goemotions-original`][model], a BERT model fine-tuned on Google's
  [GoEmotions][goemotions] dataset.
- **Music:** Scott Buckley and Kevin MacLeod (incompetech.com), CC-BY 4.0. Every track is listed in
  [CREDITS.md](apps/readest-app/public/music/CREDITS.md).
- Mood engine ported from [betterReading](https://github.com/muq-s1d/betterReading), the web version of this idea.

## License

Reverie is free software under the [GNU Affero General Public License v3.0](LICENSE), the same license as
Readest. You can use, change and share it under those terms. Readest's own licenses for the libraries and
fonts it uses still apply; see the [Readest README](https://github.com/readest/readest#license).

[releases]: https://github.com/muq-s1d/reverie/releases
[model]: https://huggingface.co/monologg/bert-base-cased-goemotions-original
[goemotions]: https://github.com/google-research/google-research/tree/master/goemotions
