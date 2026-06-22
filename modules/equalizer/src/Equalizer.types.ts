/** Static description of the device equalizer, returned by `getInfo()`. */
export type EqualizerInfo = {
  /** Number of frequency bands the device equalizer exposes. */
  numberOfBands: number;
  /** Minimum band gain in millibels (e.g. -1500 = -15 dB). */
  minLevel: number;
  /** Maximum band gain in millibels (e.g. 1500 = +15 dB). */
  maxLevel: number;
  /** Center frequency of each band, in Hz. */
  centerFreqs: number[];
  /** Built-in preset names provided by the device (Flat, Rock, Pop, ...). */
  presets: string[];
  /** Whether the equalizer is currently enabled. */
  enabled: boolean;
  /** Whether the device supports bass boost strength control. */
  bassBoostSupported: boolean;
};
