import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Track } from '../types';

const STORAGE_KEY = '@primebeats/imported/v1';

type ImportedState = {
  /** Tracks received from other PrimeBeats users (persisted, survives updates). */
  tracks: Track[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Add received tracks (de-duplicated by id), keeping them persisted. */
  add: (incoming: Track[]) => void;
  remove: (id: string) => void;
};

async function persist(tracks: Track[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch {
    // best-effort
  }
}

export const useImportedStore = create<ImportedState>((set, get) => ({
  tracks: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const tracks = raw ? (JSON.parse(raw) as Track[]) : [];
      set({ tracks, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  add: (incoming) => {
    if (incoming.length === 0) return;
    const existing = get().tracks;
    const seen = new Set(existing.map((t) => t.id));
    const merged = [...existing];
    for (const t of incoming) {
      if (!seen.has(t.id)) {
        merged.push(t);
        seen.add(t.id);
      }
    }
    set({ tracks: merged });
    void persist(merged);
  },

  remove: (id) => {
    const tracks = get().tracks.filter((t) => t.id !== id);
    set({ tracks });
    void persist(tracks);
  },
}));
