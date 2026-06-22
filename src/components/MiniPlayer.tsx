import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { selectCurrentTrack, usePlayerStore } from '../store/playerStore';
import type { RootStackParamList } from '../navigation/types';
import { ArtTile } from './ArtTile';

export const MINI_PLAYER_HEIGHT = 60;

/** Persistent now-playing bar shown above the tab bar. Hidden when idle. */
export function MiniPlayer() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const track = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);

  if (!track) return null;

  const progress = durationSec > 0 ? Math.min(1, positionSec / durationSec) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Pressable
        style={styles.inner}
        android_ripple={{ color: colors.surfaceAlt }}
        onPress={() => navigation.navigate('NowPlaying')}
      >
        <ArtTile seed={track.album || track.title} uri={track.artworkUri} size={42} rounded={radius.sm} />
        <View style={styles.meta}>
          <Text numberOfLines={1} style={styles.title}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {track.artist}
          </Text>
        </View>
        <Pressable hitSlop={10} onPress={togglePlay} style={styles.control}>
          <Ionicons
            name={isBuffering ? 'ellipsis-horizontal' : isPlaying ? 'pause' : 'play'}
            size={24}
            color={colors.text}
          />
        </Pressable>
        <Pressable hitSlop={10} onPress={() => next(false)} style={styles.control}>
          <Ionicons name="play-skip-forward" size={20} color={colors.text} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.primary,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  meta: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  control: {
    paddingHorizontal: spacing.xs,
  },
});
