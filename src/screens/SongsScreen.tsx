import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigHeader } from '../components/Header';
import { EmptyState, LoadingState } from '../components/States';
import { TrackList } from '../components/TrackList';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, radius, spacing } from '../theme';
import { MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';

export function SongsScreen() {
  const tracks = useLibraryStore((s) => s.tracks);
  const status = useLibraryStore((s) => s.status);
  const load = useLibraryStore((s) => s.load);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  if (status === 'loading' || status === 'idle') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoadingState label="Scanning your music…" />
      </SafeAreaView>
    );
  }

  if (status === 'denied') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <EmptyState
          icon="lock-closed"
          title="Permission needed"
          message="PrimeBeats needs access to your audio files to build your library."
          actionLabel="Grant access"
          onAction={load}
        />
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
      <TrackList
        tracks={tracks}
        onPressTrack={(index) => playFrom(tracks, index)}
        bottomPadding={MINI_PLAYER_HEIGHT + spacing.xxl}
        ListHeaderComponent={
          <View>
            <BigHeader title="Songs" subtitle={`${tracks.length} track${tracks.length === 1 ? '' : 's'}`} />
            {tracks.length > 0 ? (
              <View style={styles.actions}>
                <Pressable style={[styles.actionBtn, styles.primaryBtn]} onPress={() => playFrom(tracks, 0)}>
                  <Ionicons name="play" size={18} color={colors.black} />
                  <Text style={styles.primaryText}>Play all</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.ghostBtn]} onPress={shufflePlay}>
                  <Ionicons name="shuffle" size={18} color={colors.text} />
                  <Text style={styles.ghostText}>Shuffle</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes"
            title="No music found"
            message="Add audio files to your device's storage, then refresh."
            actionLabel="Refresh"
            onAction={load}
          />
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.black,
    fontWeight: '700',
    fontSize: 15,
  },
  ghostBtn: {
    backgroundColor: colors.surfaceAlt,
  },
  ghostText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
});
