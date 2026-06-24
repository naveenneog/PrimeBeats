import type { Track } from '../types';

/**
 * Finds the best track index for a (voice) search query by scoring title /
 * artist / album against the full phrase and individual words. Returns -1 when
 * nothing matches, so callers can fall back to another song.
 *
 * Used for Android Auto / Assistant "play <song> from PrimeBeats" requests.
 */
export function matchTrackIndex(tracks: Track[], query: string): number {
  const q = (query || '').trim().toLowerCase();
  if (!q || tracks.length === 0) return -1;
  const words = q.split(/\s+/).filter((w) => w.length > 1);

  let best = -1;
  let bestScore = 0;
  tracks.forEach((t, i) => {
    const hay = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
    let score = 0;
    if (hay.includes(q)) score += 10;
    for (const w of words) if (hay.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return bestScore > 0 ? best : -1;
}
