import { describe, expect, it } from 'vitest';
import { pickMood, smoothMoods } from './moods';

const scores = (pairs: Record<string, number>) =>
  Object.entries(pairs)
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score);

describe('pickMood', () => {
  it('maps the top GoEmotions label to its mood', () => {
    expect(pickMood(scores({ amusement: 0.6, fear: 0.3 }))).toBe('Joy');
    expect(pickMood(scores({ nervousness: 0.5, joy: 0.2 }))).toBe('Tension/Suspense');
  });

  it('keeps Neutral when it is confident (>= 0.70)', () => {
    expect(pickMood(scores({ neutral: 0.7, fear: 0.2 }))).toBe('Neutral');
  });

  it('falls back to the best non-neutral label when Neutral is unsure', () => {
    expect(pickMood(scores({ neutral: 0.69, embarrassment: 0.2, fear: 0.1 }))).toBe('Fear');
  });

  it('leaves low-confidence non-neutral moods alone', () => {
    expect(pickMood(scores({ anger: 0.34, neutral: 0.3 }))).toBe('Anger');
  });
});

describe('smoothMoods', () => {
  it('removes a single-chunk outlier', () => {
    expect(smoothMoods(['Fear', 'Joy', 'Fear'])).toEqual(['Fear', 'Fear', 'Fear']);
  });

  it('keeps sustained shifts', () => {
    expect(smoothMoods(['Fear', 'Fear', 'Joy', 'Joy'])).toEqual(['Fear', 'Fear', 'Joy', 'Joy']);
  });

  it('keeps the current mood on a tie, else the earliest in the window (Python Counter order)', () => {
    expect(smoothMoods(['Joy', 'Fear', 'Anger'])).toEqual(['Joy', 'Fear', 'Anger']);
    expect(smoothMoods(['Joy', 'Fear'])).toEqual(['Joy', 'Fear']);
  });
});
