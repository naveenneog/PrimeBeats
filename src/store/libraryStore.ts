import { create } from 'zustand';

import { ensureAudioPermission, groupAlbums, scanTracks } from '../media/scanner';
import type { Album, Track } from '../types';
import { useSettingsStore } from './settingsStore';

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'denied';

type LibraryState = {
  /** Everything found on the device (including hidden tracks). */
  allTracks: Track[];
  /** Visible tracks (excludes hidden ones) — what the rest of the app consumes. */
  tracks: Track[];
  albums: Album[];
  byId: Record<string, Track>;
  status: LibraryStatus;
  load: () => Promise<void>;
  /** Recomputes visible tracks/albums from `allTracks` minus the hidden set. */
  recomputeVisible: () => void;
  getTracks: (ids: string[]) => Track[];
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  allTracks: [],
  tracks: [],
  albums: [],
  byId: {},
  status: 'idle',

  load: async () => {
    set({ status: 'loading' });
    const permission = await ensureAudioPermission();
    if (!permission.granted) {
      set({ allTracks: [], tracks: [], albums: [], byId: {}, status: 'denied' });
      return;
    }
    try {
      const allTracks = await scanTracks();
      // A granted permission with no audio is a valid (empty) library.
      set({ allTracks, status: 'ready' });
      get().recomputeVisible();
    } catch {
      set({ status: 'denied' });
    }
  },

  recomputeVisible: () => {
    const hidden = useSettingsStore.getState().hidden;
    const visible = get().allTracks.filter((t) => !hidden[t.id]);
    const byId: Record<string, Track> = {};
    for (const t of visible) byId[t.id] = t;
    set({ tracks: visible, albums: groupAlbums(visible), byId });
  },

  getTracks: (ids) => {
    const { byId } = get();
    const result: Track[] = [];
    for (const id of ids) {
      const t = byId[id];
      if (t) result.push(t);
    }
    return result;
  },
}));

// Keep the visible library in sync whenever the hidden set changes.
useSettingsStore.subscribe(() => useLibraryStore.getState().recomputeVisible());
