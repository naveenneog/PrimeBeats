import { create } from 'zustand';

import { ensureAudioPermission, groupAlbums, scanTracks } from '../media/scanner';
import type { Album, Track } from '../types';
import { useImportedStore } from './importedStore';
import { applyMetadataOverride, useMetadataStore } from './metadataStore';
import { useSettingsStore } from './settingsStore';

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'denied';

type LibraryState = {
  /** Raw scan result from the device, before user metadata overrides. */
  rawTracks: Track[];
  /** Everything found on the device (including hidden), with overrides applied. */
  allTracks: Track[];
  /** Visible tracks (excludes hidden ones) — what the rest of the app consumes. */
  tracks: Track[];
  albums: Album[];
  byId: Record<string, Track>;
  status: LibraryStatus;
  load: () => Promise<void>;
  /** Re-applies metadata overrides to the raw scan, then recomputes visibility. */
  recomputeAll: () => void;
  /** Recomputes visible tracks/albums from `allTracks` minus the hidden set. */
  recomputeVisible: () => void;
  getTracks: (ids: string[]) => Track[];
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  rawTracks: [],
  allTracks: [],
  tracks: [],
  albums: [],
  byId: {},
  status: 'idle',

  load: async () => {
    set({ status: 'loading' });
    const permission = await ensureAudioPermission();
    if (!permission.granted) {
      set({ rawTracks: [], allTracks: [], tracks: [], albums: [], byId: {}, status: 'denied' });
      return;
    }
    try {
      const rawTracks = await scanTracks();
      // A granted permission with no audio is a valid (empty) library.
      set({ rawTracks, status: 'ready' });
      get().recomputeAll();
    } catch {
      set({ status: 'denied' });
    }
  },

  recomputeAll: () => {
    const overrides = useMetadataStore.getState().overrides;
    const imported = useImportedStore.getState().tracks;
    // Received (shared) tracks live alongside the device scan in the library.
    const base = [...get().rawTracks, ...imported];
    const allTracks = base.map((t) => applyMetadataOverride(t, overrides[t.id]));
    set({ allTracks });
    get().recomputeVisible();
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

// Re-apply title/artist overrides whenever the user edits track metadata.
useMetadataStore.subscribe(() => useLibraryStore.getState().recomputeAll());

// Merge in received (shared) tracks whenever they change.
useImportedStore.subscribe(() => useLibraryStore.getState().recomputeAll());
