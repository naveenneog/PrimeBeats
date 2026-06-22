import type { TasteProfile, Track } from '../types';
import { normalizeKey, titleTokens, trackSimilarity } from './features';

/** Squashes an unbounded affinity score into [-1, 1] so it can't dominate. */
function squash(x: number): number {
  return Math.tanh(x / 3);
}

/** Raw taste affinity for a track given the learned profile (unbounded). */
export function trackAffinity(track: Track, profile: TasteProfile): number {
  if (profile.disliked[track.id]) return -5;
  let affinity = 0;
  affinity += (profile.artist[normalizeKey(track.artist)] ?? 0) * 1.0;
  affinity += (profile.album[normalizeKey(track.album)] ?? 0) * 0.6;
  let tokenScore = 0;
  for (const t of titleTokens(track.title)) tokenScore += profile.token[t] ?? 0;
  affinity += tokenScore * 0.3;
  if (profile.liked[track.id]) affinity += 3;
  return affinity;
}

export type RecommendParams = {
  /** Anchor track for "more like this" (omit for a pure taste-based mix). */
  seed?: Track;
  /** Track ids to exclude (current queue, etc.). */
  exclude?: Set<string>;
  count: number;
  /** 0..1 amount of randomness for discovery. */
  exploration?: number;
  /** Max tracks per artist in the result, for variety. */
  perArtistCap?: number;
};

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Core ranking: blends content similarity to the seed, learned taste affinity,
 * an exploration term, and a recency penalty (to avoid recently-played repeats),
 * then enforces per-artist diversity. Falls back to a shuffle for cold start.
 */
export function rankTracks(
  library: Track[],
  profile: TasteProfile,
  params: RecommendParams,
): Track[] {
  const { seed, exclude, count, exploration = 0.15, perArtistCap = 3 } = params;
  const recentSet = new Set(profile.recent.slice(0, 40).map((r) => r.id));

  const scored = library
    .filter(
      (t) => t.id !== seed?.id && !exclude?.has(t.id) && !profile.disliked[t.id],
    )
    .map((t) => {
      const sim = seed ? trackSimilarity(t, seed) : 0;
      const aff = squash(trackAffinity(t, profile));
      const recencyPenalty = recentSet.has(t.id) ? 0.6 : 0;
      const noise = Math.random() * exploration;
      const score = (seed ? 0.5 * sim : 0) + (seed ? 0.35 : 0.7) * aff + noise - recencyPenalty;
      return { track: t, score };
    })
    .sort((x, y) => y.score - x.score);

  const out: Track[] = [];
  const perArtist: Record<string, number> = {};
  for (const { track } of scored) {
    const key = normalizeKey(track.artist);
    const used = perArtist[key] ?? 0;
    if (used >= perArtistCap) continue;
    perArtist[key] = used + 1;
    out.push(track);
    if (out.length >= count) break;
  }

  // Cold-start / sparse-library fallback: top up with random unseen tracks.
  if (out.length < count) {
    const have = new Set(out.map((t) => t.id));
    const rest = library.filter(
      (t) => !have.has(t.id) && t.id !== seed?.id && !exclude?.has(t.id),
    );
    shuffleInPlace(rest);
    for (const t of rest) {
      out.push(t);
      if (out.length >= count) break;
    }
  }
  return out;
}

/** "More like this" — an endless similar queue seeded from the current track. */
export function recommendNext(
  library: Track[],
  profile: TasteProfile,
  params: RecommendParams,
): Track[] {
  return rankTracks(library, profile, params);
}

/** "Made for You" — a taste-based mix with no specific seed. */
export function recommendForYou(
  library: Track[],
  profile: TasteProfile,
  count: number,
): Track[] {
  return rankTracks(library, profile, { count, exploration: 0.25, perArtistCap: 2 });
}
