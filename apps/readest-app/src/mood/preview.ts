// Settings → Music: listen to a track before switching it on/off. One preview at a time.
import { Howler } from 'howler';
import { create } from 'zustand';
import { pickRandomStart } from './music';
import { loadTrackUrl } from './trackUrls';

const PREVIEW_MS = 20_000;

export const usePreviewStore = create<{ playing: string | null }>(() => ({ playing: null }));

let audio: HTMLAudioElement | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

export const stopPreview = () => {
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = null;
  audio?.pause();
  audio = null;
  Howler.mute(false); // bring the mood music back
  usePreviewStore.setState({ playing: null });
};

/** Play ~20 s from partway into the track; the same track again (or another one) stops it. */
export const togglePreview = (id: string) => {
  const wasPlaying = usePreviewStore.getState().playing;
  stopPreview();
  if (wasPlaying === id) return;

  const el = new Audio();
  audio = el;
  el.onloadedmetadata = () => {
    el.currentTime = pickRandomStart(el.duration);
  };
  el.onended = stopPreview;
  el.onerror = () => {
    console.warn('[mood] could not preview track', id, el.error?.message);
    if (audio === el) stopPreview();
  };
  Howler.mute(true); // don't play over the mood music
  loadTrackUrl(id)
    .then((url) => {
      if (audio !== el) return; // another preview started meanwhile
      el.src = url;
      return el.play();
    })
    .catch((err) => {
      console.warn('[mood] could not preview track', id, err);
      if (audio === el) stopPreview();
    });
  stopTimer = setTimeout(stopPreview, PREVIEW_MS);
  usePreviewStore.setState({ playing: id });
};
