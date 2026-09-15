// Phase 2: run the ONNX model through transformers.js on the 600 test chunks and
// compare with the PyTorch reference (out/python_ref.json).
//   node tools/mood-model/compare.mjs fp32|q8 [model dir under out/]
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { env, pipeline } from '@huggingface/transformers';

const dtype = process.argv[2] ?? 'q8';
const modelDir = process.argv[3] ?? 'model';
const here = new URL('.', import.meta.url).pathname;

// betterReading backend/services/nlp.py
const EMOTION_MAP = {
  joy: 'Joy', amusement: 'Joy', excitement: 'Excitement', optimism: 'Anticipation',
  anticipation: 'Anticipation', surprise: 'Wonder/Awe', admiration: 'Wonder/Awe',
  curiosity: 'Mystery', realization: 'Mystery', confusion: 'Mystery', love: 'Romance',
  desire: 'Romance', caring: 'Tenderness', gratitude: 'Tenderness', relief: 'Peace/Calm',
  approval: 'Peace/Calm', neutral: 'Neutral', embarrassment: 'Neutral', sadness: 'Sadness',
  disappointment: 'Sadness', remorse: 'Sadness', grief: 'Grief/Despair', fear: 'Fear',
  nervousness: 'Tension/Suspense', anger: 'Anger', annoyance: 'Anger', disgust: 'Disgust',
  disapproval: 'Disgust',
};
const NEUTRAL_THRESHOLD = 0.7;
const mood = (label) => EMOTION_MAP[label] ?? 'Neutral';

// Sorted high → low. Neutral below threshold falls back to best non-neutral label.
const pickMood = (scores) => {
  const [best] = scores;
  if (mood(best.label) === 'Neutral' && best.score < NEUTRAL_THRESHOLD) {
    const alt = scores.find((s) => mood(s.label) !== 'Neutral');
    if (alt) return mood(alt.label);
  }
  return mood(best.label);
};

const chunks = JSON.parse(
  readFileSync(`${homedir()}/Projects/Personal/betterReading/research/data/sample_chunks.json`, 'utf8'),
);
const ref = JSON.parse(readFileSync(`${here}out/python_ref.json`, 'utf8'));

env.localModelPath = `${here}out/`;
env.allowRemoteModels = false;

const t0 = performance.now();
const classify = await pipeline('text-classification', modelDir, { dtype });
const loadMs = performance.now() - t0;

const moods = [];
let maxDiff = 0;
let sameTop = 0;
const t1 = performance.now();
for (let i = 0; i < chunks.length; i++) {
  // One chunk at a time: that's how the app's background worker will run.
  const [scores] = await classify([chunks[i]], { top_k: null });
  moods.push(pickMood(scores));
  if (scores[0].label === Object.entries(ref.scores[i]).sort((a, b) => b[1] - a[1])[0][0]) sameTop++;
  for (const s of scores) maxDiff = Math.max(maxDiff, Math.abs(s.score - ref.scores[i][s.label]));
}
const runMs = performance.now() - t1;

const pct = (n) => `${((n / chunks.length) * 100).toFixed(1)}%`;
const neutral = moods.filter((m) => m === 'Neutral').length;
const agree = moods.filter((m, i) => m === ref.moods[i]).length;
const refNeutral = ref.moods.filter((m) => m === 'Neutral').length;
console.log(`${modelDir} ${dtype}: load ${(loadMs / 1000).toFixed(1)}s, ${(runMs / chunks.length).toFixed(0)} ms/chunk`);
console.log(`  Neutral ${pct(neutral)} (Python ${pct(refNeutral)})`);
console.log(`  mood agreement ${pct(agree)}, same top label ${pct(sameTop)}, max score diff ${maxDiff.toFixed(4)}`);
