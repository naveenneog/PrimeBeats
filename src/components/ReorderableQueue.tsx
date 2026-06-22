import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  type PanResponderInstance,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Track } from '../types';
import { formatDuration } from '../utils/format';
import { ArtTile } from './ArtTile';

export const QUEUE_ROW_HEIGHT = 60;

type Props = {
  tracks: Track[];
  currentIndex: number;
  /** Tap a row to jump to that track. */
  onJump: (index: number) => void;
  /** Drag a row to a new position (single move). */
  onMove: (from: number, to: number) => void;
};

/**
 * Drag-to-reorder queue list. Tap a row to jump to it; drag the handle (≡) to
 * change the order of upcoming songs. Built on PanResponder + Animated so it
 * works on the old RN architecture (no reanimated). Each release emits a single
 * (from -> to) move, which the player applies to the native RNTP queue.
 */
export function ReorderableQueue({ tracks, currentIndex, onJump, onMove }: Props) {
  const [order, setOrder] = useState<Track[]>(tracks);
  const [dragId, setDragId] = useState<string | null>(null);

  const orderRef = useRef<Track[]>(tracks);
  const dragY = useRef(new Animated.Value(0)).current;
  const grabIndex = useRef(0);
  const responders = useRef<Map<string, PanResponderInstance>>(new Map());

  // Resync when the queue changes externally (track advance, radio extend, etc.).
  useEffect(() => {
    setOrder(tracks);
    orderRef.current = tracks;
  }, [tracks]);

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
        const to = Math.max(
          0,
          Math.min(current.length - 1, from + Math.round(g.dy / QUEUE_ROW_HEIGHT)),
        );
        if (from >= 0 && from !== to) {
          const next = [...current];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          setOrder(next);
          orderRef.current = next;
          onMove(from, to);
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
    <View style={{ minHeight: order.length * QUEUE_ROW_HEIGHT }}>
      {order.map((track, index) => {
        const dragging = dragId === track.id;
        const isActive = index === currentIndex;
        const content = (
          <>
            <Pressable style={styles.main} onPress={() => onJump(index)}>
              {isActive ? (
                <View style={styles.playingIcon}>
                  <Ionicons name="volume-medium" size={20} color={colors.primary} />
                </View>
              ) : (
                <ArtTile seed={track.album || track.title} trackId={track.id} size={40} rounded={radius.sm} />
              )}
              <View style={styles.meta}>
                <Text numberOfLines={1} style={[styles.title, isActive && styles.activeTitle]}>
                  {track.title}
                </Text>
                <Text numberOfLines={1} style={styles.artist}>
                  {track.artist} · {formatDuration(track.durationMs)}
                </Text>
              </View>
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
    height: QUEUE_ROW_HEIGHT,
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
  playingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
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
  handle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
