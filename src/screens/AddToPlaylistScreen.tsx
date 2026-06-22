import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { EmptyState } from '../components/States';
import { TextPromptModal } from '../components/TextPromptModal';
import { TopBar } from '../components/TopBar';
import type { RootStackParamList } from '../navigation/types';
import { usePlaylistStore } from '../store/playlistStore';
import { colors, radius, spacing } from '../theme';

export function AddToPlaylistScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'AddToPlaylist'>>();
  const trackIds = params.trackIds;
  const playlists = usePlaylistStore((s) => s.playlists);
  const addTracks = usePlaylistStore((s) => s.addTracks);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const [creating, setCreating] = useState(false);

  const addAndClose = (playlistId: string) => {
    addTracks(playlistId, trackIds);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="Add to playlist" variant="close" />

      <Pressable style={styles.createRow} onPress={() => setCreating(true)}>
        <View style={styles.plusTile}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </View>
        <Text style={styles.createText}>New playlist</Text>
      </Pressable>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="list"
            title="No playlists yet"
            message="Create your first playlist to add this song."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            android_ripple={{ color: colors.surfaceAlt }}
            onPress={() => addAndClose(item.id)}
          >
            <ArtTile seed={item.name} size={48} rounded={radius.sm} />
            <View style={styles.meta}>
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.count}>
                {item.trackIds.length} song{item.trackIds.length === 1 ? '' : 's'}
              </Text>
            </View>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </Pressable>
        )}
      />

      <TextPromptModal
        visible={creating}
        title="New playlist"
        placeholder="Playlist name"
        confirmLabel="Create & add"
        onCancel={() => setCreating(false)}
        onConfirm={(name) => {
          const pl = createPlaylist(name);
          setCreating(false);
          addAndClose(pl.id);
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
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  plusTile: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  meta: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  count: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
