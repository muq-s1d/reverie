// Reader: mood analysis progress in the header bar (animated icon) and sidebar (status row).
// Both only appear while the open book is being analysed, and never cover the book text.
import clsx from 'clsx';
import { useTranslation } from '@/hooks/useTranslation';
import { useSidebarStore } from '@/store/sidebarStore';
import { useMoodStore } from '../store';

const useAnalysingPercent = (bookKey: string) =>
  useMoodStore((s) => {
    const state = s.books[bookKey.split('-')[0]!];
    if (state?.status !== 'analysing') return null;
    return state.total ? Math.round((state.done / state.total) * 100) : 0;
  });

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

export const MoodHeaderIcon = ({ bookKey, size }: { bookKey: string; size: number }) => {
  const _ = useTranslation();
  const percent = useAnalysingPercent(bookKey);
  const setSideBarVisible = useSidebarStore((s) => s.setSideBarVisible);
  if (percent === null) return null;
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
};

export const MoodSidebarStatus = ({ bookKey }: { bookKey: string }) => {
  const _ = useTranslation();
  const percent = useAnalysingPercent(bookKey);
  if (percent === null) return null;
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
};
