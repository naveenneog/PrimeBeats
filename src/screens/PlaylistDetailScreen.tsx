import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';
import { EmptyState } from '../components/States';
import { TextPromptModal } from '../components/TextPromptModal';
import { TopBar } from '../components/TopBar';
import { TrackList } from '../components/TrackList';
import type { RootStackParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { colors, radius, spacing } from '../theme';
import { formatDuration } from '../utils/format';

export function PlaylistDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'PlaylistDetail'>>();
  const playlist = usePlaylistStore((s) => s.playlists.find((p) => p.id === params.playlistId));
  const renamePlaylist = usePlaylistStore((s) => s.renamePlaylist);
  const removeTrack = usePlaylistStore((s) => s.removeTrack);
  const getTracks = useLibraryStore((s) => s.getTracks);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const [renaming, setRenaming] = useState(false);

  const tracks = useMemo(
    () => (playlist ? getTracks(playlist.trackIds) : []),
    [playlist, getTracks],
  );
  const totalMs = useMemo(() => tracks.reduce((sum, t) => sum + t.durationMs, 0), [tracks]);

  if (!playlist) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar title="Playlist" />
        <EmptyState icon="list" title="Playlist not found" />
      </SafeAreaView>
    );
  }

  const shufflePlay = () => {
    if (tracks.length === 0) return;
    if (!shuffle) toggleShuffle();
    playFrom(tracks, Math.floor(Math.random() * tracks.length));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar
        title={playlist.name}
        right={
          <Pressable hitSlop={10} onPress={() => setRenaming(true)}>
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </Pressable>
        }
      />
      <TrackList
        tracks={tracks}
        onPressTrack={(index) => playFrom(tracks, index)}
        onTrackMenu={(track) => removeTrack(playlist.id, track.id)}
        bottomPadding={MINI_PLAYER_HEIGHT + spacing.xxl}
        ListHeaderComponent={
          <View style={styles.hero}>
            <ArtTile seed={playlist.name} size={170} rounded={radius.lg} />
            <Text style={styles.title} numberOfLines={2}>
              {playlist.name}
            </Text>
            <Text style={styles.subtitle}>
              {tracks.length} song{tracks.length === 1 ? '' : 's'}
              {totalMs > 0 ? ` · ${formatDuration(totalMs)}` : ''}
            </Text>
            {tracks.length > 0 ? (
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
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="add-circle-outline"
            title="This playlist is empty"
            message="Tap the menu on any song to add it here."
            actionLabel="Browse songs"
            onAction={() => navigation.navigate('Tabs', { screen: 'Songs' })}
          />
        }
      />

      <TextPromptModal
        visible={renaming}
        title="Rename playlist"
        initialValue={playlist.name}
        confirmLabel="Rename"
        onCancel={() => setRenaming(false)}
        onConfirm={(name) => {
          renamePlaylist(playlist.id, name);
          setRenaming(false);
        }}
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
    paddingTop: spacing.sm,
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
