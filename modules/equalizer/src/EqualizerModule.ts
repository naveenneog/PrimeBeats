import { NativeModule, requireNativeModule } from 'expo';

import type { EqualizerInfo } from './Equalizer.types';

declare class EqualizerModule extends NativeModule {
  /** True when the device permits attaching a global equalizer effect. */
  isAvailable(): boolean;
  /** Enable or disable the equalizer effect. */
  setEnabled(enabled: boolean): void;
  /** Returns band count, gain range, center freqs and presets (null if unavailable). */
  getInfo(): EqualizerInfo | null;
  /** Current gain (millibels) for every band, or null if unavailable. */
  getBandLevels(): number[] | null;
  /** Set the gain (millibels) for a single band. */
  setBandLevel(band: number, level: number): void;
  /** Apply one of the device's built-in presets by index. */
  usePreset(preset: number): void;
  /** Enable or disable the bass-boost effect. */
  setBassBoostEnabled(enabled: boolean): void;
  /** Set bass-boost strength, 0..1000. */
  setBassBoostStrength(strength: number): void;
  /** Release the native effect engines. */
  release(): void;
}

export default requireNativeModule<EqualizerModule>('Equalizer');
