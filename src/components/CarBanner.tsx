import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarStore } from '../store/carStore';
import { colors, radius, spacing } from '../theme';

/**
 * A slim banner pinned to the top while Android Auto is the active playback
 * source, so the phone shows what's playing in the car (and can control it).
 * Renders nothing during normal phone use.
 */
export function CarBanner() {
  const insets = useSafeAreaInsets();
  const active = useCarStore((s) => s.active);
  const playing = useCarStore((s) => s.playing);
  const track = useCarStore((s) => s.track);
  const playPause = useCarStore((s) => s.playPause);
  const next = useCarStore((s) => s.next);
  const stop = useCarStore((s) => s.stop);

  if (!active || !track) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={styles.iconWrap}>
          <Ionicons name="car-sport" size={18} color={colors.black} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.label}>Playing in your car</Text>
          <Text numberOfLines={1} style={styles.title}>
            {track.title ?? 'Unknown'}
            {track.artist ? ` · ${track.artist}` : ''}
          </Text>
        </View>
        <Pressable hitSlop={8} onPress={playPause} style={styles.btn}>
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={8} onPress={next} style={styles.btn}>
          <Ionicons name="play-skip-forward" size={20} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={8} onPress={stop} style={styles.btn}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
  label: {
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 1,
  },
  btn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
