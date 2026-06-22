import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { formatSeconds } from '../utils/format';

const THUMB_RADIUS = 11;
const PIN_WIDTH = 58;

type Props = {
  /** Current playback position in seconds. */
  position: number;
  /** Track length in seconds (slider maximum). */
  duration: number;
  /** Called with the new position (seconds) when the user finishes scrubbing. */
  onSeek: (seconds: number) => void;
};

/**
 * Playback scrubber with a floating timestamp "pin" that tracks the thumb while
 * dragging. Because the user's finger covers the thumb, the pin surfaces the
 * exact position they're about to seek to, above the slider.
 */
export function SeekBar({ position, duration, onSeek }: Props) {
  const [width, setWidth] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const max = duration > 0 ? duration : 1;
  const display = seeking ? seekValue : Math.min(Math.max(position, 0), max);
  const frac = max > 0 ? Math.min(Math.max(display / max, 0), 1) : 0;

  // Thumb centre travels between THUMB_RADIUS and (width - THUMB_RADIUS).
  const thumbCenter = THUMB_RADIUS + frac * Math.max(0, width - THUMB_RADIUS * 2);
  const pinLeft = Math.min(Math.max(thumbCenter - PIN_WIDTH / 2, 0), Math.max(0, width - PIN_WIDTH));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View>
      <View style={styles.track} onLayout={onLayout}>
        {seeking && width > 0 ? (
          <View style={[styles.pin, { left: pinLeft }]} pointerEvents="none">
            <Text style={styles.pinText}>{formatSeconds(display)}</Text>
            <View style={styles.pinTail} />
          </View>
        ) : null}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={max}
          value={display}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          onSlidingStart={() => {
            setSeekValue(display);
            setSeeking(true);
          }}
          onValueChange={setSeekValue}
          onSlidingComplete={(value) => {
            onSeek(value);
            setSeeking(false);
          }}
        />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatSeconds(display)}</Text>
        <Text style={styles.time}>{formatSeconds(max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 36,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 36,
  },
  pin: {
    position: 'absolute',
    bottom: 30,
    width: PIN_WIDTH,
    alignItems: 'center',
    zIndex: 10,
  },
  pinText: {
    backgroundColor: colors.primary,
    color: colors.black,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
    textAlign: 'center',
    minWidth: 44,
  },
  pinTail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
