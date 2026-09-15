import { describe, expect, it } from 'vitest';
import { findChunkIndex } from './position';
import type { MoodChunk } from './store';

const chunk = (sectionIndex: number, start: string, end: string, mood: MoodChunk['mood']) =>
  ({ sectionIndex, startCfi: start, endCfi: end, mood, smoothed: mood }) satisfies MoodChunk;

// Section 2 (spine step /6/6) has two chunks inside text node /4/2/1; section 4 has one.
const chunks: MoodChunk[] = [
  chunk(2, 'epubcfi(/6/6!/4/2/1:0)', 'epubcfi(/6/6!/4/2/1:500)', 'Joy'),
  chunk(2, 'epubcfi(/6/6!/4/2/1:500)', 'epubcfi(/6/6!/4/4/1:300)', 'Fear'),
  chunk(4, 'epubcfi(/6/10!/4/2/1:0)', 'epubcfi(/6/10!/4/8/1:10)', 'Mystery'),
];

describe('findChunkIndex (EPUB)', () => {
  it('finds the chunk whose range covers the reading position', () => {
    expect(findChunkIndex(chunks, 'EPUB', 2, 'epubcfi(/6/6!/4/2/1:120)')).toBe(0);
    expect(findChunkIndex(chunks, 'EPUB', 2, 'epubcfi(/6/6!/4/2/1:700)')).toBe(1);
  });

  it('uses the start of a range location (what foliate reports for a page)', () => {
    expect(findChunkIndex(chunks, 'EPUB', 2, 'epubcfi(/6/6!/4,/2/1:600,/4/1:100)')).toBe(1);
  });

  it('falls back to the last chunk starting before the position when no range matches', () => {
    // Past the end of section 2's last chunk (e.g. a gap the chunker dropped).
    expect(findChunkIndex(chunks, 'EPUB', 2, 'epubcfi(/6/6!/4/6/1:0)')).toBe(1);
  });

  it('keeps the previous mood on sections with no text (cover, images)', () => {
    expect(findChunkIndex(chunks, 'EPUB', 3, 'epubcfi(/6/8!/4/2)')).toBe(1);
  });

  it('uses the first chunk when nothing came before', () => {
    expect(findChunkIndex(chunks, 'EPUB', 0, 'epubcfi(/6/2!/4/2)')).toBe(0);
  });
});

describe('findChunkIndex (PDF)', () => {
  it('uses the first chunk on the page', () => {
    const pdf = [
      chunk(0, 'a', 'b', 'Joy'),
      chunk(1, 'c', 'd', 'Fear'),
      chunk(1, 'e', 'f', 'Anger'),
    ];
    expect(findChunkIndex(pdf, 'PDF', 1, '')).toBe(1);
  });
});

it('returns -1 for an empty timeline', () => {
  expect(findChunkIndex([], 'EPUB', 0, 'epubcfi(/6/2!/4/2)')).toBe(-1);
});
