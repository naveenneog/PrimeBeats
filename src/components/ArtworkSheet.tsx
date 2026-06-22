import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { searchArtwork, type ArtResult } from '../media/webArt';
import { selectArt, useArtworkStore } from '../store/artworkStore';
import { useArtworkSheetStore } from '../store/artworkSheetStore';
import { colors, radius, spacing } from '../theme';

/**
 * App-root sheet for changing a track's album art: download from the web
 * (iTunes), upload a custom image from the device, or reset to default.
 * Opened via `useArtworkSheetStore.open(track)`.
 */
export function ArtworkSheet() {
  const track = useArtworkSheetStore((s) => s.target);
  const close = useArtworkSheetStore((s) => s.close);
  const setFromUrl = useArtworkStore((s) => s.setFromUrl);
  const setFromLocalUri = useArtworkStore((s) => s.setFromLocalUri);
  const removeArt = useArtworkStore((s) => s.remove);
  const currentArt = useArtworkStore((s) => selectArt(s, track?.id));

  const [mode, setMode] = useState<'menu' | 'web'>('menu');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ArtResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (track) {
      setMode('menu');
      setResults([]);
    }
  }, [track]);

  if (!track) return null;

  const findOnWeb = async () => {
    setMode('web');
    setLoading(true);
    const res = await searchArtwork(track.artist, track.title);
    setResults(res);
    setLoading(false);
    if (res.length === 0) {
      Alert.alert('No artwork found', 'Try renaming the file or upload a custom image instead.');
      setMode('menu');
    }
  };

  const applyUrl = async (url: string) => {
    setBusy(true);
    const ok = await setFromUrl(track.id, url);
    setBusy(false);
    if (ok) close();
    else Alert.alert('Couldn’t download', 'Please check your connection and try again.');
  };

  const uploadCustom = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to choose a custom cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setBusy(true);
    const ok = await setFromLocalUri(track.id, result.assets[0].uri);
    setBusy(false);
    if (ok) close();
    else Alert.alert('Couldn’t set image', 'Please try a different image.');
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Image
              source={currentArt ? { uri: currentArt } : undefined}
              style={styles.preview}
              contentFit="cover"
            />
            <View style={styles.headerMeta}>
              <Text numberOfLines={1} style={styles.title}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={styles.artist}>
                {track.artist}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={close}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {busy ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Saving artwork…</Text>
            </View>
          ) : mode === 'menu' ? (
            <View>
              <Action icon="globe-outline" label="Find artwork on the web" onPress={findOnWeb} />
              <Action icon="image-outline" label="Upload from device" onPress={uploadCustom} />
              {currentArt ? (
                <Action
                  icon="refresh-outline"
                  label="Reset to default"
                  destructive
                  onPress={() => {
                    void removeArt(track.id);
                    close();
                  }}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.webBlock}>
              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.muted}>Searching…</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.grid}>
                  {results.map((r) => (
                    <Pressable key={r.url} style={styles.cell} onPress={() => applyUrl(r.url)}>
                      <Image source={{ uri: r.url }} style={styles.cellImg} contentFit="cover" transition={150} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <Text style={styles.disclaimer}>
                Artwork from the iTunes catalog. Tap a cover to use it for this song.
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
    maxHeight: '80%',
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
  },
  preview: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  headerMeta: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  artist: {
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  webBlock: {
    paddingTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cell: {
    width: '31%',
    aspectRatio: 1,
  },
  cellImg: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
