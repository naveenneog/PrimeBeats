/**
 * Pure geometry helpers for the playback scrubber's floating timestamp pin.
 * Kept dependency-free so it can be unit-tested without the native slider.
 */

export const SEEK_THUMB_RADIUS = 11;
export const SEEK_PIN_WIDTH = 58;

/**
 * The left offset (px) for the floating timestamp pin so it stays centred over
 * the slider thumb, clamped so the pin never overflows the track edges.
 */
export function seekPinLeft(
  value: number,
  max: number,
  width: number,
  thumbRadius: number = SEEK_THUMB_RADIUS,
  pinWidth: number = SEEK_PIN_WIDTH,
): number {
  if (width <= 0 || max <= 0) return 0;
  const frac = Math.min(Math.max(value / max, 0), 1);
  const thumbCenter = thumbRadius + frac * Math.max(0, width - thumbRadius * 2);
  return Math.min(Math.max(thumbCenter - pinWidth / 2, 0), Math.max(0, width - pinWidth));
}

/**
 * Seconds to jump for the Nth consecutive seek-tap in a burst. The step grows
 * with each tap so repeated taps cover more ground: 2, 2, 3, 4, 5, 6 … which
 * makes the cumulative offset jump by +2, +2, +3, +4, +5 …
 */
export function progressiveSeekStep(tapIndex: number): number {
  if (tapIndex < 1) return 0;
  return Math.max(2, Math.floor(tapIndex));
}
