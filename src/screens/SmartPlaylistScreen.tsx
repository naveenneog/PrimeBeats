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
import { recommendForYou } from '../ml/recommender';
import type { RootStackParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import {
  selectMostPlayed,
  selectRecentlyPlayed,
  useTasteStore,
} from '../store/tasteStore';
import { colors, radius, spacing } from '../theme';
import type { SmartPlaylistKind } from '../types';

const CONFIG: Record<
  SmartPlaylistKind,
  { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  mostPlayed: { title: 'Most Played', subtitle: 'Your top tracks', icon: 'flame' },
  recentlyPlayed: { title: 'Recently Played', subtitle: 'Jump back in', icon: 'time' },
  forYou: { title: 'Made for You', subtitle: 'Tuned to your taste', icon: 'sparkles' },
};

export function SmartPlaylistScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'SmartPlaylist'>>();
  const kind = params.kind;
  const cfg = CONFIG[kind];

  const library = useLibraryStore((s) => s.tracks);
  const byId = useLibraryStore((s) => s.byId);
  const profile = useTasteStore((s) => s.profile);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const tracks = useMemo(() => {
    if (kind === 'forYou') return recommendForYou(library, profile, 50);
    if (kind === 'mostPlayed') return selectMostPlayed(profile, byId, 100);
    return selectRecentlyPlayed(profile, byId, 100);
  }, [kind, profile, byId, library]);

  const shufflePlay = () => {
    if (tracks.length === 0) return;
    if (!shuffle) toggleShuffle();
    playFrom(tracks, Math.floor(Math.random() * tracks.length));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title={cfg.title} />
      <TrackList
        tracks={tracks}
        onPressTrack={(index) => playFrom(tracks, index)}
        bottomPadding={MINI_PLAYER_HEIGHT + spacing.xxl}
        ListHeaderComponent={
          <View style={styles.hero}>
            <View style={styles.iconTile}>
              <ArtTile seed={cfg.title} size={150} rounded={radius.lg} />
              <View style={styles.iconBadge}>
                <Ionicons name={cfg.icon} size={26} color={colors.white} />
              </View>
            </View>
            <Text style={styles.title}>{cfg.title}</Text>
            <Text style={styles.subtitle}>
              {cfg.subtitle} · {tracks.length} song{tracks.length === 1 ? '' : 's'}
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
            icon={cfg.icon}
            title={kind === 'forYou' ? 'Not enough listening yet' : 'Nothing here yet'}
            message="Play some music and this will fill up automatically as PrimeBeats learns your taste."
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
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  iconTile: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
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
