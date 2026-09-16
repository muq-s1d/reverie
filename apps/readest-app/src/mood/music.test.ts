import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MUSIC_SETTINGS,
  builtInTracks,
  moodTracks,
  pickTrack,
  playableTracks,
  trackInfo,
} from './music';

const settings = (patch: Partial<typeof DEFAULT_MUSIC_SETTINGS>) => ({
  ...DEFAULT_MUSIC_SETTINGS,
  ...patch,
});

describe('moodTracks', () => {
  it('lists built-in tracks first, then the user songs for that mood', () => {
    const s = settings({ userTracks: { Joy: ['/home/me/a.mp3'] } });
    expect(moodTracks('Joy', s)).toEqual([...builtInTracks('Joy'), '/home/me/a.mp3']);
    expect(builtInTracks('Neutral')).toHaveLength(4);
    expect(builtInTracks('Fear')).toHaveLength(4);
  });
});

describe('playableTracks', () => {
  it('leaves out switched-off tracks', () => {
    const [first, ...rest] = builtInTracks('Joy');
    expect(playableTracks('Joy', settings({ disabledTracks: [first!] }))).toEqual(rest);
  });

  it('falls back to Neutral when every track for the mood is off', () => {
    const s = settings({ disabledTracks: builtInTracks('Fear') });
    expect(playableTracks('Fear', s)).toEqual(builtInTracks('Neutral'));
  });

  it('is empty when the mood and Neutral are all off', () => {
    const s = settings({ disabledTracks: [...builtInTracks('Fear'), ...builtInTracks('Neutral')] });
    expect(playableTracks('Fear', s)).toEqual([]);
  });
});

describe('trackInfo', () => {
  it('names built-in tracks from the pack and user songs from the file name', () => {
    expect(trackInfo(builtInTracks('Joy')[0]!)).toEqual({
      title: 'Born of the Sky',
      artist: 'Scott Buckley',
    });
    expect(trackInfo('/home/me/Music/My Song.flac')).toEqual({ title: 'My Song' });
  });
});

describe('pickTrack', () => {
  it('avoids repeating the last track when there is a choice', () => {
    const s = settings({ disabledTracks: builtInTracks('Joy').slice(2) }); // two left
    const [a, b] = builtInTracks('Joy');
    for (let i = 0; i < 20; i++) expect(pickTrack('Joy', s, a)).toBe(b);
  });

  it('returns undefined when nothing can play', () => {
    const s = settings({ disabledTracks: [...builtInTracks('Fear'), ...builtInTracks('Neutral')] });
    expect(pickTrack('Fear', s)).toBeUndefined();
  });
});
