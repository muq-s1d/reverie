// First-run guided tour of the mood feature: speech bubbles pointing at the real reader UI.
// Shows once (MusicSettings.tourDone); Settings → Music → "Show tour again" resets it.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useReaderStore } from '@/store/readerStore';
import { saveMusicSettings, useMusicSettings } from '../musicSettings';
import { useMoodStore } from '../store';

type Target = 'line' | 'chip' | 'analysing' | null;
type Step = { target: Target; title: string; body: string };

const BUBBLE_WIDTH = 280;

export const MoodTour = ({ bookKey }: { bookKey: string }) => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const { tourDone } = useMusicSettings();
  const { bookKeys, setHoveredBookKey } = useReaderStore();
  const status = useMoodStore((s) => s.books[bookKey.split('-')[0]!]?.status);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = useMemo<Step[]>(() => {
    const music: Step = {
      target: null,
      title: _('Music that follows the story'),
      body: _(
        'Reverie can play music that fades to match each mood. You can change this anytime in Settings → Music.',
      ),
    };
    if (status === 'analysing') {
      return [
        {
          target: 'analysing',
          title: _('Reading the mood of this book'),
          body: _(
            'Reverie is reading this book on your computer to find its moods. It takes a few minutes, only once. Keep reading meanwhile.',
          ),
        },
        music,
      ];
    }
    if (status === 'ready') {
      return [
        {
          target: 'line',
          title: _('The mood line'),
          body: _(
            'This line shows the mood of the page you are on. Its colour changes as the story does.',
          ),
        },
        {
          target: 'chip',
          title: _('Current mood'),
          body: _(
            'The mood is also named here in the top bar. Click it to see more in the sidebar.',
          ),
        },
        music,
      ];
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Only the first book view runs the tour, and only for books with a mood timeline (or being analysed).
  const active = !tourDone && bookKeys[0] === bookKey && steps.length > 0;
  const step = active ? steps[Math.min(index, steps.length - 1)] : undefined;

  // Keep the target on screen: the header only shows while hovered, so hold it open for header targets.
  useEffect(() => {
    if (!step?.target) return setRect(null);
    if (step.target !== 'line') setHoveredBookKey(bookKey);
    // The header fades out rather than unmounting, so its buttons keep a valid position.
    const update = () => {
      const el = document.querySelector(`[data-mood-tour="${step.target}"]`);
      setRect(el?.getBoundingClientRect() ?? null);
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [step, bookKey, setHoveredBookKey]);

  if (!step) return null;

  const isLast = index >= steps.length - 1;
  const finish = (turnOnMusic: boolean) => {
    setHoveredBookKey('');
    void saveMusicSettings(
      envConfig,
      turnOnMusic ? { tourDone: true, enabled: true } : { tourDone: true },
    );
  };

  // Under the target, clamped to the window; centred near the top when there is no target.
  const left = rect
    ? Math.min(
        Math.max(8, rect.left + rect.width / 2 - BUBBLE_WIDTH / 2),
        window.innerWidth - BUBBLE_WIDTH - 8,
      )
    : window.innerWidth / 2 - BUBBLE_WIDTH / 2;
  const top = rect ? rect.bottom + 12 : 64;
  const arrowLeft = rect ? rect.left + rect.width / 2 - left - 6 : null;

  return createPortal(
    <div
      role='dialog'
      aria-label={step.title}
      className='bg-base-100 text-base-content eink-bordered fixed z-[140] rounded-xl p-4 text-sm not-eink:shadow-xl'
      style={{ top, left, width: BUBBLE_WIDTH }}
    >
      {arrowLeft !== null && (
        <span
          className='bg-base-100 eink:border-base-content absolute -top-1.5 h-3 w-3 rotate-45 eink:border-l eink:border-t'
          style={{ left: Math.min(Math.max(12, arrowLeft), BUBBLE_WIDTH - 24) }}
          aria-hidden='true'
        />
      )}
      <p className='mb-1 font-semibold'>{step.title}</p>
      <p className='text-base-content/75 mb-3 leading-snug'>{step.body}</p>
      <div className='flex items-center gap-2'>
        <span className='text-base-content/60 text-xs tabular-nums'>
          {index + 1}/{steps.length}
        </span>
        <div className='ms-auto flex gap-2'>
          {isLast ? (
            <>
              <button className='btn btn-ghost btn-sm' onClick={() => finish(false)}>
                {_('Not now')}
              </button>
              <button className='btn btn-contrast btn-sm' onClick={() => finish(true)}>
                {_('Turn on music')}
              </button>
            </>
          ) : (
            <>
              <button className='btn btn-ghost btn-sm' onClick={() => finish(false)}>
                {_('Skip')}
              </button>
              <button className='btn btn-contrast btn-sm' onClick={() => setIndex(index + 1)}>
                {_('Next')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
