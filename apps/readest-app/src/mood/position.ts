// Reading position → mood chunk. Matching approach validated in the Phase 1 spike.
import * as CFI from 'foliate-js/epubcfi.js';
import type { MoodChunk } from './store';

/**
 * Index of the chunk the reader is in, or -1 for an empty timeline.
 * `chunks` are in book order. EPUB matches on CFI inside the section; PDF uses the page's first chunk.
 * Sections without text (cover, images) keep the previous mood so the music doesn't jump.
 */
export const findChunkIndex = (
  chunks: MoodChunk[],
  format: 'EPUB' | 'PDF',
  sectionIndex: number,
  location: string,
): number => {
  if (!chunks.length) return -1;

  let here: string | null = null;
  if (format === 'EPUB') {
    try {
      here = CFI.collapse(location); // a page is a range; use where it starts
    } catch {
      here = null; // unparsable: fall back to the section's first chunk
    }
  }

  // ponytail: linear scan per page turn (~700 chunks for a novel). Index by section if it shows up.
  let lastEarlier = -1;
  let firstInSection = -1;
  let lastStartedBefore = -1;
  for (const [i, c] of chunks.entries()) {
    if (c.sectionIndex < sectionIndex) {
      lastEarlier = i;
      continue;
    }
    if (c.sectionIndex > sectionIndex) break;
    if (firstInSection === -1) firstInSection = i;
    if (!here) return i;
    // In order, so the last chunk starting at or before the position covers it (or is the nearest).
    if (CFI.compare(c.startCfi, here) <= 0) lastStartedBefore = i;
  }

  if (lastStartedBefore !== -1) return lastStartedBefore;
  if (firstInSection !== -1) return firstInSection; // position before the first chunk, e.g. a heading
  return lastEarlier !== -1 ? lastEarlier : 0;
};
