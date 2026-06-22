import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWindowDimensions } from 'react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { BigHeader } from '../components/Header';
import { EmptyState } from '../components/States';
import { MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';
import type { RootStackParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { colors, radius, spacing } from '../theme';

export function AlbumsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const albums = useLibraryStore((s) => s.albums);
  const { width } = useWindowDimensions();

  const columns = 2;
  const gutter = spacing.lg;
  const tileSize = (width - gutter * (columns + 1)) / columns;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={{ paddingHorizontal: gutter, gap: gutter }}
        contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + spacing.xxl, gap: gutter }}
        ListHeaderComponent={
          <BigHeader title="Albums" subtitle={`${albums.length} album${albums.length === 1 ? '' : 's'}`} />
        }
        ListEmptyComponent={
          <EmptyState icon="albums" title="No albums yet" message="Albums are grouped from your music folders." />
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ width: tileSize }}
            onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id })}
          >
            <ArtTile seed={item.name} size={tileSize} rounded={radius.md} />
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.artist}>
              {item.artist} · {item.trackIds.length}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
