// Library book item: thin bar on the cover + "♪ Mood 42%" while a book is being analysed.
import { MdMusicNote } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';
import { useMoodStore } from '../store';

const useAnalysingPercent = (hash: string) =>
  useMoodStore((s) => {
    const state = s.books[hash];
    if (state?.status !== 'analysing') return null;
    return state.total ? Math.round((state.done / state.total) * 100) : 0;
  });

export const MoodCoverBar = ({ hash }: { hash: string }) => {
  const percent = useAnalysingPercent(hash);
  if (percent === null) return null;
  return (
    <div
      className='absolute inset-x-0 bottom-0 h-[3px] bg-black/30 eink:border-t eink:border-base-content eink:bg-base-100'
      aria-hidden='true'
    >
      <div
        className='bg-primary eink:bg-base-content h-full transition-[width] duration-500'
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

export const MoodLabel = ({ hash }: { hash: string }) => {
  const _ = useTranslation();
  const percent = useAnalysingPercent(hash);
  if (percent === null) return null;
  return (
    <span
      className='text-neutral-content/70 flex items-center gap-0.5 text-xs tabular-nums'
      role='status'
      aria-label={_('Analysing mood {{percent}}%', { percent })}
    >
      <MdMusicNote className='shrink-0' />
      {_('Mood {{percent}}%', { percent })}
    </span>
  );
};
