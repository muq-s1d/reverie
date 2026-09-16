// Track lists and playback helpers, ported from betterReading frontend/lib/music.ts.
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
/** Display name: "Track 2" for built-ins (titles come with the CC pack), file name for user songs. */
export const trackName = (id: string) =>
  isBuiltInTrack(id) ? null : (id.split(/[\\/]/).pop() ?? id).replace(/\.[^.]+$/, '');

/** Packaged tracks: public/music/<mood>/track-N.mp3. Neutral has 5, the rest 3. Can't be removed. */
export const builtInTracks = (mood: Mood): string[] =>
  Array.from(
    { length: mood === 'Neutral' ? 5 : 3 },
    (_, i) => `/music/${slug[mood]}/track-${i + 1}.mp3`,
  );

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
