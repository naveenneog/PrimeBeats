import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtTile } from '../components/ArtTile';
import { useLibraryStore } from '../store/libraryStore';
import { useTasteStore } from '../store/tasteStore';
import { colors, radius, spacing } from '../theme';

/**
 * First-run "tune your taste" screen. The user picks a few favourite artists
 * from their own library; those seed the recommendation profile (cold start).
 * Rendered as a gate by App until onboarding is completed.
 */
export function OnboardingScreen() {
  const tracks = useLibraryStore((s) => s.tracks);
  const seedFromArtists = useTasteStore((s) => s.seedFromArtists);
  const completeOnboarding = useTasteStore((s) => s.completeOnboarding);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const artists = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tracks) {
      const key = t.artist || 'Unknown Artist';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 60);
  }, [tracks]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const finish = () => {
    if (selected.size > 0) seedFromArtists([...selected]);
    completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <FlatList
        data={artists}
        keyExtractor={(item) => item.name}
        numColumns={2}
        columnWrapperStyle={styles.col}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.brand}>Welcome to PrimeBeats</Text>
            <Text style={styles.title}>Pick a few artists you love</Text>
            <Text style={styles.subtitle}>
              We'll tune Smart Radio &amp; “Made for You” to your taste. You can skip and it
              will learn as you listen.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOn = selected.has(item.name);
          return (
            <Pressable style={[styles.card, isOn && styles.cardOn]} onPress={() => toggle(item.name)}>
              <View>
                <ArtTile seed={item.name} size={56} rounded={radius.md} />
                {isOn ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  </View>
                ) : null}
              </View>
              <View style={styles.cardMeta}>
                <Text numberOfLines={1} style={styles.cardName}>
                  {item.name}
                </Text>
                <Text style={styles.cardCount}>
                  {item.count} song{item.count === 1 ? '' : 's'}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Pressable style={styles.skip} onPress={finish}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable style={styles.continue} onPress={finish}>
          <Text style={styles.continueText}>
            {selected.size > 0 ? `Continue (${selected.size})` : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  brand: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  col: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardOn: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  check: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
  },
  cardMeta: {
    flex: 1,
  },
  cardName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  cardCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  skip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  continue: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  continueText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
});
