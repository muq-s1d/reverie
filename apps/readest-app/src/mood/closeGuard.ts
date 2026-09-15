// Ask before closing/quitting while a book is mid-analysis: closing throws that work away.
// Fail-safe: any error in here lets the close go ahead. Never trap the user.
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type as osType } from '@tauri-apps/plugin-os';
import i18n from '@/i18n/i18n';
import environmentConfig from '@/services/environment';
import { useMoodStore } from './store';

type ReverieGlobal = {
  reverieConfirmClose?: () => Promise<boolean>;
  reverieCloseGuardRegistered?: boolean;
};
const g = globalThis as ReverieGlobal;

let asking: Promise<boolean> | null = null;

/** True when it's fine to close. Shared by every close path so the dialog shows once. */
export const confirmCloseDuringAnalysis = async (): Promise<boolean> => {
  const analysing = Object.values(useMoodStore.getState().books).find(
    (s) => s.status === 'analysing',
  );
  console.warn('[mood] close requested, analysing:', !!analysing);
  if (!analysing || analysing.status !== 'analysing') return true;

  const percent = analysing.total ? Math.round((analysing.done / analysing.total) * 100) : 0;
  asking ??= environmentConfig
    .getAppService()
    .then((appService) =>
      appService.ask(
        i18n.t(
          'A book is still being analysed for mood music ({{percent}}%). It will pick up where it left off next time. Close anyway?',
          { percent },
        ),
      ),
    )
    .catch((err) => {
      console.warn('[mood] close dialog failed, closing anyway', err);
      return true;
    })
    .finally(() => {
      asking = null;
    });
  return asking;
};

// Readest's close paths (tauriHandleOnCloseWindow, tauriQuitApp in utils/window.ts) call this hook.
g.reverieConfirmClose = confirmCloseDuringAnalysis;

// Readest only hooks window close while the reader page is mounted (ReaderContent →
// tauriHandleOnCloseWindow). This covers every other page, e.g. the library.
export const registerLibraryCloseGuard = async () => {
  if (typeof window === 'undefined' || g.reverieCloseGuardRegistered) return; // no SSR, once per page
  const appService = await environmentConfig.getAppService();
  if (!appService.hasWindow) return;
  g.reverieCloseGuardRegistered = true;

  const win = getCurrentWindow();
  await win.onCloseRequested(async (event) => {
    // Tauri destroys the window after any listener that doesn't prevent it, so always prevent.
    event.preventDefault();
    // On the reader page Readest's handler asks (via the hook), saves progress, then closes.
    if (window.location.pathname.startsWith('/reader')) return;
    try {
      if (win.label === 'main' && (await osType()) === 'macos') return; // close = hide; analysis keeps going
      if (!(await confirmCloseDuringAnalysis())) return;
    } catch (err) {
      console.warn('[mood] close guard failed, closing anyway', err);
    }
    await win.destroy();
  });
};
