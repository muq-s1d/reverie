// Mood entry point: a background queue that analyses every EPUB/PDF in the library, one at a time.
// Imported once from components/Providers.tsx. UI components only read the store, so Readest's
// tests that mock stores can still render them. Never blocks the reader.
//
// Only the main window runs the queue. Readest opens each book in its own window by default, and
// every window loads the whole library, so before this each window analysed the library in
// parallel and the book being read waited behind another one. Book windows now mirror the main
// window's state over Tauri events and tell it which book they opened.
import { emit, emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DocumentLoader } from '@/libs/document';
import environmentConfig, { isTauriAppPlatform } from '@/services/environment';
import { useBookDataStore } from '@/store/bookDataStore';
import { useLibraryStore } from '@/store/libraryStore';
import type { Book } from '@/types/book';
import { analyzeBook, loadCachedTimeline, timelineState } from './analyze';
import { registerLibraryCloseGuard } from './closeGuard';
import { type MoodBookState, setMoodState, useMoodStore } from './store';

const STATE_EVENT = 'reverie-mood-state'; // main → all windows: { hash, state }
const OPEN_EVENT = 'reverie-mood-open'; // book window → main: hash of a book that needs analysis

const pending: string[] = []; // book hashes, next first
const opened = new Set<string>(); // books opened in any window: they go first
let running = false;
let current: AbortController | null = null; // the analysis in progress

// Only local EPUB/PDF files. Everything else never opens a doc or loads the model.
// `url` marks feeds, OPDS streams and remote books: stored as EPUB, but analysing them would
// download/stream content. `convertedFromTxt`: Readest turns .txt imports into EPUBs.
const isMoodBook = (book: Book) =>
  !book.deletedAt &&
  !book.url &&
  !book.convertedFromTxt &&
  (book.format === 'EPUB' || book.format === 'PDF');

const analyzeNext = async (hash: string, signal: AbortSignal) => {
  const book = useLibraryStore.getState().library.find((b) => b.hash === hash);
  if (!book) return;

  const cached = await loadCachedTimeline(book);
  if (cached) return setMoodState(hash, timelineState(book, cached));

  // Reuse the reader's parsed book if it's open; otherwise open it just for analysis.
  const openDoc = useBookDataStore.getState().getBookData(hash)?.bookDoc;
  if (openDoc) return analyzeBook(book, openDoc, signal);

  const appService = await environmentConfig.getAppService();
  const { file } = await appService.loadBookContent(book);
  const { book: bookDoc } = await new DocumentLoader(file).open();
  try {
    await analyzeBook(book, bookDoc, signal);
  } finally {
    await bookDoc.destroy?.(); // PDFs hold a pdf.js worker until destroyed
  }
};

const run = async () => {
  if (running) return;
  running = true;
  while (pending.length) {
    const hash = pending.shift()!;
    const abort = (current = new AbortController());
    await analyzeNext(hash, abort.signal).catch((err) => {
      if (abort.signal.aborted) {
        // A book was just opened and took over. This one resumes from its checkpoint next.
        pending.splice(1, 0, hash);
        return setMoodState(hash, { status: 'queued' });
      }
      // e.g. cloud-only book with no local file: skip it this session.
      console.warn('[mood] analysis failed', hash, err);
      setMoodState(hash, { status: 'error', message: String(err) });
    });
  }
  current = null;
  running = false;
};

// Move a waiting book to the front and stop the current one so it starts now.
const bump = (hash: string) => {
  const at = pending.indexOf(hash);
  if (at === -1) return; // ready, failed, already analysing, or its cache check is still running
  pending.unshift(...pending.splice(at, 1));
  current?.abort();
};

const open = (hash: string) => {
  opened.add(hash);
  bump(hash);
};

// Already-analysed books are ready right away; only books without a cached timeline wait in the
// one-at-a-time queue (a cache load must never wait behind another book's 7-minute analysis).
const enqueueLibrary = (library: Book[]) => {
  const { books } = useMoodStore.getState();
  for (const book of library) {
    if (!isMoodBook(book) || books[book.hash]) continue;
    setMoodState(book.hash, { status: 'queued' });
    void loadCachedTimeline(book).then((cached) => {
      if (cached) return setMoodState(book.hash, timelineState(book, cached));
      pending.push(book.hash);
      if (opened.has(book.hash)) bump(book.hash);
      void run();
    });
  }
};

const runMainWindow = (tauri: boolean) => {
  enqueueLibrary(useLibraryStore.getState().library);
  useLibraryStore.subscribe(({ library }, prev) => {
    if (library !== prev.library) enqueueLibrary(library);
  });

  // A book opened in this window jumps the queue (once: this fires on every booksData change).
  useBookDataStore.subscribe(({ booksData }) => {
    for (const id of Object.keys(booksData)) if (!opened.has(id)) open(id);
  });
  if (!tauri) return;

  useMoodStore.subscribe(({ books }, prev) => {
    for (const [hash, state] of Object.entries(books)) {
      if (state !== prev.books[hash]) void emit(STATE_EVENT, { hash, state });
    }
  });
  void listen<string>(OPEN_EVENT, ({ payload: hash }) => {
    open(hash);
    const state = useMoodStore.getState().books[hash];
    if (state) void emit(STATE_EVENT, { hash, state }); // the new window has nothing yet
  });
};

// ponytail: with the main window closed, nothing analyses until it's back (Readest reopens it
// on "go to library"). Analyse in the book window then if people really close the library.
const runBookWindow = () => {
  void listen<{ hash: string; state: MoodBookState }>(STATE_EVENT, ({ payload }) =>
    setMoodState(payload.hash, payload.state),
  );
  const seen = new Set<string>();
  useBookDataStore.subscribe(({ booksData }) => {
    for (const hash of Object.keys(booksData)) {
      if (seen.has(hash)) continue;
      const book = useLibraryStore.getState().library.find((b) => b.hash === hash);
      if (!book) continue; // library not loaded yet: try again on the next change
      seen.add(hash);
      if (!isMoodBook(book)) continue;
      // Cached timelines load here, so music works even without the main window.
      void loadCachedTimeline(book).then((cached) => {
        if (cached) return setMoodState(hash, timelineState(book, cached));
        void emitTo('main', OPEN_EVENT, hash);
      });
    }
  });
};

// Browser only: Providers also renders on the server, where there is no library or window.
if (typeof window !== 'undefined') {
  const tauri = isTauriAppPlatform();
  if (!tauri || getCurrentWindow().label === 'main') runMainWindow(tauri);
  else runBookWindow();

  if (tauri) {
    registerLibraryCloseGuard().catch((err) =>
      console.warn('[mood] close guard not registered', err),
    );
  }
}
