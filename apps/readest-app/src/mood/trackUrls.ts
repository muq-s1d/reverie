// Playable URLs for track ids. User songs are read into memory and played from a blob URL:
// streaming them through Tauri's asset protocol is unreliable for audio on the Linux CEF runtime
// (plays a few seconds then stops, or fails outright).
import environmentConfig from '@/services/environment';
import { isBuiltInTrack } from './music';

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
};

/** File extension, which Howler needs to pick a decoder for blob URLs. */
export const trackExt = (id: string) => id.split('.').pop()?.toLowerCase() ?? 'mp3';

// Recently used user songs stay loaded; the least recently used is released beyond this.
const CACHE_LIMIT = 8;
const cache = new Map<string, Promise<string>>();

export const loadTrackUrl = (id: string): Promise<string> => {
  if (isBuiltInTrack(id)) return Promise.resolve(id);
  const hit = cache.get(id);
  if (hit) {
    cache.delete(id); // mark as most recently used
    cache.set(id, hit);
    return hit;
  }
  const url = environmentConfig
    .getAppService()
    .then((appService) => appService.readFile(id, 'None', 'binary'))
    .then((bytes) =>
      URL.createObjectURL(
        new Blob([bytes as ArrayBuffer], { type: MIME[trackExt(id)] ?? 'audio/mpeg' }),
      ),
    );
  url.catch(() => cache.delete(id)); // retry next time (e.g. file was missing)
  cache.set(id, url);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value!;
    void cache
      .get(oldest)
      ?.then(URL.revokeObjectURL)
      .catch(() => {});
    cache.delete(oldest);
  }
  return url;
};
