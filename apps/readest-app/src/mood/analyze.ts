// Mood analysis for one book: chunk its text, classify each chunk off-thread, smooth, cache as mood.json.
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

const timelinePath = (book: Book) => `${getDir(book)}/mood.json`;

/** State for a finished timeline. No chunks = no text layer (e.g. scanned PDF). */
export const timelineState = (timeline: MoodTimeline): MoodBookState =>
  timeline.chunks.length ? { status: 'ready', timeline } : { status: 'unavailable' };

export const loadCachedTimeline = async (book: Book): Promise<MoodTimeline | null> => {
  const appService = await environmentConfig.getAppService();
  const path = timelinePath(book);
  try {
    const timeline = JSON.parse(
      (await appService.readFile(path, 'Books', 'text')) as string,
    ) as MoodTimeline;
    return timeline.version === TIMELINE_VERSION ? timeline : null;
  } catch {
    return null; // not analysed yet
  }
};

const classify = (texts: string[], onProgress: (done: number) => void) =>
  new Promise<Mood[]>((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<MoodWorkerResponse>) => {
      if (data.type === 'progress') return onProgress(data.done);
      worker.terminate(); // frees the model's memory once the book is done
      if (data.type === 'done') resolve(data.moods);
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

  let timeline: MoodTimeline = { version: TIMELINE_VERSION, chunks: [] };
  if (chunks.length) {
    const total = chunks.length;
    const moods = await classify(
      chunks.map((c) => c.text),
      (done) => setMoodState(book.hash, { status: 'analysing', done, total }),
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

  const appService = await environmentConfig.getAppService();
  await appService.writeFile(timelinePath(book), 'Books', JSON.stringify(timeline));
  setMoodState(book.hash, timelineState(timeline));
};
