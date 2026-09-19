# Security Policy

## What Reverie is

Reverie is a desktop e-reader (Linux, Windows, macOS) built on [Readest](https://github.com/readest/readest)
with an on-device mood engine. It has **no backend, no accounts and no network access**: books, mood
timelines, settings and music all stay on the machine. Readest's online features are hidden in this
build, the app's Content Security Policy only allows local sources, and its HTTP permission list is
empty.

That removes most of Readest's threat model (cloud sync, authentication, translation services, online
catalogs). What remains is the code that reads files off your disk.

## Threat model

| Asset | Where it lives |
| --- | --- |
| Ebook files, covers, annotations | The app's data folder on your machine |
| Mood timelines (`mood.json` per book) | Alongside the book |
| Settings, including paths to your own music | The app's config folder |
| The mood model and built-in music | Inside the installed application |

| Risk | Mitigation |
| --- | --- |
| A malformed EPUB/PDF exploits the parser or runs script | Book content renders in a sandboxed iframe; the CSP blocks remote and inline execution paths; parsing happens in the webview, not the Rust process |
| A book or file path escapes the app's folders | File access is scoped to the app data directory plus the folders you explicitly pick; path traversal is rejected |
| A crafted audio file you add as a track | Audio is read as bytes and played through the browser's own decoder; no shell or external player is involved |
| The app phones home | No network permissions: local-only CSP, empty HTTP allow list, no telemetry, no updater. Nearby transfer (LocalSend) is opt-in and stays on your local network |
| Compromised dependency | `pnpm-lock.yaml` and `Cargo.lock` pin everything; Dependabot watches the repo |
| Tampered installer | Installers are built by GitHub Actions from this repo. They are **not code-signed**, so Windows and macOS will warn you; check the file against the release page before installing |

Out of scope: your operating system, physical access to your machine, and anything you install
yourself (including music files and dictionaries you add).

## Supported versions

Reverie is a small project with a single maintainer. Only the latest release gets fixes.

| Version | Supported |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

Vulnerabilities inherited from Readest are reported upstream at
<https://github.com/readest/readest/security/advisories/new> as well, since the fix belongs there.

## Reporting a vulnerability

Please report privately. Do not open a public issue or discussion.

Use GitHub's private vulnerability reporting:
<https://github.com/muq-s1d/reverie/security/advisories/new>

Include what the issue is, how to reproduce it, and which version and platform you tested.

What to expect: this is a hobby project, so replies are best-effort rather than guaranteed within a
fixed window. Accepted reports get a fix and a GitHub Security Advisory crediting you unless you
prefer otherwise; declined reports get an explanation. Please keep details private until a fix ships.
