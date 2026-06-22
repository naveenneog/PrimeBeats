import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../components/States';
import { TopBar } from '../components/TopBar';
import { useEqStore } from '../store/eqStore';
import { colors, radius, spacing } from '../theme';

function formatFreq(hz: number): string {
  if (hz >= 1000) {
    const k = hz / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
  }
  return `${Math.round(hz)}`;
}

function formatDb(millibel: number): string {
  const db = millibel / 100;
  const rounded = Math.round(db * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}`;
}

export function EqualizerScreen() {
  const hydrated = useEqStore((s) => s.hydrated);
  const available = useEqStore((s) => s.available);
  const enabled = useEqStore((s) => s.enabled);
  const info = useEqStore((s) => s.info);
  const bandLevels = useEqStore((s) => s.bandLevels);
  const presetIndex = useEqStore((s) => s.presetIndex);
  const bassBoostEnabled = useEqStore((s) => s.bassBoostEnabled);
  const bassBoostStrength = useEqStore((s) => s.bassBoostStrength);

  const init = useEqStore((s) => s.init);
  const setEnabled = useEqStore((s) => s.setEnabled);
  const previewBandLevel = useEqStore((s) => s.previewBandLevel);
  const setBandLevel = useEqStore((s) => s.setBandLevel);
  const applyPreset = useEqStore((s) => s.applyPreset);
  const setBassBoostEnabled = useEqStore((s) => s.setBassBoostEnabled);
  const previewBassBoostStrength = useEqStore((s) => s.previewBassBoostStrength);
  const setBassBoostStrength = useEqStore((s) => s.setBassBoostStrength);
  const resetFlat = useEqStore((s) => s.resetFlat);

  useEffect(() => {
    if (!hydrated) void init();
  }, [hydrated]);

  if (hydrated && !available) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar title="Equalizer" />
        <EmptyState
          icon="options"
          title="Equalizer unavailable"
          message="This device doesn’t allow apps to control the global audio equalizer."
        />
      </SafeAreaView>
    );
  }

  const min = info?.minLevel ?? -1500;
  const max = info?.maxLevel ?? 1500;
  const dim = !enabled;
  const bassSupported = info?.bassBoostSupported !== false;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar
        title="Equalizer"
        right={
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.border, true: colors.primaryDark }}
            thumbColor={enabled ? colors.primary : colors.textFaint}
          />
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Presets */}
        <Text style={styles.section}>Presets</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {(info?.presets ?? []).map((name, i) => {
            const active = presetIndex === i;
            return (
              <Pressable
                key={`${name}-${i}`}
                disabled={!enabled}
                onPress={() => applyPreset(i)}
                style={[styles.presetChip, active && styles.presetChipOn, dim && styles.dim]}
              >
                <Text style={[styles.presetText, active && styles.presetTextOn]}>{name}</Text>
              </Pressable>
            );
          })}
          {presetIndex === null ? (
            <View style={[styles.presetChip, styles.presetChipOn, dim && styles.dim]}>
              <Text style={[styles.presetText, styles.presetTextOn]}>Custom</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Bands */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.section}>Bands</Text>
          <Pressable
            hitSlop={8}
            disabled={!enabled}
            onPress={resetFlat}
            style={[styles.resetBtn, dim && styles.dim]}
          >
            <Ionicons name="refresh" size={14} color={colors.textMuted} />
            <Text style={styles.resetText}>Flat</Text>
          </Pressable>
        </View>

        <View style={[styles.bands, dim && styles.dim]} pointerEvents={dim ? 'none' : 'auto'}>
          {bandLevels.map((level, i) => {
            const freq = info?.centerFreqs?.[i] ?? 0;
            return (
              <View key={i} style={styles.bandRow}>
                <Text style={styles.freqLabel}>{formatFreq(freq)}Hz</Text>
                <Slider
                  style={styles.bandSlider}
                  minimumValue={min}
                  maximumValue={max}
                  step={100}
                  value={level}
                  disabled={!enabled}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                  onValueChange={(v) => previewBandLevel(i, v)}
                  onSlidingComplete={(v) => setBandLevel(i, v)}
                />
                <Text style={styles.dbLabel}>{formatDb(level)} dB</Text>
              </View>
            );
          })}
        </View>

        {/* Bass boost */}
        <Text style={styles.section}>Bass Boost</Text>
        <View style={styles.boostHeader}>
          <View style={styles.boostMeta}>
            <Ionicons
              name="pulse"
              size={18}
              color={bassBoostEnabled ? colors.primary : colors.textMuted}
            />
            <Text style={styles.boostTitle}>Boost</Text>
          </View>
          <Switch
            value={bassBoostEnabled}
            disabled={!bassSupported}
            onValueChange={setBassBoostEnabled}
            trackColor={{ false: colors.border, true: colors.primaryDark }}
            thumbColor={bassBoostEnabled ? colors.primary : colors.textFaint}
          />
        </View>
        {bassSupported ? (
          <View
            style={[styles.boostSliderWrap, !bassBoostEnabled && styles.dim]}
            pointerEvents={bassBoostEnabled ? 'auto' : 'none'}
          >
            <Slider
              style={styles.bandSlider}
              minimumValue={0}
              maximumValue={1000}
              step={10}
              value={bassBoostStrength}
              disabled={!bassBoostEnabled}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              onValueChange={previewBassBoostStrength}
              onSlidingComplete={setBassBoostStrength}
            />
            <Text style={styles.boostPct}>{Math.round((bassBoostStrength / 1000) * 100)}%</Text>
          </View>
        ) : (
          <Text style={styles.note}>Bass boost isn’t supported on this device.</Text>
        )}

        <Text style={styles.note}>
          The equalizer adjusts your device’s audio output. Effects depend on your phone and
          headphones; some devices apply them only to certain outputs.
        </Text>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.lg,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  resetText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  presetRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  presetChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  presetTextOn: {
    color: colors.black,
  },
  bands: {
    paddingHorizontal: spacing.lg,
  },
  dim: {
    opacity: 0.4,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  freqLabel: {
    width: 52,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  bandSlider: {
    flex: 1,
    height: 40,
  },
  dbLabel: {
    width: 60,
    textAlign: 'right',
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  boostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  boostMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  boostTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  boostSliderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  boostPct: {
    width: 48,
    textAlign: 'right',
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
