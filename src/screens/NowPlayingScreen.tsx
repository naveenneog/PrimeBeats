import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NowPlayingArt } from '../components/NowPlayingArt';
import { TopBar } from '../components/TopBar';
import { ensureEmbeddedArt } from '../media/embeddedArt';
import type { RootStackParamList } from '../navigation/types';
import { selectCurrentTrack, usePlayerStore } from '../store/playerStore';
import { useArtworkSheetStore } from '../store/artworkSheetStore';
import { useTasteStore } from '../store/tasteStore';
import { colors, radius, spacing } from '../theme';
import { formatSeconds } from '../utils/format';

export function NowPlayingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const track = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const startRadio = usePlayerStore((s) => s.startRadio);
  const radioMode = usePlayerStore((s) => s.radioMode);
  const likedMap = useTasteStore((s) => s.profile.liked);
  const like = useTasteStore((s) => s.like);
  const unlike = useTasteStore((s) => s.unlike);
  const openArtwork = useArtworkSheetStore((s) => s.open);

  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  useEffect(() => {
    if (track) void ensureEmbeddedArt(track);
  }, [track?.id]);

  if (!track) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar variant="close" title="Now Playing" />
        <View style={styles.center}>
          <Text style={styles.muted}>Nothing is playing.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const artSize = Math.min(width - spacing.xl * 2, 340);
  const max = durationSec > 0 ? durationSec : Math.max(1, track.durationMs / 1000);
  const displayPos = seeking ? seekValue : Math.min(positionSec, max);

  const liked = !!likedMap[track.id];
  const toggleLike = () => (liked ? unlike(track) : like(track));
  const repeatActive = repeat !== 'off';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        variant="close"
        title="Now Playing"
        right={
          <View style={styles.topActions}>
            <Pressable hitSlop={8} onPress={toggleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? colors.primary : colors.text}
              />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => navigation.navigate('AddToPlaylist', { trackIds: [track.id] })}
            >
              <Ionicons name="add" size={26} color={colors.text} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('Equalizer')}>
              <Ionicons name="options" size={24} color={colors.text} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('Queue')}>
              <Ionicons name="list" size={24} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.body}>
        <View style={styles.artWrap}>
          <NowPlayingArt
            track={track}
            size={artSize}
            onNext={() => next()}
            onPrevious={previous}
            onSeekBy={seekBy}
            onEditArtwork={() => openArtwork(track)}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>

        <Pressable
          style={[styles.radioBtn, radioMode && styles.radioBtnOn]}
          onPress={() => startRadio(track)}
        >
          <Ionicons name="radio" size={18} color={radioMode ? colors.black : colors.primary} />
          <Text style={[styles.radioText, radioMode && styles.radioTextOn]}>
            {radioMode ? 'Smart Radio on' : 'Start Smart Radio'}
          </Text>
        </Pressable>

        <View style={styles.sliderBlock}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={max}
            value={displayPos}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            onSlidingStart={() => setSeeking(true)}
            onValueChange={setSeekValue}
            onSlidingComplete={(value) => {
              seekTo(value);
              setSeeking(false);
            }}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatSeconds(displayPos)}</Text>
            <Text style={styles.time}>{formatSeconds(max)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable hitSlop={8} onPress={toggleShuffle}>
            <Ionicons name="shuffle" size={24} color={shuffle ? colors.primary : colors.textMuted} />
          </Pressable>

          <Pressable hitSlop={8} onPress={previous}>
            <Ionicons name="play-skip-back" size={34} color={colors.text} />
          </Pressable>

          <Pressable style={styles.playBtn} onPress={togglePlay}>
            <Ionicons
              name={isBuffering ? 'ellipsis-horizontal' : isPlaying ? 'pause' : 'play'}
              size={34}
              color={colors.black}
              style={!isPlaying && !isBuffering ? styles.playOffset : undefined}
            />
          </Pressable>

          <Pressable hitSlop={8} onPress={() => next()}>
            <Ionicons name="play-skip-forward" size={34} color={colors.text} />
          </Pressable>

          <Pressable hitSlop={8} onPress={cycleRepeat} style={styles.repeatWrap}>
            <Ionicons name="repeat" size={24} color={repeatActive ? colors.primary : colors.textMuted} />
            {repeat === 'one' ? <Text style={styles.repeatOne}>1</Text> : null}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 15,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  artWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  info: {
    marginBottom: spacing.md,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  radioBtnOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  radioTextOn: {
    color: colors.black,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  artist: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sliderBlock: {
    marginBottom: spacing.lg,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOffset: {
    marginLeft: 4,
  },
  repeatWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOne: {
    position: 'absolute',
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    top: -6,
    right: -6,
  },
});
