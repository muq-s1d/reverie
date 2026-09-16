// Mood music player: dual-Howl crossfade. Ported from betterReading frontend/lib/useMoodPlayer.ts,
// keeping its fixes (fading-track leak, superseded loads, load-error fallback, autoplay gate).
// Changes: typed moods, `mood: null` = silence (book not analysed yet), one player per window.
import { Howl } from 'howler';
import { useEffect, useRef } from 'react';
import type { Mood } from './moods';
import {
  type MusicSettings,
  moodTracks,
  PREFETCH_COUNT,
  pickRandomStart,
  pickTrack,
} from './music';

const CROSSFADE_MS = 2500;
const MOOD_CHANGE_DEBOUNCE_MS = 2000;
const FADE_STEP_MS = CROSSFADE_MS / 50;
const PRELOAD_CACHE_LIMIT = 4;

// Readest can show several books side by side; only the first mounted player makes sound.
let activeOwner: symbol | null = null;

// Webviews can block audio until the user interacts. `userActivation` is the browser's own sticky flag:
// set by a click/key anywhere in the app (including inside the book's iframe, which document
// listeners can't see) and kept for the whole session, so reopening a book plays right away.
const hasUserActivation = () => navigator.userActivation?.hasBeenActive ?? true;

export function useMoodPlayer(mood: Mood | null, settings: MusicSettings) {
  const ownerRef = useRef(Symbol('mood-player'));
  const currentHowlRef = useRef<Howl | null>(null);
  const nextHowlRef = useRef<Howl | null>(null);
  const lastPlayedTrackRef = useRef('');
  const currentTrackSrcRef = useRef('');
  const nextTrackSrcRef = useRef('');
  const preloadCacheRef = useRef(new Map<string, Howl>());
  const moodChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeIntervalsRef = useRef(new Set<ReturnType<typeof setInterval>>());
  // Old tracks still fading out. Not in current/next refs, so without this set they'd be orphaned:
  // left playing after leaving the reader, or stacked under a new crossfade.
  const fadingHowlsRef = useRef(new Set<Howl>());
  const lastMoodRef = useRef(mood);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const pendingPlaybackRef = useRef<(() => void) | null>(null);

  const isOwner = () => {
    activeOwner ??= ownerRef.current;
    return activeOwner === ownerRef.current;
  };

  const cleanup = (howl: Howl | null) => {
    if (!howl) return;
    // Strip listeners first: unload() can async-fire load/loaderror for in-flight requests.
    howl.off();
    howl.stop();
    howl.unload();
    fadingHowlsRef.current.delete(howl);
  };

  const trackInterval = (id: ReturnType<typeof setInterval>) => fadeIntervalsRef.current.add(id);
  const clearTrackedInterval = (id: ReturnType<typeof setInterval>) => {
    clearInterval(id);
    fadeIntervalsRef.current.delete(id);
  };

  const preloadTrack = (src: string) => {
    const cache = preloadCacheRef.current;
    if (cache.has(src) || currentTrackSrcRef.current === src || nextTrackSrcRef.current === src)
      return;
    if (cache.size >= PRELOAD_CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest) {
        cleanup(cache.get(oldest) ?? null);
        cache.delete(oldest);
      }
    }
    cache.set(src, new Howl({ src, loop: true, volume: 0, preload: true, html5: true }));
  };

  const prefetchUpcoming = (forMood: Mood, exclude: string) =>
    moodTracks(forMood)
      .filter((t) => t !== exclude)
      .slice(0, PREFETCH_COUNT)
      .forEach(preloadTrack);

  const startCrossfade = (
    newTrack: string,
    newMood: Mood,
    triedTracks = new Set<string>(),
    neutralFallbackUsed = false,
  ) => {
    // Discard any in-flight load for a previous mood change.
    if (nextHowlRef.current) {
      cleanup(nextHowlRef.current);
      nextHowlRef.current = null;
      nextTrackSrcRef.current = '';
    }
    // Hard-stop leftovers from a superseded crossfade (the audible track isn't in this set yet).
    fadingHowlsRef.current.forEach((h) => cleanup(h));
    fadingHowlsRef.current.clear();

    let newHowl = preloadCacheRef.current.get(newTrack);
    if (newHowl) preloadCacheRef.current.delete(newTrack);
    else newHowl = new Howl({ src: newTrack, loop: true, volume: 0, preload: true, html5: true });
    const howl = newHowl;

    nextHowlRef.current = howl;
    nextTrackSrcRef.current = newTrack;

    const onReady = () => {
      if (nextHowlRef.current !== howl) return cleanup(howl); // superseded while loading
      const oldHowl = currentHowlRef.current;
      howl.seek(pickRandomStart(howl.duration()));

      const beginPlayback = () => {
        howl.play();
        const fadeIn: ReturnType<typeof setInterval> = setInterval(() => {
          const target = settingsRef.current.muted ? 0 : settingsRef.current.volume;
          if (howl.volume() < target) howl.volume(Math.min(howl.volume() + 0.05, target));
          else clearTrackedInterval(fadeIn);
        }, FADE_STEP_MS);
        trackInterval(fadeIn);

        if (oldHowl) {
          fadingHowlsRef.current.add(oldHowl);
          const fadeOut: ReturnType<typeof setInterval> = setInterval(() => {
            if (oldHowl.volume() > 0) {
              oldHowl.volume(Math.max(oldHowl.volume() - 0.05, 0));
            } else {
              clearTrackedInterval(fadeOut);
              cleanup(oldHowl);
            }
          }, FADE_STEP_MS);
          trackInterval(fadeOut);
        }
      };

      // No interaction yet: defer instead of failing silently.
      if (!hasUserActivation()) {
        pendingPlaybackRef.current = beginPlayback;
        if (oldHowl) cleanup(oldHowl);
      } else {
        beginPlayback();
      }

      currentHowlRef.current = howl;
      currentTrackSrcRef.current = newTrack;
      nextHowlRef.current = null;
      nextTrackSrcRef.current = '';
      lastPlayedTrackRef.current = newTrack;
      prefetchUpcoming(newMood, newTrack);
    };

    if (howl.state() === 'loaded') onReady();
    else howl.once('load', onReady);

    howl.on('loaderror', () => {
      console.warn('[mood] failed to load track', newTrack);
      if (nextHowlRef.current === howl) {
        nextHowlRef.current = null;
        nextTrackSrcRef.current = '';
      }
      cleanup(howl);
      const tried = new Set(triedTracks).add(newTrack);
      const remaining = moodTracks(newMood).filter((t) => !tried.has(t));
      if (remaining.length) {
        const fallback = remaining[Math.floor(Math.random() * remaining.length)]!;
        return startCrossfade(fallback, newMood, tried, neutralFallbackUsed);
      }
      // Every track for this mood failed: try one Neutral track, then give up quietly.
      if (!neutralFallbackUsed && newMood !== 'Neutral') {
        startCrossfade(pickTrack('Neutral'), newMood, tried, true);
      }
    });
  };

  // Mood-driven playback: crossfade as the mood changes.
  useEffect(() => {
    if (!isOwner()) return;
    if (!settings.enabled || !mood) {
      if (currentHowlRef.current?.playing()) currentHowlRef.current.pause();
      return;
    }
    if (moodChangeTimeoutRef.current) {
      clearTimeout(moodChangeTimeoutRef.current);
      moodChangeTimeoutRef.current = null;
    }
    // Nothing loaded yet (first enable, or reader just opened): start now.
    if (!currentHowlRef.current && !nextHowlRef.current) {
      lastMoodRef.current = mood;
      startCrossfade(pickTrack(mood, lastPlayedTrackRef.current), mood);
      return;
    }
    // Same mood: resume if paused.
    if (mood === lastMoodRef.current) {
      if (currentHowlRef.current && !currentHowlRef.current.playing())
        currentHowlRef.current.play();
      return;
    }
    // Mood changed: wait a moment so turning pages near a boundary doesn't flip-flop the music.
    lastMoodRef.current = mood;
    moodChangeTimeoutRef.current = setTimeout(() => {
      if (settingsRef.current.enabled)
        startCrossfade(pickTrack(mood, lastPlayedTrackRef.current), mood);
    }, MOOD_CHANGE_DEBOUNCE_MS);
  }, [mood, settings.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start deferred playback as soon as the user has interacted anywhere.
  useEffect(() => {
    const id = setInterval(() => {
      const pending = pendingPlaybackRef.current;
      if (!pending || !hasUserActivation()) return;
      pendingPlaybackRef.current = null;
      pending();
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Volume / mute apply live.
  useEffect(() => {
    currentHowlRef.current?.volume(settings.muted ? 0 : settings.volume);
  }, [settings.volume, settings.muted]);

  // Teardown. Refs reset to null so React's dev remount starts playback again.
  useEffect(() => {
    const owner = ownerRef.current;
    return () => {
      if (activeOwner === owner) activeOwner = null;
      if (moodChangeTimeoutRef.current) clearTimeout(moodChangeTimeoutRef.current);
      moodChangeTimeoutRef.current = null;
      fadeIntervalsRef.current.forEach((id) => clearInterval(id));
      fadeIntervalsRef.current.clear();
      fadingHowlsRef.current.forEach((h) => cleanup(h));
      fadingHowlsRef.current.clear();
      cleanup(currentHowlRef.current);
      cleanup(nextHowlRef.current);
      currentHowlRef.current = null;
      nextHowlRef.current = null;
      currentTrackSrcRef.current = '';
      nextTrackSrcRef.current = '';
      preloadCacheRef.current.forEach((h) => cleanup(h));
      preloadCacheRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
