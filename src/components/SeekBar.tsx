import Slider from '@react-native-community/slider';
import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { formatSeconds } from '../utils/format';
import { SEEK_PIN_WIDTH, seekPinLeft } from '../utils/seek';

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
 * dragging. Scrubbing is isolated with a ref so the frequent playback-position
 * updates never feed a new `value` into the native slider mid-drag (which would
 * fight the gesture and make the thumb un-draggable on Android).
 */
export function SeekBar({ position, duration, onSeek }: Props) {
  const max = duration > 0 ? duration : 1;
  const [width, setWidth] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [value, setValue] = useState(0);
  const seekingRef = useRef(false);

  // Follow live playback only while the user isn't actively scrubbing.
  useEffect(() => {
    if (!seekingRef.current) {
      setValue(Math.min(Math.max(position, 0), max));
    }
  }, [position, max]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pinLeft = seekPinLeft(value, max, width);

  return (
    <View>
      <View style={styles.sliderWrap} onLayout={onLayout}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={max}
          value={value}
          tapToSeek
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          onSlidingStart={(v) => {
            seekingRef.current = true;
            setSeeking(true);
            setValue(v);
          }}
          onValueChange={(v) => {
            if (seekingRef.current) setValue(v);
          }}
          onSlidingComplete={(v) => {
            seekingRef.current = false;
            setSeeking(false);
            setValue(v);
            onSeek(v);
          }}
        />
        {seeking && width > 0 ? (
          <View pointerEvents="none" style={[styles.pin, { left: pinLeft }]}>
            <Text style={styles.pinText}>{formatSeconds(value)}</Text>
            <View style={styles.pinTail} />
          </View>
        ) : null}
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatSeconds(value)}</Text>
        <Text style={styles.time}>{formatSeconds(max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderWrap: {
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
    width: SEEK_PIN_WIDTH,
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
