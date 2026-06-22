import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';
import { EmptyState } from '../components/States';
import { TopBar } from '../components/TopBar';
import { TrackList } from '../components/TrackList';
import type { RootStackParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, radius, spacing } from '../theme';
import { formatDuration } from '../utils/format';

export function AlbumDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'AlbumDetail'>>();
  const album = useLibraryStore((s) => s.albums.find((a) => a.id === params.albumId));
  const getTracks = useLibraryStore((s) => s.getTracks);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const tracks = useMemo(() => (album ? getTracks(album.trackIds) : []), [album, getTracks]);
  const totalMs = useMemo(() => tracks.reduce((sum, t) => sum + t.durationMs, 0), [tracks]);

  if (!album) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar title="Album" />
        <EmptyState icon="albums" title="Album not found" />
      </SafeAreaView>
    );
  }

  const shufflePlay = () => {
    if (!shuffle) toggleShuffle();
    playFrom(tracks, Math.floor(Math.random() * Math.max(1, tracks.length)));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title={album.name} />
      <TrackList
        tracks={tracks}
        onPressTrack={(index) => playFrom(tracks, index)}
        bottomPadding={MINI_PLAYER_HEIGHT + spacing.xxl}
        ListHeaderComponent={
          <View style={styles.hero}>
            <ArtTile seed={album.name} size={180} rounded={radius.lg} />
            <Text style={styles.title} numberOfLines={2}>
              {album.name}
            </Text>
            <Text style={styles.subtitle}>
              {album.artist} · {tracks.length} song{tracks.length === 1 ? '' : 's'} · {formatDuration(totalMs)}
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => playFrom(tracks, 0)}>
                <Ionicons name="play" size={18} color={colors.black} />
                <Text style={styles.primaryText}>Play</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.ghostBtn]} onPress={shufflePlay}>
                <Ionicons name="shuffle" size={18} color={colors.text} />
                <Text style={styles.ghostText}>Shuffle</Text>
              </Pressable>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  primaryBtn: { backgroundColor: colors.primary },
  primaryText: { color: colors.black, fontWeight: '700', fontSize: 15 },
  ghostBtn: { backgroundColor: colors.surfaceAlt },
  ghostText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
