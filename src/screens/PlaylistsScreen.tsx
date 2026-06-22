import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { BigHeader } from '../components/Header';
import { MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';
import { EmptyState } from '../components/States';
import { TextPromptModal } from '../components/TextPromptModal';
import type { RootStackParamList } from '../navigation/types';
import { usePlaylistStore } from '../store/playlistStore';
import { colors, radius, spacing } from '../theme';

export function PlaylistsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const playlists = usePlaylistStore((s) => s.playlists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const [creating, setCreating] = useState(false);

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete playlist', `Delete “${name}”? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + spacing.xxl, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <BigHeader
              title="Playlists"
              subtitle={`${playlists.length} playlist${playlists.length === 1 ? '' : 's'}`}
              right={
                <Pressable style={styles.newBtn} onPress={() => setCreating(true)}>
                  <Ionicons name="add" size={20} color={colors.black} />
                </Pressable>
              }
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="list"
            title="No playlists yet"
            message="Create a playlist and add songs from anywhere in your library."
            actionLabel="Create playlist"
            onAction={() => setCreating(true)}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            android_ripple={{ color: colors.surfaceAlt }}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id })}
            onLongPress={() => confirmDelete(item.id, item.name)}
          >
            <ArtTile seed={item.name} size={56} rounded={radius.md} />
            <View style={styles.meta}>
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.count}>
                {item.trackIds.length} song{item.trackIds.length === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={() => confirmDelete(item.id, item.name)} style={styles.trash}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
      />

      <TextPromptModal
        visible={creating}
        title="New playlist"
        placeholder="Playlist name"
        confirmLabel="Create"
        onCancel={() => setCreating(false)}
        onConfirm={(name) => {
          const pl = createPlaylist(name);
          setCreating(false);
          navigation.navigate('PlaylistDetail', { playlistId: pl.id });
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
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  trash: {
    padding: spacing.xs,
  },
});
