// Reader: small bottom pill "♪ Analysing mood · 42%", then "Mood ready" for a moment, then gone.
// Not Readest's info toast: that one sits mid-screen over the text.
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { MdMusicNote } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';
import { useReaderStore } from '@/store/readerStore';
import '../index'; // starts the background analysis queue
import { useMoodStore } from '../store';

const READY_MS = 3000;

export const MoodToast = () => {
  const _ = useTranslation();
  const hash = useReaderStore((s) => s.bookKeys[0]?.split('-')[0]);
  const state = useMoodStore((s) => (hash ? s.books[hash] : undefined));
  const [showReady, setShowReady] = useState(false);
  const wasAnalysing = useRef(false);

  useEffect(() => {
    if (state?.status === 'analysing') wasAnalysing.current = true;
    // Only announce "ready" if we watched it finish, not for books analysed earlier.
    if (state?.status === 'ready' && wasAnalysing.current) {
      wasAnalysing.current = false;
      setShowReady(true);
      const timer = setTimeout(() => setShowReady(false), READY_MS);
      return () => clearTimeout(timer);
    }
    return;
  }, [state?.status]);

  const analysing = state?.status === 'analysing';
  if (!analysing && !showReady) return null;

  const percent = analysing && state.total ? Math.round((state.done / state.total) * 100) : 0;
  return (
    <div
      className='pointer-events-none fixed inset-x-0 z-[130] flex justify-center'
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 3.5rem)' }}
      role='status'
    >
      <div
        className={clsx(
          'eink-bordered bg-base-200/90 text-base-content flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tabular-nums',
          'not-eink:shadow-md not-eink:backdrop-blur-sm',
        )}
      >
        <MdMusicNote className='shrink-0' />
        {analysing ? _('Analysing mood · {{percent}}%', { percent }) : _('Mood ready')}
      </div>
    </div>
  );
};
