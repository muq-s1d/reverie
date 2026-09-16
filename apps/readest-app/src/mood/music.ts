// Track lists and playback helpers, ported from betterReading frontend/lib/music.ts.
import { BUILT_IN_MUSIC } from './builtInMusic';
import type { Mood } from './moods';

export interface MusicSettings {
  enabled: boolean;
  volume: number; // 0..1
  muted: boolean;
  /** Guided tour seen (finished or skipped). */
  tourDone: boolean;
  /** Songs the user added per mood (absolute file paths). Played alongside the built-in tracks. */
  userTracks: Partial<Record<Mood, string[]>>;
  /** Track ids switched off (built-in `/music/...` paths or user file paths). */
  disabledTracks: string[];
}

// Off until the user opts in (onboarding tour or Settings → Music): no surprise sound.
export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  enabled: false,
  volume: 0.5,
  muted: false,
  tourDone: false,
  userTracks: {},
  disabledTracks: [],
};

const slug: Record<Mood, string> = {
  Joy: 'joy',
  Excitement: 'excitement',
  Anticipation: 'anticipation',
  'Wonder/Awe': 'wonder-awe',
  Mystery: 'mystery',
  Romance: 'romance',
  Tenderness: 'tenderness',
  'Peace/Calm': 'peace-calm',
  Neutral: 'neutral',
  Sadness: 'sadness',
  'Grief/Despair': 'grief-despair',
  Fear: 'fear',
  'Tension/Suspense': 'tension-suspense',
  Anger: 'anger',
  Disgust: 'disgust',
};

// A track id is either a built-in path served from public/music/, or a user's absolute file path.
export const isBuiltInTrack = (id: string) => id.startsWith('/music/');
const builtInId = (mood: Mood, file: string) => `/music/${slug[mood]}/${file}`;

/** Packaged tracks for the mood (public/music/<mood>/). Can't be removed, only switched off. */
export const builtInTracks = (mood: Mood): string[] =>
  BUILT_IN_MUSIC[mood].map((t) => builtInId(mood, t.file));

/** Title and artist: from the pack for built-ins, the file name for the user's songs. */
export const trackInfo = (id: string): { title: string; artist?: string } => {
  for (const [mood, tracks] of Object.entries(BUILT_IN_MUSIC) as [
    Mood,
    typeof BUILT_IN_MUSIC.Joy,
  ][]) {
    const track = tracks.find((t) => builtInId(mood, t.file) === id);
    if (track) return { title: track.title, artist: track.artist };
  }
  return { title: (id.split(/[\\/]/).pop() ?? id).replace(/\.[^.]+$/, '') };
};

/** Every track for the mood, switched on or off: built-in first, then the user's songs. */
export const moodTracks = (mood: Mood, settings: MusicSettings): string[] => [
  ...builtInTracks(mood),
  ...(settings.userTracks[mood] ?? []),
];

/** Tracks that may play for the mood. All switched off → Neutral's; those off too → none. */
export const playableTracks = (mood: Mood, settings: MusicSettings): string[] => {
  const on = (m: Mood) =>
    moodTracks(m, settings).filter((t) => !settings.disabledTracks.includes(t));
  const tracks = on(mood);
  return tracks.length || mood === 'Neutral' ? tracks : on('Neutral');
};

const TRACK_RANDOM_START_MIN_S = 20;
const TRACK_RANDOM_START_MAX_S = 40;
export const PREFETCH_COUNT = 2;

/** Skip slow intros: start somewhere in the first 20–40 s (never past halfway). */
export const pickRandomStart = (durationSeconds: number): number => {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  const maxStart = Math.min(TRACK_RANDOM_START_MAX_S, durationSeconds * 0.5);
  const minStart = Math.min(TRACK_RANDOM_START_MIN_S, maxStart);
  return minStart + Math.random() * (maxStart - minStart);
};

/** Random playable track, avoiding `exclude` (the one that just played) when possible. */
export const pickTrack = (mood: Mood, settings: MusicSettings, exclude?: string) => {
  const tracks = playableTracks(mood, settings);
  const choices = tracks.length > 1 ? tracks.filter((t) => t !== exclude) : tracks;
  return choices[Math.floor(Math.random() * choices.length)];
};
