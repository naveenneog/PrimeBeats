import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type ReactElement, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import { usePlayerStore } from '../store/playerStore';
import { useArtworkSheetStore } from '../store/artworkSheetStore';
import { useSettingsStore } from '../store/settingsStore';
import { colors, radius, spacing } from '../theme';
import type { Track } from '../types';
import { ArtTile } from './ArtTile';

function Action({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={styles.action} android_ripple={{ color: colors.surfaceAlt }} onPress={onPress}>
      <Ionicons name={icon} size={22} color={destructive ? colors.danger : colors.text} />
      <Text style={[styles.actionLabel, destructive && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

/** Bottom action sheet for a track (start radio / add to playlist / hide). */
export function TrackActionsSheet({ track, onClose }: { track: Track | null; onClose: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const startRadio = usePlayerStore((s) => s.startRadio);
  const hide = useSettingsStore((s) => s.hide);
  const openArtwork = useArtworkSheetStore((s) => s.open);

  if (!track) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <ArtTile seed={track.album || track.title} trackId={track.id} uri={track.artworkUri} size={48} rounded={radius.sm} />
            <View style={styles.headerMeta}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={styles.headerArtist}>
                {track.artist}
              </Text>
            </View>
          </View>

          <Action
            icon="radio"
            label="Start Smart Radio"
            onPress={() => {
              startRadio(track);
              onClose();
            }}
          />
          <Action
            icon="add-circle-outline"
            label="Add to playlist"
            onPress={() => {
              onClose();
              navigation.navigate('AddToPlaylist', { trackIds: [track.id] });
            }}
          />
          <Action
            icon="image-outline"
            label="Change artwork"
            onPress={() => {
              onClose();
              openArtwork(track);
            }}
          />
          <Action
            icon="eye-off"
            label="Hide from library"
            destructive
            onPress={() => {
              hide(track.id);
              onClose();
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Convenience hook: returns `open(track)` to show the sheet and the `sheet`
 * element to render inside a screen.
 */
export function useTrackActions(): { open: (track: Track) => void; sheet: ReactElement } {
  const [track, setTrack] = useState<Track | null>(null);
  const sheet = <TrackActionsSheet track={track} onClose={() => setTrack(null)} />;
  return { open: setTrack, sheet };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  headerMeta: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  headerArtist: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
