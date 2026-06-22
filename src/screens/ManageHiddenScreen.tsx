import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { EmptyState } from '../components/States';
import { TopBar } from '../components/TopBar';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { colors, radius, spacing } from '../theme';
import { formatDuration } from '../utils/format';

/** Tracks longer than this are likely recordings / podcasts / long mixes. */
const LONG_THRESHOLD_MS = 10 * 60 * 1000;

export function ManageHiddenScreen() {
  const allTracks = useLibraryStore((s) => s.allTracks);
  const hidden = useSettingsStore((s) => s.hidden);
  const toggleHidden = useSettingsStore((s) => s.toggleHidden);
  const hideMany = useSettingsStore((s) => s.hideMany);
  const clearHidden = useSettingsStore((s) => s.clearHidden);
  const [longOnly, setLongOnly] = useState(false);

  const data = useMemo(() => {
    const sorted = [...allTracks].sort((a, b) => b.durationMs - a.durationMs);
    return longOnly ? sorted.filter((t) => t.durationMs >= LONG_THRESHOLD_MS) : sorted;
  }, [allTracks, longOnly]);

  const hiddenCount = Object.keys(hidden).length;
  const longIds = useMemo(
    () => allTracks.filter((t) => t.durationMs >= LONG_THRESHOLD_MS).map((t) => t.id),
    [allTracks],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar
        title="Hidden tracks"
        right={
          hiddenCount > 0 ? (
            <Pressable hitSlop={8} onPress={clearHidden}>
              <Text style={styles.unhideAll}>Unhide all</Text>
            </Pressable>
          ) : undefined
        }
      />

      <View style={styles.toolbar}>
        <Pressable
          style={[styles.chip, longOnly && styles.chipOn]}
          onPress={() => setLongOnly((v) => !v)}
        >
          <Ionicons name="time" size={16} color={longOnly ? colors.black : colors.textMuted} />
          <Text style={[styles.chipText, longOnly && styles.chipTextOn]}>Long (10 min+)</Text>
        </Pressable>
        {longIds.length > 0 ? (
          <Pressable style={styles.chip} onPress={() => hideMany(longIds)}>
            <Ionicons name="eye-off" size={16} color={colors.textMuted} />
            <Text style={styles.chipText}>Hide all long</Text>
          </Pressable>
        ) : null}
        <Text style={styles.count}>{hiddenCount} hidden</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState icon="eye-off" title="No tracks" message="Nothing to manage here yet." />
        }
        initialNumToRender={16}
        windowSize={11}
        removeClippedSubviews
        renderItem={({ item }) => {
          const isHidden = !!hidden[item.id];
          return (
            <Pressable
              style={styles.row}
              android_ripple={{ color: colors.surfaceAlt }}
              onPress={() => toggleHidden(item.id)}
            >
              <ArtTile seed={item.album || item.title} size={44} rounded={radius.sm} />
              <View style={styles.meta}>
                <Text numberOfLines={1} style={[styles.title, isHidden && styles.titleHidden]}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.artist}>
                  {item.artist} · {formatDuration(item.durationMs)}
                </Text>
              </View>
              <Ionicons
                name={isHidden ? 'eye-off' : 'eye-outline'}
                size={22}
                color={isHidden ? colors.danger : colors.textFaint}
              />
            </Pressable>
          );
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
  unhideAll: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipOn: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextOn: {
    color: colors.black,
  },
  count: {
    marginLeft: 'auto',
    color: colors.textMuted,
    fontSize: 13,
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
  titleHidden: {
    color: colors.textFaint,
    textDecorationLine: 'line-through',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
