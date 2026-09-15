// Runs the mood model off the main thread. One message in (chunk texts), progress + moods out.
import { env, pipeline } from '@huggingface/transformers';
import { pickMood, type Mood } from './moods';

export type MoodWorkerRequest = { texts: string[] };
export type MoodWorkerResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; moods: Mood[] }
  | { type: 'error'; message: string };

// Everything is served by the app itself (public/mood-model/), never the network.
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.useBrowserCache = false;
env.localModelPath = '/';
if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = '/mood-model/ort/';

const post = (msg: MoodWorkerResponse) => self.postMessage(msg);

self.onmessage = async ({ data }: MessageEvent<MoodWorkerRequest>) => {
  try {
    // fp16: exact match with betterReading's PyTorch results (Phase 2).
    const classify = await pipeline('text-classification', 'mood-model', {
      dtype: 'fp16',
      device: 'wasm',
    });
    const moods: Mood[] = [];
    for (const text of data.texts) {
      const [scores] = (await classify([text], { top_k: null })) as {
        label: string;
        score: number;
      }[][];
      moods.push(pickMood(scores ?? []));
      post({ type: 'progress', done: moods.length, total: data.texts.length });
    }
    post({ type: 'done', moods });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
