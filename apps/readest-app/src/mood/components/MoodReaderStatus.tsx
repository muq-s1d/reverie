// Reader mood UI. While analysing: animated icon in the header + progress row in the sidebar.
// Once ready: a 2px mood-coloured line at the top (+ mood music), a mood chip in the header, a mood row
// in the sidebar.
// Nothing here covers the book text.
import clsx from 'clsx';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useBookProgress } from '@/store/readerProgressStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { MOOD_COLORS, type Mood } from '../moods';
import { useMusicSettings } from '../musicSettings';
import { findChunkIndex } from '../position';
import { useMoodStore } from '../store';
import { useMoodPlayer } from '../useMoodPlayer';

const hashOf = (bookKey: string) => bookKey.split('-')[0]!;

const useAnalysingPercent = (bookKey: string) =>
  useMoodStore((s) => {
    const state = s.books[hashOf(bookKey)];
    if (state?.status !== 'analysing') return null;
    return state.total ? Math.round((state.done / state.total) * 100) : 0;
  });

/** Smoothed mood at the current reading position, or null if the book has no mood timeline. */
export const useCurrentMood = (bookKey: string): Mood | null => {
  const state = useMoodStore((s) => s.books[hashOf(bookKey)]);
  const progress = useBookProgress(bookKey);
  return useMemo(() => {
    if (state?.status !== 'ready' || !progress) return null;
    const { chunks } = state.timeline;
    const i = findChunkIndex(chunks, state.format, progress.index, progress.location);
    return i === -1 ? null : chunks[i]!.smoothed;
  }, [state, progress]);
};

/** Three bouncing bars. Static on e-ink and with reduced motion. */
const Equalizer = ({ size }: { size: number }) => (
  <span
    className='inline-flex shrink-0 items-end justify-center gap-[2px]'
    style={{ width: size, height: size }}
    aria-hidden='true'
  >
    <style>{`
      @keyframes mood-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
      .mood-eq-bar { transform-origin: bottom; transform: scaleY(0.6); }
      @media (prefers-reduced-motion: no-preference) {
        :root:not([data-eink='true']) .mood-eq-bar { animation: mood-eq 0.9s ease-in-out infinite; }
      }
    `}</style>
    {[0, 0.3, 0.15].map((delay) => (
      <span
        key={delay}
        className='mood-eq-bar bg-base-content h-full w-[3px] rounded-full'
        style={{ animationDelay: `${delay}s` }}
      />
    ))}
  </span>
);

const MoodDot = ({ mood }: { mood: Mood }) => (
  <span
    className='eink:border eink:border-base-content inline-block h-2 w-2 shrink-0 rounded-full transition-colors duration-700'
    style={{ backgroundColor: MOOD_COLORS[mood] }}
    aria-hidden='true'
  />
);

/**
 * Always-visible 2px line in the current mood's colour (sits above the header, never over text),
 * and the mood music player. One per book view; the player makes sure only one plays.
 */
export const MoodTopLine = ({ bookKey }: { bookKey: string }) => {
  const mood = useCurrentMood(bookKey);
  useMoodPlayer(mood, useMusicSettings());
  if (!mood) return null;
  return (
    <div
      className='pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] transition-colors duration-700 eink:hidden'
      style={{ backgroundColor: MOOD_COLORS[mood] }}
      aria-hidden='true'
    />
  );
};

export const MoodHeaderIcon = ({ bookKey, size }: { bookKey: string; size: number }) => {
  const _ = useTranslation();
  const percent = useAnalysingPercent(bookKey);
  const mood = useCurrentMood(bookKey);
  const setSideBarVisible = useSidebarStore((s) => s.setSideBarVisible);

  if (percent !== null) {
    const label = _('Analysing mood · {{percent}}%', { percent });
    return (
      <button
        title={label}
        aria-label={label}
        className='btn btn-ghost h-8 min-h-8 w-8 p-0'
        onClick={() => setSideBarVisible(true)}
      >
        <Equalizer size={size * 0.8} />
      </button>
    );
  }
  if (!mood) return null;
  const label = _('Current mood: {{mood}}', { mood: _(mood) });
  return (
    <button
      title={label}
      aria-label={label}
      className='btn btn-ghost h-8 min-h-8 gap-1.5 rounded-full px-2 text-xs font-normal'
      onClick={() => setSideBarVisible(true)}
    >
      <MoodDot mood={mood} />
      <span className='hidden sm:inline'>{_(mood)}</span>
    </button>
  );
};

export const MoodSidebarStatus = ({ bookKey }: { bookKey: string }) => {
  const _ = useTranslation();
  const percent = useAnalysingPercent(bookKey);
  const mood = useCurrentMood(bookKey);

  if (percent !== null) {
    return (
      <div className='flex flex-col gap-1.5 pb-3' role='status'>
        <div className='flex items-center gap-2 text-xs'>
          <Equalizer size={12} />
          <span className='opacity-75'>{_('Analysing mood for music')}</span>
          <span className='ms-auto tabular-nums opacity-75'>{percent}%</span>
        </div>
        <div
          className={clsx(
            'bg-base-300 h-1 w-full overflow-hidden rounded-full',
            'eink:border eink:border-base-content eink:bg-base-100',
          )}
        >
          <div
            className='bg-primary eink:bg-base-content h-full rounded-full transition-[width] duration-500'
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }
  if (!mood) return null;
  return (
    <div className='flex items-center gap-2 pb-3 text-xs' role='status'>
      <MoodDot mood={mood} />
      <span className='opacity-75'>{_('Current mood')}</span>
      <span className='ms-auto font-medium'>{_(mood)}</span>
    </div>
  );
};
