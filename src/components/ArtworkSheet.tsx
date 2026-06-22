import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchArtworkByQuery, type ArtResult } from '../media/webArt';
import { selectArt, useArtworkStore } from '../store/artworkStore';
import { useArtworkSheetStore } from '../store/artworkSheetStore';
import { useMetadataStore } from '../store/metadataStore';
import { colors, radius, spacing } from '../theme';

/**
 * App-root sheet for editing a track: rename the title/artist (saved as a
 * persistent override), then find album art on the web (iTunes) using the full
 * info — with an editable query so the user can add details when nothing is
 * found — upload a custom image, or reset to default.
 * Opened via `useArtworkSheetStore.open(track, mode?)`.
 */
export function ArtworkSheet() {
  const track = useArtworkSheetStore((s) => s.target);
  const initialMode = useArtworkSheetStore((s) => s.initialMode);
  const close = useArtworkSheetStore((s) => s.close);
  const setFromUrl = useArtworkStore((s) => s.setFromUrl);
  const setFromLocalUri = useArtworkStore((s) => s.setFromLocalUri);
  const removeArt = useArtworkStore((s) => s.remove);
  const currentArt = useArtworkStore((s) => selectArt(s, track?.id));
  const saveMetadata = useMetadataStore((s) => s.set);

  const [mode, setMode] = useState<'menu' | 'web' | 'edit'>('menu');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<ArtResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  useEffect(() => {
    if (track) {
      setMode(initialMode);
      setResults([]);
      setSearched(false);
      setTitle(track.title);
      setArtist(track.artist);
      setQuery(defaultQuery(track.artist, track.title));
    }
  }, [track, initialMode]);

  if (!track) return null;

  const runSearch = async (q: string) => {
    setMode('web');
    setLoading(true);
    setSearched(true);
    const res = await searchArtworkByQuery(q);
    setResults(res);
    setLoading(false);
  };

  const saveDetails = (): { title: string; artist: string } => {
    const t = title.trim() || track.title;
    const a = artist.trim() || track.artist;
    saveMetadata(track.id, { title: t, artist: a });
    return { title: t, artist: a };
  };

  const saveAndFind = () => {
    const saved = saveDetails();
    setQuery(defaultQuery(saved.artist, saved.title));
    void runSearch(defaultQuery(saved.artist, saved.title));
  };

  const saveOnly = () => {
    saveDetails();
    close();
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
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
                  {mode === 'edit' ? title || track.title : track.title}
                </Text>
                <Text numberOfLines={1} style={styles.artist}>
                  {mode === 'edit' ? artist || track.artist : track.artist}
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
            ) : mode === 'edit' ? (
              <View style={styles.editBlock}>
                <Text style={styles.fieldLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Song title"
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="next"
                />
                <Text style={styles.fieldLabel}>Artist</Text>
                <TextInput
                  style={styles.input}
                  value={artist}
                  onChangeText={setArtist}
                  placeholder="Artist"
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="done"
                />
                <Pressable style={styles.primaryBtn} onPress={saveAndFind}>
                  <Ionicons name="search" size={18} color={colors.black} />
                  <Text style={styles.primaryBtnText}>Save & find artwork</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={saveOnly}>
                  <Text style={styles.secondaryBtnText}>Save details only</Text>
                </Pressable>
              </View>
            ) : mode === 'menu' ? (
              <View>
                <Action
                  icon="create-outline"
                  label="Edit name & artist"
                  onPress={() => setMode('edit')}
                />
                <Action
                  icon="globe-outline"
                  label="Find artwork on the web"
                  onPress={() => runSearch(defaultQuery(track.artist, track.title))}
                />
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
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Artist, album, song, year…"
                    placeholderTextColor={colors.textFaint}
                    returnKeyType="search"
                    onSubmitEditing={() => runSearch(query)}
                  />
                  <Pressable style={styles.searchBtn} onPress={() => runSearch(query)}>
                    <Ionicons name="search" size={18} color={colors.black} />
                  </Pressable>
                </View>

                {loading ? (
                  <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.muted}>Searching…</Text>
                  </View>
                ) : results.length > 0 ? (
                  <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
                    {results.map((r) => (
                      <Pressable key={r.url} style={styles.cell} onPress={() => applyUrl(r.url)}>
                        <Image
                          source={{ uri: r.url }}
                          style={styles.cellImg}
                          contentFit="cover"
                          transition={150}
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : searched ? (
                  <Text style={styles.hint}>
                    No artwork found. Add an album name or release year above and search again — or
                    upload your own image below.
                  </Text>
                ) : null}

                <Action icon="image-outline" label="Upload from device" onPress={uploadCustom} />
                <Text style={styles.disclaimer}>
                  Artwork from the iTunes catalog. Tap a cover to use it for this song.
                </Text>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/** Builds a sensible default search query from a track's artist + title. */
function defaultQuery(artist: string, title: string): string {
  const cleanedArtist = (artist || '').replace(/unknown artist/gi, '').trim();
  return `${cleanedArtist} ${title}`.trim() || title;
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
  kav: {
    width: '100%',
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
  editBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  primaryBtnText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
