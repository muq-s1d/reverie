// Mood analysis for one book: chunk its text, classify each chunk off-thread, smooth, cache as mood.json.
// Resumable: progress is checkpointed to mood.partial.json, so a close/crash/reload loses little.
import type { BookDoc } from '@/libs/document';
import environmentConfig from '@/services/environment';
import { chunkSection } from '@/services/reedy/retrieval/CfiChunker';
import type { Book } from '@/types/book';
import { getDir } from '@/utils/book';
import { smoothMoods, type Mood } from './moods';
import { setMoodState, type MoodBookState, type MoodTimeline } from './store';
import type { MoodWorkerRequest, MoodWorkerResponse } from './worker';

// Bump when chunking or the model changes, so old caches are re-analysed.
const TIMELINE_VERSION = 1;

// ~187 words per chunk (betterReading), no overlap. Validated in the Phase 1 spike.
const CHUNK_OPTIONS = {
  maxChunkSize: 1100,
  minChunkSize: 200,
  overlapSize: 0,
  breakSearchRange: 150,
};

// Save progress every N chunks (~30 s of work).
const CHECKPOINT_EVERY = 50;

const timelinePath = (book: Book) => `${getDir(book)}/mood.json`;
const partialPath = (book: Book) => `${getDir(book)}/mood.partial.json`;

interface MoodPartial {
  version: number;
  /** Chunk count when saved: chunking is deterministic, so a mismatch means the book changed. */
  total: number;
  moods: Mood[];
}

/** State for a finished timeline. No chunks = no text layer (e.g. scanned PDF). */
export const timelineState = (timeline: MoodTimeline): MoodBookState =>
  timeline.chunks.length ? { status: 'ready', timeline } : { status: 'unavailable' };

export const loadCachedTimeline = async (book: Book): Promise<MoodTimeline | null> => {
  const timeline = await readJSON<MoodTimeline>(timelinePath(book));
  return timeline?.version === TIMELINE_VERSION ? timeline : null;
};

const readJSON = async <T>(path: string): Promise<T | null> => {
  const appService = await environmentConfig.getAppService();
  try {
    return JSON.parse((await appService.readFile(path, 'Books', 'text')) as string) as T;
  } catch {
    return null; // missing or unreadable
  }
};

const classify = (texts: string[], onMood: (mood: Mood) => void) =>
  new Promise<void>((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<MoodWorkerResponse>) => {
      if (data.type === 'mood') return onMood(data.mood);
      worker.terminate(); // frees the model's memory once the book is done
      if (data.type === 'done') resolve();
      else reject(new Error(data.message));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };
    worker.postMessage({ texts } satisfies MoodWorkerRequest);
  });

export const analyzeBook = async (book: Book, bookDoc: BookDoc) => {
  setMoodState(book.hash, { status: 'analysing', done: 0, total: 0 });
  const chunks = [];
  for (const [i, section] of bookDoc.sections.entries()) {
    try {
      chunks.push(...chunkSection(await section.createDocument(), i, '', book.hash, CHUNK_OPTIONS));
    } catch (err) {
      console.warn('[mood] could not read section', i, err);
    }
  }

  const appService = await environmentConfig.getAppService();
  let timeline: MoodTimeline = { version: TIMELINE_VERSION, chunks: [] };
  if (chunks.length) {
    const total = chunks.length;
    const partial = await readJSON<MoodPartial>(partialPath(book));
    const moods =
      partial?.version === TIMELINE_VERSION && partial.total === total ? partial.moods : [];
    setMoodState(book.hash, { status: 'analysing', done: moods.length, total });

    const checkpoint = () =>
      appService.writeFile(
        partialPath(book),
        'Books',
        JSON.stringify({ version: TIMELINE_VERSION, total, moods } satisfies MoodPartial),
      );
    await classify(
      chunks.slice(moods.length).map((c) => c.text),
      (mood) => {
        moods.push(mood);
        setMoodState(book.hash, { status: 'analysing', done: moods.length, total });
        if (moods.length % CHECKPOINT_EVERY === 0) {
          checkpoint().catch((err) => console.warn('[mood] checkpoint failed', err));
        }
      },
    );
    const smoothed = smoothMoods(moods);
    timeline = {
      version: TIMELINE_VERSION,
      chunks: chunks.map((c, i) => ({
        sectionIndex: c.sectionIndex,
        startCfi: c.startCfi,
        endCfi: c.endCfi,
        mood: moods[i]!,
        smoothed: smoothed[i]!,
      })),
    };
  }

  await appService.writeFile(timelinePath(book), 'Books', JSON.stringify(timeline));
  await appService.deleteFile(partialPath(book), 'Books').catch(() => {}); // may not exist
  setMoodState(book.hash, timelineState(timeline));
};
