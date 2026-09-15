// Mood rules ported from betterReading backend/services/nlp.py.

export const MOODS = [
  'Joy',
  'Excitement',
  'Anticipation',
  'Wonder/Awe',
  'Mystery',
  'Romance',
  'Tenderness',
  'Peace/Calm',
  'Neutral',
  'Sadness',
  'Grief/Despair',
  'Fear',
  'Tension/Suspense',
  'Anger',
  'Disgust',
] as const;
export type Mood = (typeof MOODS)[number];

// betterReading frontend/app/globals.css --mood-* colours.
export const MOOD_COLORS: Record<Mood, string> = {
  Joy: '#f5c842',
  Excitement: '#f97316',
  Anticipation: '#eab308',
  'Wonder/Awe': '#8b5cf6',
  Mystery: '#6366f1',
  Romance: '#c2677d',
  Tenderness: '#ec4899',
  'Peace/Calm': '#10b981',
  Neutral: '#6e7a8a',
  Sadness: '#5b7fa6',
  'Grief/Despair': '#475569',
  Fear: '#7b5ea7',
  'Tension/Suspense': '#64748b',
  Anger: '#c0392b',
  Disgust: '#84cc16',
};

// 28 GoEmotions labels → 15 moods.
const EMOTION_MAP: Record<string, Mood> = {
  joy: 'Joy',
  amusement: 'Joy',
  excitement: 'Excitement',
  optimism: 'Anticipation',
  anticipation: 'Anticipation',
  surprise: 'Wonder/Awe',
  admiration: 'Wonder/Awe',
  curiosity: 'Mystery',
  realization: 'Mystery',
  confusion: 'Mystery',
  love: 'Romance',
  desire: 'Romance',
  caring: 'Tenderness',
  gratitude: 'Tenderness',
  relief: 'Peace/Calm',
  approval: 'Peace/Calm',
  neutral: 'Neutral',
  embarrassment: 'Neutral',
  sadness: 'Sadness',
  disappointment: 'Sadness',
  remorse: 'Sadness',
  grief: 'Grief/Despair',
  fear: 'Fear',
  nervousness: 'Tension/Suspense',
  anger: 'Anger',
  annoyance: 'Anger',
  disgust: 'Disgust',
  disapproval: 'Disgust',
};

const NEUTRAL_THRESHOLD = 0.7;
const SMOOTHING_WINDOW = 3;

const toMood = (label: string): Mood => EMOTION_MAP[label] ?? 'Neutral';

/** `scores` sorted high → low. Unsure Neutral falls back to the best non-neutral label. */
export const pickMood = (scores: { label: string; score: number }[]): Mood => {
  const best = scores[0];
  if (!best) return 'Neutral';
  if (toMood(best.label) === 'Neutral' && best.score < NEUTRAL_THRESHOLD) {
    const alt = scores.find((s) => toMood(s.label) !== 'Neutral');
    if (alt) return toMood(alt.label);
  }
  return toMood(best.label);
};

/** Centered mode filter: drops single-chunk outliers, keeps sustained shifts. */
export const smoothMoods = (moods: Mood[], window = SMOOTHING_WINDOW): Mood[] => {
  const half = Math.floor(window / 2);
  return moods.map((current, i) => {
    // Map keeps first-seen order, like Python's Counter, so ties resolve the same way.
    const counts = new Map<Mood, number>();
    for (const m of moods.slice(Math.max(0, i - half), i + half + 1)) {
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    const max = Math.max(...counts.values());
    const winners = [...counts].filter(([, c]) => c === max).map(([m]) => m);
    return winners.includes(current) ? current : winners[0]!;
  });
};
