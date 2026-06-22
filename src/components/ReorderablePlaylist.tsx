import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, type PanResponderInstance, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Track } from '../types';
import { formatDuration } from '../utils/format';
import { ArtTile } from './ArtTile';

export const REORDER_ROW_HEIGHT = 60;

type Props = {
  tracks: Track[];
  currentTrackId?: string;
  onPlay: (tracks: Track[], index: number) => void;
  onReorder: (trackIds: string[]) => void;
  onRemove: (trackId: string) => void;
};

/**
 * A drag-to-reorder list for playlist tracks. The drag handle (≡) lifts the row
 * (it floats and follows the finger); on release the order is recomputed by the
 * vertical distance moved. Built on PanResponder + Animated (no reanimated).
 */
export function ReorderablePlaylist({ tracks, currentTrackId, onPlay, onReorder, onRemove }: Props) {
  const [order, setOrder] = useState<Track[]>(tracks);
  const [dragId, setDragId] = useState<string | null>(null);

  const orderRef = useRef<Track[]>(tracks);
  const dragY = useRef(new Animated.Value(0)).current;
  const grabIndex = useRef(0);
  const responders = useRef<Map<string, PanResponderInstance>>(new Map());

  // Keep local order in sync when the playlist changes externally (add/remove).
  useEffect(() => {
    setOrder(tracks);
    orderRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const responderFor = (trackId: string): PanResponderInstance => {
    const existing = responders.current.get(trackId);
    if (existing) return existing;
    const created = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        grabIndex.current = orderRef.current.findIndex((t) => t.id === trackId);
        dragY.setValue(0);
        setDragId(trackId);
      },
      onPanResponderMove: (_e, g) => dragY.setValue(g.dy),
      onPanResponderRelease: (_e, g) => {
        const current = orderRef.current;
        const from = grabIndex.current;
        const to = Math.max(0, Math.min(current.length - 1, from + Math.round(g.dy / REORDER_ROW_HEIGHT)));
        if (from >= 0 && from !== to) {
          const next = [...current];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          setOrder(next);
          orderRef.current = next;
          onReorder(next.map((t) => t.id));
        }
        dragY.setValue(0);
        setDragId(null);
      },
      onPanResponderTerminate: () => {
        dragY.setValue(0);
        setDragId(null);
      },
    });
    responders.current.set(trackId, created);
    return created;
  };

  return (
    <View style={{ minHeight: order.length * REORDER_ROW_HEIGHT }}>
      {order.map((track, index) => {
        const dragging = dragId === track.id;
        const isActive = currentTrackId === track.id;
        const content = (
          <>
            <Pressable style={styles.main} onPress={() => onPlay(order, index)}>
              <ArtTile seed={track.album || track.title} trackId={track.id} size={40} rounded={radius.sm} />
              <View style={styles.meta}>
                <Text numberOfLines={1} style={[styles.title, isActive && styles.activeTitle]}>
                  {track.title}
                </Text>
                <Text numberOfLines={1} style={styles.artist}>
                  {track.artist} · {formatDuration(track.durationMs)}
                </Text>
              </View>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => onRemove(track.id)} style={styles.iconBtn}>
              <Ionicons name="remove-circle-outline" size={22} color={colors.textMuted} />
            </Pressable>
            <View style={styles.handle} {...responderFor(track.id).panHandlers}>
              <Ionicons name="reorder-three" size={26} color={colors.textMuted} />
            </View>
          </>
        );

        if (dragging) {
          return (
            <Animated.View
              key={track.id}
              style={[styles.row, styles.dragging, { transform: [{ translateY: dragY }] }]}
            >
              {content}
            </Animated.View>
          );
        }
        return (
          <View key={track.id} style={styles.row}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: REORDER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  dragging: {
    backgroundColor: colors.surfaceAlt,
    zIndex: 10,
    elevation: 8,
    borderRadius: radius.md,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  meta: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  activeTitle: {
    color: colors.primary,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  handle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
