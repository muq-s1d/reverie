// Track lists and playback helpers, ported from betterReading frontend/lib/music.ts.
import type { Mood } from './moods';

export interface MusicSettings {
  enabled: boolean;
  volume: number; // 0..1
  muted: boolean;
}

// Off until the user opts in (onboarding tour or Settings → Music): no surprise sound.
export const DEFAULT_MUSIC_SETTINGS: MusicSettings = { enabled: false, volume: 0.5, muted: false };

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

// Served from public/music/<mood>/track-N.mp3. Neutral has 5, the rest 3.
export const moodTracks = (mood: Mood): string[] =>
  Array.from(
    { length: mood === 'Neutral' ? 5 : 3 },
    (_, i) => `/music/${slug[mood]}/track-${i + 1}.mp3`,
  );

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

/** Random track for the mood, avoiding `exclude` (the one that just played) when possible. */
export const pickTrack = (mood: Mood, exclude?: string): string => {
  const tracks = moodTracks(mood);
  const choices = tracks.length > 1 ? tracks.filter((t) => t !== exclude) : tracks;
  return choices[Math.floor(Math.random() * choices.length)]!;
};
