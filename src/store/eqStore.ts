import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { Equalizer, type EqualizerInfo } from '../native/equalizer';

const STORAGE_KEY = '@primebeats/equalizer/v1';

type Persisted = {
  enabled: boolean;
  bandLevels: number[];
  presetIndex: number | null;
  bassBoostEnabled: boolean;
  bassBoostStrength: number;
};

type EqState = {
  /** Whether the device exposes a usable global equalizer. */
  available: boolean;
  /** Master on/off for the equalizer effect. */
  enabled: boolean;
  /** Device capabilities (band count, range, freqs, presets). */
  info: EqualizerInfo | null;
  /** Current gain per band in millibels, mirroring the native engine. */
  bandLevels: number[];
  /** Selected preset index, or null when the user has a custom curve. */
  presetIndex: number | null;
  bassBoostEnabled: boolean;
  /** Bass-boost strength 0..1000. */
  bassBoostStrength: number;
  hydrated: boolean;

  init: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  /** Live update while dragging (updates native + state, no persistence). */
  previewBandLevel: (band: number, level: number) => void;
  setBandLevel: (band: number, level: number) => void;
  applyPreset: (index: number) => void;
  setBassBoostEnabled: (enabled: boolean) => void;
  /** Live update while dragging (updates native + state, no persistence). */
  previewBassBoostStrength: (strength: number) => void;
  setBassBoostStrength: (strength: number) => void;
  resetFlat: () => void;
};

function snapshot(state: EqState): Persisted {
  return {
    enabled: state.enabled,
    bandLevels: state.bandLevels,
    presetIndex: state.presetIndex,
    bassBoostEnabled: state.bassBoostEnabled,
    bassBoostStrength: state.bassBoostStrength,
  };
}

async function persist(state: EqState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot(state)));
  } catch {
    // Best-effort persistence.
  }
}

export const useEqStore = create<EqState>((set, get) => ({
  available: false,
  enabled: false,
  info: null,
  bandLevels: [],
  presetIndex: null,
  bassBoostEnabled: false,
  bassBoostStrength: 0,
  hydrated: false,

  init: async () => {
    const available = Equalizer.isAvailable();
    if (!available) {
      set({ available: false, hydrated: true });
      return;
    }

    const info = Equalizer.getInfo();
    const numBands = info?.numberOfBands ?? 0;

    // Load saved settings.
    let saved: Partial<Persisted> = {};
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) as Partial<Persisted>;
    } catch {
      saved = {};
    }

    // Default to a flat curve sized to this device's band count.
    const deviceLevels = Equalizer.getBandLevels() ?? new Array(numBands).fill(0);
    let bandLevels =
      saved.bandLevels && saved.bandLevels.length === numBands
        ? saved.bandLevels.slice()
        : deviceLevels.slice(0, numBands);

    const enabled = saved.enabled ?? false;
    const presetIndex = saved.presetIndex ?? null;
    const bassBoostEnabled = saved.bassBoostEnabled ?? false;
    const bassBoostStrength = saved.bassBoostStrength ?? 0;

    // Re-apply the saved state to the native engine.
    Equalizer.setEnabled(enabled);
    for (let i = 0; i < bandLevels.length; i++) {
      Equalizer.setBandLevel(i, bandLevels[i]);
    }
    Equalizer.setBassBoostStrength(bassBoostStrength);
    Equalizer.setBassBoostEnabled(bassBoostEnabled);

    set({
      available: true,
      info,
      bandLevels,
      enabled,
      presetIndex,
      bassBoostEnabled,
      bassBoostStrength,
      hydrated: true,
    });
  },

  setEnabled: (enabled) => {
    Equalizer.setEnabled(enabled);
    set({ enabled });
    void persist(get());
  },

  previewBandLevel: (band, level) => {
    Equalizer.setBandLevel(band, level);
    const bandLevels = get().bandLevels.slice();
    bandLevels[band] = level;
    set({ bandLevels, presetIndex: null });
  },

  setBandLevel: (band, level) => {
    Equalizer.setBandLevel(band, level);
    const bandLevels = get().bandLevels.slice();
    bandLevels[band] = level;
    // Manual edits move us off any named preset.
    set({ bandLevels, presetIndex: null });
    void persist(get());
  },

  applyPreset: (index) => {
    Equalizer.usePreset(index);
    const bandLevels = Equalizer.getBandLevels() ?? get().bandLevels;
    set({ bandLevels: bandLevels.slice(), presetIndex: index });
    void persist(get());
  },

  setBassBoostEnabled: (enabled) => {
    // Enabling boost with zero strength would be inaudible — apply a sensible
    // default so the toggle has an immediate effect the first time.
    let strength = get().bassBoostStrength;
    if (enabled && strength <= 0) {
      strength = 600;
      Equalizer.setBassBoostStrength(strength);
    }
    Equalizer.setBassBoostEnabled(enabled);
    set({ bassBoostEnabled: enabled, bassBoostStrength: strength });
    void persist(get());
  },

  previewBassBoostStrength: (strength) => {
    const clamped = Math.max(0, Math.min(1000, Math.round(strength)));
    Equalizer.setBassBoostStrength(clamped);
    set({ bassBoostStrength: clamped });
  },

  setBassBoostStrength: (strength) => {
    const clamped = Math.max(0, Math.min(1000, Math.round(strength)));
    Equalizer.setBassBoostStrength(clamped);
    set({ bassBoostStrength: clamped });
    void persist(get());
  },

  resetFlat: () => {
    const numBands = get().info?.numberOfBands ?? get().bandLevels.length;
    const bandLevels = new Array(numBands).fill(0);
    for (let i = 0; i < numBands; i++) Equalizer.setBandLevel(i, 0);
    set({ bandLevels, presetIndex: null });
    void persist(get());
  },
}));
