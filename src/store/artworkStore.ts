import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

const STORAGE_KEY = '@primebeats/artwork/v1';
// documentDirectory persists across app updates (only a full uninstall clears it).
const ART_DIR = `${FileSystem.documentDirectory}artwork/`;

function fileFor(trackId: string): string {
  const safe = trackId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  return `${ART_DIR}${safe}.img`;
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(ART_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(ART_DIR, { intermediates: true });
}

type ArtworkState = {
  /** trackId -> persistent local file uri for custom/downloaded/embedded art. */
  art: Record<string, string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setFromUrl: (trackId: string, url: string) => Promise<boolean>;
  setFromLocalUri: (trackId: string, uri: string) => Promise<boolean>;
  setFromBase64: (trackId: string, base64: string) => Promise<boolean>;
  remove: (trackId: string) => Promise<void>;
};

async function persist(art: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(art));
  } catch {
    // best-effort
  }
}

export const useArtworkStore = create<ArtworkState>((set, get) => ({
  art: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const art = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      set({ art, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setFromUrl: async (trackId, url) => {
    try {
      await ensureDir();
      const dest = `${fileFor(trackId)}?v=${Date.now()}`.split('?')[0];
      const res = await FileSystem.downloadAsync(url, dest);
      if (res.status >= 200 && res.status < 300) {
        const art = { ...get().art, [trackId]: `${res.uri}?t=${Date.now()}` };
        set({ art });
        void persist(art);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  setFromLocalUri: async (trackId, uri) => {
    try {
      await ensureDir();
      const dest = fileFor(trackId);
      await FileSystem.copyAsync({ from: uri, to: dest });
      const art = { ...get().art, [trackId]: `${dest}?t=${Date.now()}` };
      set({ art });
      void persist(art);
      return true;
    } catch {
      return false;
    }
  },

  setFromBase64: async (trackId, base64) => {
    try {
      await ensureDir();
      const dest = fileFor(trackId);
      const data = base64.includes(',') ? base64.split(',')[1] : base64;
      await FileSystem.writeAsStringAsync(dest, data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const art = { ...get().art, [trackId]: `${dest}?t=${Date.now()}` };
      set({ art });
      void persist(art);
      return true;
    } catch {
      return false;
    }
  },

  remove: async (trackId) => {
    const current = get().art[trackId];
    const art = { ...get().art };
    delete art[trackId];
    set({ art });
    void persist(art);
    if (current) {
      try {
        await FileSystem.deleteAsync(current.split('?')[0], { idempotent: true });
      } catch {
        // ignore
      }
    }
  },
}));

/** Resolves a persisted artwork uri for a track id, if any. */
export function selectArt(state: ArtworkState, trackId?: string): string | undefined {
  return trackId ? state.art[trackId] : undefined;
}
