import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Track } from '../types';
import { formatDuration } from '../utils/format';
import { ArtTile } from './ArtTile';

type Props = {
  track: Track;
  isActive?: boolean;
  isPlaying?: boolean;
  index?: number;
  onPress: () => void;
  onMenu?: () => void;
};

function TrackRowBase({ track, isActive, isPlaying, onPress, onMenu }: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.surfaceAlt }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ArtTile seed={track.album || track.title} uri={track.artworkUri} size={48} rounded={radius.sm} />
      <View style={styles.meta}>
        <Text
          numberOfLines={1}
          style={[styles.title, isActive && styles.activeTitle]}
        >
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist}
        </Text>
      </View>

      {isActive ? (
        <Ionicons
          name={isPlaying ? 'volume-high' : 'pause'}
          size={16}
          color={colors.primary}
          style={styles.activeIcon}
        />
      ) : (
        <Text style={styles.duration}>{formatDuration(track.durationMs)}</Text>
      )}

      {onMenu ? (
        <Pressable hitSlop={10} onPress={onMenu} style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  activeTitle: {
    color: colors.primary,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  duration: {
    color: colors.textFaint,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  activeIcon: {
    width: 24,
    textAlign: 'center',
  },
  menuBtn: {
    paddingLeft: spacing.xs,
  },
});

export const TrackRow = memo(TrackRowBase);
