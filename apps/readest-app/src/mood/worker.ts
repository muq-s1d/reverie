// Runs the mood model off the main thread. One message in (chunk texts), one mood per chunk out.
import { env, pipeline } from '@huggingface/transformers';
import { pickMood, type Mood } from './moods';

export type MoodWorkerRequest = { texts: string[] };
export type MoodWorkerResponse =
  | { type: 'mood'; mood: Mood }
  | { type: 'done' }
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
    for (const text of data.texts) {
      const [scores] = (await classify([text], { top_k: null })) as {
        label: string;
        score: number;
      }[][];
      post({ type: 'mood', mood: pickMood(scores ?? []) });
    }
    post({ type: 'done' });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
