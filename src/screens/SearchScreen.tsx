import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../components/States';
import { MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';
import { TrackList } from '../components/TrackList';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { colors, radius, spacing } from '../theme';

export function SearchScreen() {
  const tracks = useLibraryStore((s) => s.tracks);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q),
    );
  }, [query, tracks]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Songs, artists, albums"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {query.trim().length === 0 ? (
        <EmptyState icon="search" title="Search your library" message="Find songs, artists, and albums on your device." />
      ) : (
        <TrackList
          tracks={results}
          onPressTrack={(index) => playFrom(results, index)}
          bottomPadding={MINI_PLAYER_HEIGHT + spacing.xxl}
          ListHeaderComponent={
            <Text style={styles.count}>
              {results.length} result{results.length === 1 ? '' : 's'}
            </Text>
          }
          ListEmptyComponent={
            <EmptyState icon="sad-outline" title="No matches" message={`Nothing found for “${query.trim()}”.`} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    height: 46,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: '100%',
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
