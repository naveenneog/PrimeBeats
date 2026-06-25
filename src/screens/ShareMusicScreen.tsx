import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { EmptyState } from '../components/States';
import { TopBar } from '../components/TopBar';
import { ShareIn } from '../native/shareIn';
import { useLibraryStore } from '../store/libraryStore';
import { colors, radius, spacing } from '../theme';
import type { Track } from '../types';
import { formatDuration } from '../utils/format';

export function ShareMusicScreen() {
  const navigation = useNavigation();
  const tracks = useLibraryStore((s) => s.tracks);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [sending, setSending] = useState(false);

  const selectedTracks = useMemo(
    () => tracks.filter((t) => selected[t.id]),
    [tracks, selected],
  );
  const count = selectedTracks.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });

  const clear = () => setSelected({});

  const send = async () => {
    if (count === 0 || sending) return;
    setSending(true);
    const ok = await ShareIn.shareTracks(selectedTracks);
    setSending(false);
    if (!ok) {
      Alert.alert(
        'Couldn’t share',
        'Sharing isn’t available on this device, or the selected files couldn’t be read.',
      );
    } else {
      clear();
    }
  };

  const renderItem = ({ item }: { item: Track }) => {
    const on = !!selected[item.id];
    return (
      <Pressable
        style={styles.row}
        android_ripple={{ color: colors.surfaceAlt }}
        onPress={() => toggle(item.id)}
      >
        <ArtTile seed={item.album || item.title} trackId={item.id} size={44} rounded={radius.sm} />
        <View style={styles.meta}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {item.artist}
            {item.durationMs > 0 ? ` · ${formatDuration(item.durationMs)}` : ''}
          </Text>
        </View>
        <Ionicons
          name={on ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={on ? colors.primary : colors.textFaint}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar
        title="Share music"
        right={
          count > 0 ? (
            <Pressable hitSlop={8} onPress={clear}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : undefined
        }
      />

      {tracks.length === 0 ? (
        <EmptyState icon="share-social" title="Nothing to share" message="Add some music first." />
      ) : (
        <>
          <Text style={styles.hint}>
            Select songs to send to another PrimeBeats user — they go through your phone’s share
            sheet (Nearby Share, Bluetooth, etc.).
          </Text>
          <FlatList
            data={tracks}
            keyExtractor={(t) => t.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
          <View style={styles.footer}>
            <Pressable
              style={[styles.sendBtn, count === 0 && styles.sendBtnOff]}
              onPress={send}
              disabled={count === 0 || sending}
            >
              <Ionicons name="share-social" size={18} color={count === 0 ? colors.textFaint : colors.black} />
              <Text style={[styles.sendText, count === 0 && styles.sendTextOff]}>
                {sending ? 'Opening…' : count === 0 ? 'Select songs to send' : `Send ${count} song${count === 1 ? '' : 's'}`}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
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
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 12.5,
    marginTop: 2,
  },
  clear: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    paddingRight: spacing.xs,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  sendBtnOff: {
    backgroundColor: colors.surfaceAlt,
  },
  sendText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '800',
  },
  sendTextOff: {
    color: colors.textFaint,
  },
});
