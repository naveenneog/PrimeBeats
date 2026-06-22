import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Playlist } from '../types';
import { makeId } from '../utils/format';

const STORAGE_KEY = '@primebeats/playlists/v1';

type PlaylistState = {
  playlists: Playlist[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createPlaylist: (name: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTracks: (id: string, trackIds: string[]) => void;
  removeTrack: (id: string, trackId: string) => void;
  reorderTracks: (id: string, trackIds: string[]) => void;
};

async function persist(playlists: Playlist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {
    // Persistence is best-effort; in-memory state remains authoritative.
  }
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const playlists: Playlist[] = raw ? JSON.parse(raw) : [];
      set({ playlists: Array.isArray(playlists) ? playlists : [], hydrated: true });
    } catch {
      set({ playlists: [], hydrated: true });
    }
  },

  createPlaylist: (name) => {
    const now = Date.now();
    const playlist: Playlist = {
      id: makeId('pl'),
      name: name.trim() || 'New Playlist',
      trackIds: [],
      createdAt: now,
      updatedAt: now,
    };
    const playlists = [playlist, ...get().playlists];
    set({ playlists });
    void persist(playlists);
    return playlist;
  },

  renamePlaylist: (id, name) => {
    const playlists = get().playlists.map((p) =>
      p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p,
    );
    set({ playlists });
    void persist(playlists);
  },

  deletePlaylist: (id) => {
    const playlists = get().playlists.filter((p) => p.id !== id);
    set({ playlists });
    void persist(playlists);
  },

  addTracks: (id, trackIds) => {
    const playlists = get().playlists.map((p) => {
      if (p.id !== id) return p;
      const existing = new Set(p.trackIds);
      const merged = [...p.trackIds, ...trackIds.filter((t) => !existing.has(t))];
      return { ...p, trackIds: merged, updatedAt: Date.now() };
    });
    set({ playlists });
    void persist(playlists);
  },

  removeTrack: (id, trackId) => {
    const playlists = get().playlists.map((p) =>
      p.id === id
        ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId), updatedAt: Date.now() }
        : p,
    );
    set({ playlists });
    void persist(playlists);
  },

  reorderTracks: (id, trackIds) => {
    const playlists = get().playlists.map((p) =>
      p.id === id ? { ...p, trackIds, updatedAt: Date.now() } : p,
    );
    set({ playlists });
    void persist(playlists);
  },
}));
