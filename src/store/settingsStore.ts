import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = '@primebeats/settings/v1';

type Persisted = { hidden: Record<string, true> };

type SettingsState = {
  /** Track ids the user has chosen to hide/exclude from the library & playback. */
  hidden: Record<string, true>;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  hide: (id: string) => void;
  unhide: (id: string) => void;
  toggleHidden: (id: string) => void;
  hideMany: (ids: string[]) => void;
  unhideMany: (ids: string[]) => void;
  clearHidden: () => void;
  isHidden: (id: string) => boolean;
};

async function persist(hidden: Record<string, true>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ hidden } satisfies Persisted));
  } catch {
    // Best-effort persistence.
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hidden: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
      set({ hidden: parsed.hidden ?? {}, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  hide: (id) => {
    const hidden = { ...get().hidden, [id]: true as const };
    set({ hidden });
    void persist(hidden);
  },

  unhide: (id) => {
    const hidden = { ...get().hidden };
    delete hidden[id];
    set({ hidden });
    void persist(hidden);
  },

  toggleHidden: (id) => {
    if (get().hidden[id]) get().unhide(id);
    else get().hide(id);
  },

  hideMany: (ids) => {
    const hidden = { ...get().hidden };
    for (const id of ids) hidden[id] = true;
    set({ hidden });
    void persist(hidden);
  },

  unhideMany: (ids) => {
    const hidden = { ...get().hidden };
    for (const id of ids) delete hidden[id];
    set({ hidden });
    void persist(hidden);
  },

  clearHidden: () => {
    set({ hidden: {} });
    void persist({});
  },

  isHidden: (id) => !!get().hidden[id],
}));
