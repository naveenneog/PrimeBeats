import { create } from 'zustand';

import type { Track } from '../types';

/** Which view the sheet opens into. */
export type ArtworkSheetMode = 'menu' | 'edit';

/** Controls the single, app-root ArtworkSheet so any screen can open it. */
type ArtworkSheetState = {
  target: Track | null;
  /** The view to show when the sheet opens (menu by default, or straight to edit). */
  initialMode: ArtworkSheetMode;
  open: (track: Track, mode?: ArtworkSheetMode) => void;
  close: () => void;
};

export const useArtworkSheetStore = create<ArtworkSheetState>((set) => ({
  target: null,
  initialMode: 'menu',
  open: (track, mode = 'menu') => set({ target: track, initialMode: mode }),
  close: () => set({ target: null }),
}));
