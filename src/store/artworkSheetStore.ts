import { create } from 'zustand';

import type { Track } from '../types';

/** Controls the single, app-root ArtworkSheet so any screen can open it. */
type ArtworkSheetState = {
  target: Track | null;
  open: (track: Track) => void;
  close: () => void;
};

export const useArtworkSheetStore = create<ArtworkSheetState>((set) => ({
  target: null,
  open: (track) => set({ target: track }),
  close: () => set({ target: null }),
}));
