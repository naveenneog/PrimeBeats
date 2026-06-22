import type { Track } from '../types';

/** Words ignored when tokenizing titles for soft similarity. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'and', 'in', 'on', 'for', 'feat', 'ft', 'featuring',
  'remix', 'version', 'edit', 'live', 'original', 'mix', 'prod', 'official', 'audio',
  'video', 'lyric', 'lyrics', 'hd', 'hq', 'remastered',
]);

/** Lowercased, trimmed key used for artist/album affinity maps. */
export function normalizeKey(value: string): string {
  return (value || '').trim().toLowerCase();
}

/** Extracts meaningful keyword tokens from a track title. */
export function titleTokens(title: string): string[] {
  return (title || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Content similarity between two tracks in [0, 1], from metadata only (Option A):
 * same artist dominates, same album/folder adds, shared title keywords nudge.
 */
export function trackSimilarity(a: Track, b: Track): number {
  if (a.id === b.id) return 1;
  let score = 0;
  if (a.artist && normalizeKey(a.artist) === normalizeKey(b.artist)) score += 0.55;
  if (a.album && normalizeKey(a.album) === normalizeKey(b.album)) score += 0.3;

  const tokensA = new Set(titleTokens(a.title));
  const tokensB = titleTokens(b.title);
  if (tokensA.size && tokensB.length) {
    let overlap = 0;
    for (const t of tokensB) if (tokensA.has(t)) overlap++;
    score += 0.15 * (overlap / Math.max(tokensA.size, tokensB.length));
  }
  return Math.min(1, score);
}
