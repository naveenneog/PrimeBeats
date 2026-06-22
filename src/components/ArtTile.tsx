import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { selectArt, useArtworkStore } from '../store/artworkStore';
import { radius } from '../theme';
import { gradientForSeed, initialsForName } from '../utils/format';

type Props = {
  /** Seed used for the deterministic gradient + initials (album or title). */
  seed: string;
  /** Optional real artwork uri; falls back to a generated gradient tile. */
  uri?: string;
  /** When set, a user/web/embedded artwork override for this track is used if present. */
  trackId?: string;
  size?: number;
  rounded?: number;
};

/**
 * Renders album art. Resolution order: a persisted per-track override
 * (custom upload / web download / embedded art) → an explicit `uri` →
 * a deterministic gradient tile with the item's initials.
 */
export function ArtTile({ seed, uri, trackId, size = 56, rounded = radius.md }: Props) {
  const override = useArtworkStore((s) => selectArt(s, trackId));
  const resolved = override ?? uri;
  const pair = gradientForSeed(seed);
  const fontSize = Math.max(12, size * 0.32);

  if (resolved) {
    return (
      <Image
        source={{ uri: resolved }}
        style={{ width: size, height: size, borderRadius: rounded }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <LinearGradient
      colors={pair}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tile, { width: size, height: size, borderRadius: rounded }]}
    >
      <Text style={[styles.initials, { fontSize }]} numberOfLines={1}>
        {initialsForName(seed)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
