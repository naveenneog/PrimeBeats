import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Track } from '../types';

const STORAGE_KEY = '@primebeats/metadata/v1';

/** A user-supplied override for a track's displayed title/artist. */
export type MetadataOverride = {
  title?: string;
  artist?: string;
};

type MetadataState = {
  /** trackId -> { title?, artist? }. Persisted; survives app updates. */
  overrides: Record<string, MetadataOverride>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Save (or update) the title/artist override for a track. */
  set: (trackId: string, override: MetadataOverride) => void;
  /** Remove any override for a track (revert to scanned tags). */
  clear: (trackId: string) => void;
};

async function persist(overrides: Record<string, MetadataOverride>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // best-effort
  }
}

export const useMetadataStore = create<MetadataState>((set, get) => ({
  overrides: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const overrides = raw ? (JSON.parse(raw) as Record<string, MetadataOverride>) : {};
      set({ overrides, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  set: (trackId, override) => {
    const title = override.title?.trim();
    const artist = override.artist?.trim();
    const next: MetadataOverride = {};
    if (title) next.title = title;
    if (artist) next.artist = artist;

    const overrides = { ...get().overrides };
    if (next.title || next.artist) overrides[trackId] = next;
    else delete overrides[trackId];

    set({ overrides });
    void persist(overrides);
  },

  clear: (trackId) => {
    const overrides = { ...get().overrides };
    delete overrides[trackId];
    set({ overrides });
    void persist(overrides);
  },
}));

/** Returns a track with any saved title/artist override applied. */
export function applyMetadataOverride(
  track: Track,
  override: MetadataOverride | undefined,
): Track {
  if (!override || (!override.title && !override.artist)) return track;
  return {
    ...track,
    title: override.title ?? track.title,
    artist: override.artist ?? track.artist,
  };
}
