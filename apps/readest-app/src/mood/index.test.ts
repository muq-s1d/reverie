// The queue: the book being read goes first, and only the main window ever runs the model.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookData } from '@/store/bookDataStore';
import type { Book } from '@/types/book';

const h = vi.hoisted(() => ({
  tauri: false,
  label: 'main',
  started: [] as string[],
  finish: {} as Record<string, () => void>,
  emitTo: vi.fn(async () => {}),
}));

vi.mock('@/services/environment', () => ({
  default: { getAppService: async () => ({ loadBookContent: async () => ({ file: {} }) }) },
  isTauriAppPlatform: () => h.tauri,
}));
vi.mock('@/libs/document', () => ({
  DocumentLoader: class {
    open = async () => ({ book: {} });
  },
}));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ label: h.label }) }));
vi.mock('@tauri-apps/api/event', () => ({
  emit: async () => {},
  emitTo: h.emitTo,
  listen: async () => () => {},
}));
vi.mock('./closeGuard', () => ({ registerLibraryCloseGuard: async () => {} }));
// Each analysis runs until the test finishes it, or until it's stopped.
vi.mock('./analyze', () => ({
  loadCachedTimeline: async () => null,
  timelineState: () => ({ status: 'unavailable' }),
  analyzeBook: (book: Book, _doc: unknown, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      h.started.push(book.hash);
      h.finish[book.hash] = resolve;
      signal.addEventListener('abort', () => reject(new Error('stopped')));
    }),
}));

const book = (hash: string) => ({ hash, format: 'EPUB', title: hash }) as Book;
const flush = () => new Promise((r) => setTimeout(r, 0));

const start = async (opened: string) => {
  const { useLibraryStore } = await import('@/store/libraryStore');
  const { useBookDataStore } = await import('@/store/bookDataStore');
  useLibraryStore.getState().setLibrary([book('a'), book('b'), book('c')]);
  await import('./index');
  await flush();
  useBookDataStore.setState({ booksData: { [opened]: {} as BookData } });
  await flush();
};

// Fresh module graph per test: the re-imports are slow when the whole suite is running.
describe('mood queue', { timeout: 30_000 }, () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(h, { tauri: false, label: 'main', started: [], finish: {} });
    h.emitTo.mockClear();
  });

  it('stops the current book for the opened one, then resumes it', async () => {
    await start('c');
    expect(h.started).toEqual(['a', 'c']);
    h.finish['c']!();
    await flush();
    expect(h.started).toEqual(['a', 'c', 'a']);
  });

  it('never analyses in a book window, asks the main window instead', async () => {
    Object.assign(h, { tauri: true, label: 'reader-1' });
    await start('c');
    expect(h.started).toEqual([]);
    expect(h.emitTo).toHaveBeenCalledWith('main', 'reverie-mood-open', 'c');
  });
});
