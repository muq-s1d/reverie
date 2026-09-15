import { create } from 'zustand';
import type { Mood } from './moods';

export interface MoodChunk {
  sectionIndex: number;
  startCfi: string;
  endCfi: string;
  mood: Mood;
  /** After window-3 smoothing: what the music follows. */
  smoothed: Mood;
}

export interface MoodTimeline {
  version: number;
  chunks: MoodChunk[];
}

export type MoodBookState =
  | { status: 'queued' }
  | { status: 'analysing'; done: number; total: number }
  | { status: 'ready'; timeline: MoodTimeline; format: 'EPUB' | 'PDF' }
  // No text layer (e.g. scanned PDF): mood unavailable, the book still reads normally.
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export const useMoodStore = create<{ books: Record<string, MoodBookState> }>(() => ({ books: {} }));

export const setMoodState = (hash: string, state: MoodBookState) =>
  useMoodStore.setState((s) => ({ books: { ...s.books, [hash]: state } }));
