import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, colors, spacing } from '../theme';
import type { Track } from '../types';
import { ArtTile } from './ArtTile';

type Props = {
  track: Track;
  size: number;
  onNext: () => void;
  onPrevious: () => void;
  onSeekBy: (deltaSeconds: number) => void;
  onEditArtwork: () => void;
};

const SEEK_STEP = 2;
const SWIPE_THRESHOLD = 45;

/**
 * Now-Playing artwork with gestures:
 * - horizontal **swipe** → previous / next track,
 * - **double-tap** the right/left half → seek +2s / −2s (with a flash),
 * - a corner button to change the artwork.
 * Built on PanResponder + Animated (no reanimated; old-arch safe).
 */
export function NowPlayingArt({ track, size, onNext, onPrevious, onSeekBy, onEditArtwork }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<{ side: 'left' | 'right'; time: number } | null>(null);
  const [flash, setFlash] = useState<{ side: 'left' | 'right'; text: string } | null>(null);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        translateX.setValue(g.dx * 0.5);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -SWIPE_THRESHOLD) onNext();
        else if (g.dx >= SWIPE_THRESHOLD) onPrevious();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const showFlash = (side: 'left' | 'right', text: string) => {
    setFlash({ side, text });
    flashOpacity.setValue(1);
    Animated.timing(flashOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setFlash(null);
      },
    );
  };

  const handleTap = (side: 'left' | 'right') => {
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.side === side && now - prev.time < 280) {
      lastTap.current = null;
      if (side === 'left') {
        onSeekBy(-SEEK_STEP);
        showFlash('left', `−${SEEK_STEP}s`);
      } else {
        onSeekBy(SEEK_STEP);
        showFlash('right', `+${SEEK_STEP}s`);
      }
    } else {
      lastTap.current = { side, time: now };
    }
  };

  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ translateX }] }}
      {...pan.panHandlers}
    >
      <ArtTile seed={track.album || track.title} trackId={track.id} size={size} rounded={radius.xl} />

      {/* Double-tap seek zones (single taps are intentionally no-ops). */}
      <Pressable style={[styles.zone, styles.left]} onPress={() => handleTap('left')} />
      <Pressable style={[styles.zone, styles.right]} onPress={() => handleTap('right')} />

      {flash ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flash,
            flash.side === 'left' ? styles.flashLeft : styles.flashRight,
            { opacity: flashOpacity },
          ]}
        >
          <Ionicons
            name={flash.side === 'left' ? 'play-back' : 'play-forward'}
            size={20}
            color={colors.white}
          />
          <Text style={styles.flashText}>{flash.text}</Text>
        </Animated.View>
      ) : null}

      <Pressable style={styles.editBtn} onPress={onEditArtwork} hitSlop={8}>
        <Ionicons name="image" size={18} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '45%',
  },
  left: { left: 0 },
  right: { right: 0 },
  flash: {
    position: 'absolute',
    top: '42%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  flashLeft: { left: spacing.lg },
  flashRight: { right: spacing.lg },
  flashText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  editBtn: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
