import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { normalizeKey, titleTokens } from '../ml/features';
import type { TasteProfile, Track } from '../types';

const STORAGE_KEY = '@primebeats/taste/v1';
const RECENT_CAP = 200;

function emptyProfile(): TasteProfile {
  return {
    artist: {},
    album: {},
    token: {},
    liked: {},
    disliked: {},
    plays: {},
    skips: {},
    recent: [],
    updatedAt: Date.now(),
  };
}

function bump(map: Record<string, number>, key: string, delta: number): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + delta;
}

type Persisted = { profile: TasteProfile; onboardingDone: boolean };

type TasteState = {
  profile: TasteProfile;
  hydrated: boolean;
  onboardingDone: boolean;

  hydrate: () => Promise<void>;
  seedFromArtists: (artists: string[]) => void;
  completeOnboarding: () => void;
  recordPlay: (
    track: Track,
    info: { completed: boolean; playedSec: number; durationSec: number },
  ) => void;
  like: (track: Track) => void;
  unlike: (track: Track) => void;
  isLiked: (id: string) => boolean;
  dislike: (track: Track) => void;
  reset: () => void;
};

async function persist(state: Persisted): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort; in-memory state stays authoritative.
  }
}

export const useTasteStore = create<TasteState>((set, get) => ({
  profile: emptyProfile(),
  hydrated: false,
  onboardingDone: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        const profile = { ...emptyProfile(), ...(parsed.profile ?? {}) };
        set({ profile, onboardingDone: !!parsed.onboardingDone, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  seedFromArtists: (artists) => {
    const profile = get().profile;
    for (const artist of artists) bump(profile.artist, normalizeKey(artist), 2.0);
    const next = { ...profile, updatedAt: Date.now() };
    set({ profile: next });
    void persist({ profile: next, onboardingDone: get().onboardingDone });
  },

  completeOnboarding: () => {
    set({ onboardingDone: true });
    void persist({ profile: get().profile, onboardingDone: true });
  },

  recordPlay: (track, { completed, playedSec, durationSec }) => {
    const profile = get().profile;
    const artistKey = normalizeKey(track.artist);
    const albumKey = normalizeKey(track.album);
    const likedThreshold = Math.min(25, (durationSec || 0) * 0.5);
    const enjoyed = completed || playedSec >= likedThreshold;
    const played = completed || playedSec >= 5;

    if (enjoyed) {
      const weight = completed ? 1 : 0.5;
      bump(profile.artist, artistKey, 1.0 * weight);
      bump(profile.album, albumKey, 0.6 * weight);
      for (const t of titleTokens(track.title)) bump(profile.token, t, 0.3 * weight);
      if (completed) profile.plays[track.id] = (profile.plays[track.id] ?? 0) + 1;
    } else if (playedSec < 5) {
      bump(profile.artist, artistKey, -0.3);
      bump(profile.album, albumKey, -0.15);
      profile.skips[track.id] = (profile.skips[track.id] ?? 0) + 1;
    }

    if (played) {
      profile.recent = [
        { id: track.id, at: Date.now() },
        ...profile.recent.filter((r) => r.id !== track.id),
      ].slice(0, RECENT_CAP);
    }

    const next = { ...profile, updatedAt: Date.now() };
    set({ profile: next });
    void persist({ profile: next, onboardingDone: get().onboardingDone });
  },

  like: (track) => {
    const profile = get().profile;
    profile.liked[track.id] = true;
    delete profile.disliked[track.id];
    bump(profile.artist, normalizeKey(track.artist), 2.0);
    bump(profile.album, normalizeKey(track.album), 1.2);
    for (const t of titleTokens(track.title)) bump(profile.token, t, 0.6);
    const next = { ...profile, updatedAt: Date.now() };
    set({ profile: next });
    void persist({ profile: next, onboardingDone: get().onboardingDone });
  },

  unlike: (track) => {
    const profile = get().profile;
    delete profile.liked[track.id];
    const next = { ...profile, updatedAt: Date.now() };
    set({ profile: next });
    void persist({ profile: next, onboardingDone: get().onboardingDone });
  },

  isLiked: (id) => !!get().profile.liked[id],

  dislike: (track) => {
    const profile = get().profile;
    profile.disliked[track.id] = true;
    delete profile.liked[track.id];
    bump(profile.artist, normalizeKey(track.artist), -1.0);
    bump(profile.album, normalizeKey(track.album), -0.6);
    const next = { ...profile, updatedAt: Date.now() };
    set({ profile: next });
    void persist({ profile: next, onboardingDone: get().onboardingDone });
  },

  reset: () => {
    const next = emptyProfile();
    set({ profile: next, onboardingDone: false });
    void persist({ profile: next, onboardingDone: false });
  },
}));

/** Tracks sorted by completed play count — powers the "Most Played" smart playlist. */
export function selectMostPlayed(
  profile: TasteProfile,
  byId: Record<string, Track>,
  limit = 100,
): Track[] {
  return Object.entries(profile.plays)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId[id])
    .filter((t): t is Track => !!t)
    .slice(0, limit);
}

/** Recently played tracks, most-recent first — powers the "Recently Played" smart playlist. */
export function selectRecentlyPlayed(
  profile: TasteProfile,
  byId: Record<string, Track>,
  limit = 100,
): Track[] {
  const out: Track[] = [];
  for (const entry of profile.recent) {
    const track = byId[entry.id];
    if (track) out.push(track);
    if (out.length >= limit) break;
  }
  return out;
}
