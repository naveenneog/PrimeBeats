import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';
import { EmptyState, LoadingState } from '../components/States';
import { TrackRow } from '../components/TrackRow';
import type { RootStackParamList, TabsParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { usePlaylistStore } from '../store/playlistStore';
import { selectCurrentTrack, usePlayerStore } from '../store/playerStore';
import { colors, radius, spacing } from '../theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const tracks = useLibraryStore((s) => s.tracks);
  const albums = useLibraryStore((s) => s.albums);
  const status = useLibraryStore((s) => s.status);
  const load = useLibraryStore((s) => s.load);
  const playlists = usePlaylistStore((s) => s.playlists);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

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

  const goTab = (screen: keyof TabsParamList) => navigation.navigate('Tabs', { screen });

  const shuffleAll = () => {
    if (tracks.length === 0) return;
    if (!shuffle) toggleShuffle();
    playFrom(tracks, Math.floor(Math.random() * tracks.length));
  };

  const recent = tracks.slice(0, 6);
  const topAlbums = albums.slice(0, 10);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + spacing.xxl }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.brand}>PrimeBeats</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => goTab('Search')} style={styles.iconBtn}>
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
        </View>

        {tracks.length === 0 ? (
          <EmptyState
            icon="musical-notes"
            title="No music found"
            message="Add audio files to your device, then refresh."
            actionLabel="Refresh"
            onAction={load}
          />
        ) : (
          <>
            <Pressable style={styles.shuffleCard} onPress={shuffleAll}>
              <View style={styles.shuffleIcon}>
                <Ionicons name="shuffle" size={24} color={colors.black} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shuffleTitle}>Shuffle all songs</Text>
                <Text style={styles.shuffleSub}>{tracks.length} tracks in your library</Text>
              </View>
              <Ionicons name="play-circle" size={36} color={colors.primary} />
            </Pressable>

            {topAlbums.length > 0 ? (
              <Section title="Albums" onSeeAll={() => goTab('Albums')}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                >
                  {topAlbums.map((album) => (
                    <Pressable
                      key={album.id}
                      style={styles.albumCard}
                      onPress={() => navigation.navigate('AlbumDetail', { albumId: album.id })}
                    >
                      <ArtTile seed={album.name} size={140} rounded={radius.md} />
                      <Text numberOfLines={1} style={styles.albumName}>
                        {album.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.albumArtist}>
                        {album.artist}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Section>
            ) : null}

            {playlists.length > 0 ? (
              <Section title="Your playlists" onSeeAll={() => goTab('Playlists')}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                >
                  {playlists.slice(0, 10).map((pl) => (
                    <Pressable
                      key={pl.id}
                      style={styles.albumCard}
                      onPress={() => navigation.navigate('PlaylistDetail', { playlistId: pl.id })}
                    >
                      <ArtTile seed={pl.name} size={140} rounded={radius.md} />
                      <Text numberOfLines={1} style={styles.albumName}>
                        {pl.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.albumArtist}>
                        {pl.trackIds.length} song{pl.trackIds.length === 1 ? '' : 's'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Section>
            ) : null}

            <Section title="Songs" onSeeAll={() => goTab('Songs')}>
              {recent.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isActive={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  onPress={() => playFrom(recent, index)}
                  onMenu={() => navigation.navigate('AddToPlaylist', { trackIds: [track.id] })}
                />
              ))}
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll ? (
          <Pressable hitSlop={8} onPress={onSeeAll}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 14,
  },
  brand: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  shuffleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  shuffleSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  seeAll: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  hRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  albumCard: {
    width: 140,
  },
  albumName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  albumArtist: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
