import { registerWebModule, NativeModule } from 'expo';

import type { EqualizerInfo } from './Equalizer.types';

// Web has no native audio-effect engine; everything no-ops and reports
// "unavailable" so the UI hides the equalizer cleanly.
class EqualizerModule extends NativeModule {
  isAvailable(): boolean {
    return false;
  }
  setEnabled(_enabled: boolean): void {}
  getInfo(): EqualizerInfo | null {
    return null;
  }
  getBandLevels(): number[] | null {
    return null;
  }
  setBandLevel(_band: number, _level: number): void {}
  usePreset(_preset: number): void {}
  setBassBoostEnabled(_enabled: boolean): void {}
  setBassBoostStrength(_strength: number): void {}
  release(): void {}
}

export default registerWebModule(EqualizerModule, 'EqualizerModule');
