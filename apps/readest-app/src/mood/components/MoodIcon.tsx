// Small animated icon per mood, in the mood's colour. Still with reduced motion and on e-ink.
import clsx from 'clsx';
import type { IconType } from 'react-icons';
import {
  PiBookOpenFill,
  PiCloudRainFill,
  PiDropFill,
  PiFireFill,
  PiGhostFill,
  PiHandHeartFill,
  PiHeartFill,
  PiHourglassMediumFill,
  PiLeafFill,
  PiLightningFill,
  PiMagnifyingGlassFill,
  PiSmileyNervousFill,
  PiSparkleFill,
  PiSunFill,
  PiTimerFill,
} from 'react-icons/pi';
import { MOOD_COLORS, MOODS, type Mood } from '../moods';

const ICONS: Record<Mood, { icon: IconType; animation: string }> = {
  Joy: { icon: PiSunFill, animation: 'mood-spin 8s linear infinite' },
  Excitement: { icon: PiLightningFill, animation: 'mood-flash 1.2s ease-in-out infinite' },
  Anticipation: { icon: PiHourglassMediumFill, animation: 'mood-flip 3s ease-in-out infinite' },
  'Wonder/Awe': { icon: PiSparkleFill, animation: 'mood-twinkle 2s ease-in-out infinite' },
  Mystery: { icon: PiMagnifyingGlassFill, animation: 'mood-search 3s ease-in-out infinite' },
  Romance: { icon: PiHeartFill, animation: 'mood-beat 1.4s ease-in-out infinite' },
  Tenderness: { icon: PiHandHeartFill, animation: 'mood-float 3s ease-in-out infinite' },
  'Peace/Calm': { icon: PiLeafFill, animation: 'mood-sway 4s ease-in-out infinite' },
  Neutral: { icon: PiBookOpenFill, animation: 'mood-breathe 4s ease-in-out infinite' },
  Sadness: { icon: PiDropFill, animation: 'mood-drip 2.2s ease-in infinite' },
  'Grief/Despair': { icon: PiCloudRainFill, animation: 'mood-drift 5s ease-in-out infinite' },
  Fear: { icon: PiGhostFill, animation: 'mood-haunt 3s ease-in-out infinite' },
  'Tension/Suspense': { icon: PiTimerFill, animation: 'mood-tick 1s steps(2, jump-none) infinite' },
  Anger: { icon: PiFireFill, animation: 'mood-flicker 0.9s ease-in-out infinite' },
  Disgust: { icon: PiSmileyNervousFill, animation: 'mood-queasy 2s ease-in-out infinite' },
};

/** Keyframes for all mood icons. Render once where the icons are used. */
export const MoodIconStyles = () => (
  <style>{`
    @keyframes mood-spin { to { transform: rotate(360deg); } }
    @keyframes mood-flash { 0%, 100% { opacity: 1; transform: scale(1); } 45% { opacity: .55; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.15); } }
    @keyframes mood-flip { 0%, 40% { transform: rotate(0); } 50%, 90% { transform: rotate(180deg); } 100% { transform: rotate(360deg); } }
    @keyframes mood-twinkle { 0%, 100% { transform: scale(.8) rotate(0); opacity: .7; } 50% { transform: scale(1.15) rotate(45deg); opacity: 1; } }
    @keyframes mood-search { 0% { transform: translate(0, 0); } 25% { transform: translate(2px, -2px); } 50% { transform: translate(0, -3px); } 75% { transform: translate(-2px, -1px); } 100% { transform: translate(0, 0); } }
    @keyframes mood-beat { 0%, 40%, 100% { transform: scale(1); } 15% { transform: scale(1.2); } 28% { transform: scale(1.05); } }
    @keyframes mood-float { 0%, 100% { transform: translateY(1px); } 50% { transform: translateY(-2px); } }
    @keyframes mood-sway { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } }
    @keyframes mood-breathe { 0%, 100% { transform: scale(.92); } 50% { transform: scale(1.06); } }
    @keyframes mood-drip { 0% { transform: translateY(-3px); opacity: 0; } 25% { opacity: 1; } 80% { transform: translateY(3px); opacity: 1; } 100% { transform: translateY(4px); opacity: 0; } }
    @keyframes mood-drift { 0%, 100% { transform: translateX(-1px); opacity: .8; } 50% { transform: translateX(2px) translateY(1px); opacity: 1; } }
    @keyframes mood-haunt { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-2px); } 45% { transform: translate(-1px, -2px); } 50% { transform: translate(1px, -2px); } 55% { transform: translateY(-2px); } }
    @keyframes mood-tick { 0% { transform: rotate(-8deg); } 100% { transform: rotate(8deg); } }
    @keyframes mood-flicker { 0%, 100% { transform: scaleY(1) skewX(0); } 30% { transform: scaleY(1.1) skewX(-4deg); } 60% { transform: scaleY(.95) skewX(3deg); } }
    @keyframes mood-queasy { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-10deg) translateY(1px); } 75% { transform: rotate(10deg) translateY(1px); } }
    .mood-icon { animation: none !important; }
    @media (prefers-reduced-motion: no-preference) {
      :root:not([data-eink='true']) .mood-icon { animation: var(--mood-animation) !important; }
    }
  `}</style>
);

const makeIcon = (mood: Mood) => {
  const { icon: Icon, animation } = ICONS[mood];
  return function MoodIcon({ className }: { className?: string }) {
    return (
      <Icon
        className={clsx(className, 'mood-icon eink:text-base-content')}
        style={{ color: MOOD_COLORS[mood], ['--mood-animation' as string]: animation }}
        aria-hidden='true'
      />
    );
  };
};

// Built once: a new component per render would remount the icon and restart its animation.
const MOOD_ICONS = Object.fromEntries(MOODS.map((m) => [m, makeIcon(m)])) as Record<
  Mood,
  ReturnType<typeof makeIcon>
>;

/** Component for a mood's icon (fits props like NavigationRow's `icon`, which passes a className). */
export const moodIcon = (mood: Mood) => MOOD_ICONS[mood];
