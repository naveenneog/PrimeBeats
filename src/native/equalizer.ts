import type { EqualizerInfo } from '../../modules/equalizer';

/**
 * Thin, crash-proof wrapper around the local `equalizer` native module.
 *
 * `requireNativeModule` (inside the module) throws if the native side isn't
 * present — e.g. in Expo Go or an outdated build. We require it defensively so
 * the JS app degrades to a no-op instead of crashing, and every call is guarded.
 */
type NativeEq = {
  isAvailable(): boolean;
  setEnabled(enabled: boolean): void;
  getInfo(): EqualizerInfo | null;
  getBandLevels(): number[] | null;
  setBandLevel(band: number, level: number): void;
  usePreset(preset: number): void;
  setBassBoostEnabled(enabled: boolean): void;
  setBassBoostStrength(strength: number): void;
  release(): void;
};

let native: NativeEq | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  native = (require('../../modules/equalizer') as { default: NativeEq }).default;
} catch {
  native = null;
}

export const Equalizer = {
  isAvailable(): boolean {
    try {
      return native?.isAvailable() ?? false;
    } catch {
      return false;
    }
  },
  setEnabled(enabled: boolean): void {
    try {
      native?.setEnabled(enabled);
    } catch {
      // ignore
    }
  },
  getInfo(): EqualizerInfo | null {
    try {
      return native?.getInfo() ?? null;
    } catch {
      return null;
    }
  },
  getBandLevels(): number[] | null {
    try {
      return native?.getBandLevels() ?? null;
    } catch {
      return null;
    }
  },
  setBandLevel(band: number, level: number): void {
    try {
      native?.setBandLevel(band, level);
    } catch {
      // ignore
    }
  },
  usePreset(preset: number): void {
    try {
      native?.usePreset(preset);
    } catch {
      // ignore
    }
  },
  setBassBoostEnabled(enabled: boolean): void {
    try {
      native?.setBassBoostEnabled(enabled);
    } catch {
      // ignore
    }
  },
  setBassBoostStrength(strength: number): void {
    try {
      native?.setBassBoostStrength(strength);
    } catch {
      // ignore
    }
  },
  release(): void {
    try {
      native?.release();
    } catch {
      // ignore
    }
  },
};

export type { EqualizerInfo };
