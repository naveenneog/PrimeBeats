import { create } from 'zustand';

import { ensureAudioPermission, groupAlbums, scanTracks } from '../media/scanner';
import type { Album, Track } from '../types';

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'denied';

type LibraryState = {
  tracks: Track[];
  albums: Album[];
  byId: Record<string, Track>;
  status: LibraryStatus;
  load: () => Promise<void>;
  getTracks: (ids: string[]) => Track[];
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  albums: [],
  byId: {},
  status: 'idle',

  load: async () => {
    set({ status: 'loading' });
    const permission = await ensureAudioPermission();
    if (!permission.granted) {
      set({ tracks: [], albums: [], byId: {}, status: 'denied' });
      return;
    }
    try {
      const tracks = await scanTracks();
      const byId: Record<string, Track> = {};
      for (const t of tracks) byId[t.id] = t;
      set({
        tracks,
        albums: groupAlbums(tracks),
        byId,
        // A granted permission with no audio is a valid (empty) library.
        status: 'ready',
      });
    } catch {
      set({ status: 'denied' });
    }
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
