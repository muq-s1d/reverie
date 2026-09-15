// Mood entry point: a background queue that analyses every EPUB/PDF in the library, one at a time.
// Imported once from components/Providers.tsx. UI components only read the store, so Readest's
// tests that mock stores can still render them. Never blocks the reader.
import { DocumentLoader } from '@/libs/document';
import environmentConfig, { isTauriAppPlatform } from '@/services/environment';
import { useBookDataStore } from '@/store/bookDataStore';
import { useLibraryStore } from '@/store/libraryStore';
import type { Book } from '@/types/book';
import { analyzeBook, loadCachedTimeline, timelineState } from './analyze';
import { registerLibraryCloseGuard } from './closeGuard';
import { setMoodState, useMoodStore } from './store';

const pending: string[] = []; // book hashes, next first
let running = false;

// Only local EPUB/PDF files. Everything else never opens a doc or loads the model.
// `url` marks feeds, OPDS streams and remote books: stored as EPUB, but analysing them would
// download/stream content. `convertedFromTxt`: Readest turns .txt imports into EPUBs.
const isMoodBook = (book: Book) =>
  !book.deletedAt &&
  !book.url &&
  !book.convertedFromTxt &&
  (book.format === 'EPUB' || book.format === 'PDF');

const analyzeNext = async (hash: string) => {
  const book = useLibraryStore.getState().library.find((b) => b.hash === hash);
  if (!book) return;

  const cached = await loadCachedTimeline(book);
  if (cached) return setMoodState(hash, timelineState(cached));

  // Reuse the reader's parsed book if it's open; otherwise open it just for analysis.
  const openDoc = useBookDataStore.getState().getBookData(hash)?.bookDoc;
  if (openDoc) return analyzeBook(book, openDoc);

  const appService = await environmentConfig.getAppService();
  const { file } = await appService.loadBookContent(book);
  const { book: bookDoc } = await new DocumentLoader(file).open();
  try {
    await analyzeBook(book, bookDoc);
  } finally {
    await bookDoc.destroy?.(); // PDFs hold a pdf.js worker until destroyed
  }
};

const run = async () => {
  if (running) return;
  running = true;
  while (pending.length) {
    const hash = pending.shift()!;
    await analyzeNext(hash).catch((err) => {
      // e.g. cloud-only book with no local file: skip it this session.
      console.warn('[mood] analysis failed', hash, err);
      setMoodState(hash, { status: 'error', message: String(err) });
    });
  }
  running = false;
};

// Imported and existing books join the back of the queue.
const enqueueLibrary = (library: Book[]) => {
  const { books } = useMoodStore.getState();
  for (const book of library) {
    if (!isMoodBook(book) || books[book.hash]) continue;
    setMoodState(book.hash, { status: 'queued' });
    pending.push(book.hash);
  }
  void run();
};
// Browser only: Providers also renders on the server, where there is no library or window.
if (typeof window !== 'undefined') {
  enqueueLibrary(useLibraryStore.getState().library);
  useLibraryStore.subscribe(({ library }, prev) => {
    if (library !== prev.library) enqueueLibrary(library);
  });

  // A book opened in the reader jumps the queue.
  useBookDataStore.subscribe(({ booksData }) => {
    for (const id of Object.keys(booksData)) {
      const at = pending.indexOf(id);
      if (at > 0) pending.unshift(...pending.splice(at, 1));
    }
  });

  if (isTauriAppPlatform()) {
    registerLibraryCloseGuard().catch((err) =>
      console.warn('[mood] close guard not registered', err),
    );
  }
}
