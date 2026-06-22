import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '../components/TopBar';
import type { RootStackParamList } from '../navigation/types';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTasteStore } from '../store/tasteStore';
import { colors, radius, spacing } from '../theme';

const APP_VERSION = '1.5.0';

function Row({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={styles.row} android_ripple={{ color: colors.surfaceAlt }} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: (iconColor ?? colors.accent) + '22' }]}>
        <Ionicons name={icon} size={20} color={destructive ? colors.danger : iconColor ?? colors.accent} />
      </View>
      <View style={styles.rowMeta}>
        <Text style={[styles.rowTitle, destructive && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const status = useLibraryStore((s) => s.status);
  const load = useLibraryStore((s) => s.load);
  const trackCount = useLibraryStore((s) => s.tracks.length);
  const allCount = useLibraryStore((s) => s.allTracks.length);
  const hiddenCount = useSettingsStore((s) => Object.keys(s.hidden).length);
  const resetTaste = useTasteStore((s) => s.reset);

  const isLoading = status === 'loading';

  const refresh = async () => {
    await load();
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset recommendations',
      'This clears your learned taste, likes, play history and the onboarding. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetTaste() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title="Settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={styles.section}>Library</Text>
        <Row
          icon="refresh"
          iconColor={colors.primary}
          title="Refresh library"
          subtitle={
            isLoading
              ? 'Scanning your device…'
              : `${trackCount} song${trackCount === 1 ? '' : 's'} · tap to rescan for new downloads`
          }
          onPress={isLoading ? undefined : refresh}
          right={isLoading ? <ActivityIndicator color={colors.primary} /> : undefined}
        />
        <Row
          icon="eye-off"
          iconColor="#FF8787"
          title="Hidden tracks"
          subtitle={
            hiddenCount > 0
              ? `${hiddenCount} hidden of ${allCount}`
              : 'Hide recordings & long files from the library'
          }
          onPress={() => navigation.navigate('ManageHidden')}
        />

        <Text style={styles.section}>Audio</Text>
        <Row
          icon="options"
          iconColor={colors.primary}
          title="Equalizer"
          subtitle="Tune bands, pick a preset, or boost the bass"
          onPress={() => navigation.navigate('Equalizer')}
        />

        <Text style={styles.section}>Recommendations</Text>
        <Row
          icon="sparkles"
          iconColor={colors.accent}
          title="Reset taste & onboarding"
          subtitle="Clear learned taste and pick your artists again"
          onPress={confirmReset}
          destructive
        />

        <Text style={styles.section}>About</Text>
        <Row icon="musical-notes" iconColor={colors.primary} title="PrimeBeats" subtitle={`Version ${APP_VERSION}`} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
