import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode as TPRepeatMode,
  State,
  type AddTrack,
} from 'react-native-track-player';
import { create } from 'zustand';

import { recommendNext } from '../ml/recommender';
import type { RepeatMode, Track } from '../types';
import { useLibraryStore } from './libraryStore';
import { useTasteStore } from './tasteStore';

/**
 * Playback is driven by react-native-track-player (RNTP), which owns a native
 * queue and a Media3 media session — this is what gives us working lock-screen /
 * notification **next & previous** controls (expo-audio deliberately disables
 * those). We mirror RNTP's queue into this store so the UI and the Smart Radio
 * recommender can reason about it, and we drive the engine through RNTP calls.
 */

let setupDone = false;
let listenersAttached = false;
/**
 * True while we programmatically rebuild the native queue (reset/add/skip).
 * During a rebuild RNTP emits `PlaybackActiveTrackChanged` events that refer to
 * the OLD queue, so we suppress feedback/index handling here and instead record
 * the outgoing track explicitly + set the new index optimistically in the action.
 */
let rebuilding = false;
let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
/**
 * Last playback position (seconds) reported by the progress listener. Used as a
 * fallback for implicit feedback when `PlaybackActiveTrackChanged.lastPosition`
 * is missing/zero, so "Most Played" reliably counts auto-advanced plays.
 */
let lastProgressSec = 0;

function beginRebuild(): void {
  rebuilding = true;
  if (rebuildTimer) clearTimeout(rebuildTimer);
}

function endRebuild(): void {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  // Release after the reset/add/skip event burst has settled.
  rebuildTimer = setTimeout(() => {
    rebuilding = false;
  }, 500);
}

/** Records implicit feedback for the currently-playing track before leaving it. */
function recordLeavingCurrent(): void {
  const { queue, currentIndex, positionSec, durationSec } = usePlayerStore.getState();
  const track = queue[currentIndex];
  if (!track) return;
  const dur = durationSec || track.durationMs / 1000;
  const completed = dur > 0 && positionSec >= dur - 2;
  useTasteStore.getState().recordPlay(track, { completed, playedSec: positionSec, durationSec: dur });
}

/** Maps our domain Track to an RNTP track (extra `id` is preserved by RNTP). */
function toRNTPTrack(t: Track): AddTrack {
  return {
    id: t.id,
    url: t.uri,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.durationMs > 0 ? t.durationMs / 1000 : undefined,
  };
}

type PlayerState = {
  /** Whether RNTP has finished setup and is ready to accept commands. */
  ready: boolean;
  queue: Track[];
  /** Pre-shuffle ordering, used to restore order when shuffle is toggled off. */
  baseQueue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  positionSec: number;
  durationSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** When true, the queue auto-extends with ML recommendations (Smart Radio). */
  radioMode: boolean;

  playFrom: (tracks: Track[], index: number) => void;
  startRadio: (seed?: Track) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (sec: number) => void;
  seekBy: (delta: number) => void;
  skipToIndex: (index: number) => void;
  /** Reorders the queue (drag upcoming songs); applies to the native queue too. */
  reorderQueue: (from: number, to: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stop: () => void;
};

function shuffleWithCurrentFirst(tracks: Track[], current: Track): Track[] {
  const rest = tracks.filter((t) => t.id !== current.id);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [current, ...rest];
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ready: false,
  queue: [],
  baseQueue: [],
  currentIndex: -1,
  isPlaying: false,
  isBuffering: false,
  positionSec: 0,
  durationSec: 0,
  shuffle: false,
  repeat: 'off',
  radioMode: false,

  playFrom: (tracks, index) => {
    void doPlayFrom(tracks, index);
  },
  startRadio: (seed) => {
    void doStartRadio(seed);
  },
  play: () => {
    void TrackPlayer.play();
  },
  pause: () => {
    void TrackPlayer.pause();
  },
  togglePlay: () => {
    if (get().isPlaying) void TrackPlayer.pause();
    else void TrackPlayer.play();
  },
  next: () => {
    void TrackPlayer.skipToNext().catch(() => undefined);
  },
  previous: () => {
    void doPrevious();
  },
  seekTo: (sec) => {
    const pos = Math.max(0, sec);
    void TrackPlayer.seekTo(pos);
    set({ positionSec: pos });
  },
  seekBy: (delta) => {
    void TrackPlayer.seekBy(delta);
    set({ positionSec: Math.max(0, get().positionSec + delta) });
  },
  skipToIndex: (index) => {
    if (index < 0 || index >= get().queue.length) return;
    void TrackPlayer.skip(index)
      .then(() => TrackPlayer.play())
      .catch(() => undefined);
  },
  reorderQueue: (from, to) => {
    void doReorderQueue(from, to);
  },
  toggleShuffle: () => {
    void doToggleShuffle();
  },
  cycleRepeat: () => {
    void doCycleRepeat();
  },
  stop: () => {
    void TrackPlayer.reset();
    set({ isPlaying: false, positionSec: 0, queue: [], baseQueue: [], currentIndex: -1, radioMode: false });
  },
}));

/** Selector helper: the currently active track, or null. */
export function selectCurrentTrack(state: PlayerState): Track | null {
  return state.currentIndex >= 0 ? state.queue[state.currentIndex] ?? null : null;
}

// Push the active track into Recently Played the moment it becomes current, so
// the smart playlist updates immediately — not only when the track is left.
let lastStartedId: string | null = null;
usePlayerStore.subscribe((state) => {
  const current = state.queue[state.currentIndex];
  const id = current?.id ?? null;
  if (!id) {
    lastStartedId = null;
    return;
  }
  if (id !== lastStartedId) {
    lastStartedId = id;
    useTasteStore.getState().recordStart(current);
  }
});

async function doReorderQueue(from: number, to: number): Promise<void> {
  const { queue, currentIndex } = usePlayerStore.getState();
  if (from === to) return;
  if (from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;

  const currentId = queue[currentIndex]?.id;
  const next = queue.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  const newIndex = currentId ? next.findIndex((t) => t.id === currentId) : currentIndex;

  // Optimistically update the mirror, then move the track in the native queue.
  usePlayerStore.setState({
    queue: next,
    baseQueue: next,
    currentIndex: newIndex >= 0 ? newIndex : currentIndex,
  });
  try {
    await TrackPlayer.move(from, to);
  } catch {
    // If the native move fails the mirror may drift; the next track change re-syncs.
  }
}

async function doPlayFrom(tracks: Track[], index: number): Promise<void> {
  if (tracks.length === 0 || !usePlayerStore.getState().ready) return;
  const chosen = tracks[Math.max(0, Math.min(index, tracks.length - 1))];
  const shuffle = usePlayerStore.getState().shuffle;
  const queue = shuffle ? shuffleWithCurrentFirst(tracks, chosen) : tracks;
  const startIndex = shuffle ? 0 : queue.indexOf(chosen);
  recordLeavingCurrent();
  beginRebuild();
  try {
    usePlayerStore.setState({ baseQueue: tracks, queue, radioMode: false, currentIndex: startIndex });
    await TrackPlayer.reset();
    await TrackPlayer.add(queue.map(toRNTPTrack));
    if (startIndex > 0) await TrackPlayer.skip(startIndex);
    await TrackPlayer.play();
  } finally {
    endRebuild();
  }
}

async function doStartRadio(seedTrack?: Track): Promise<void> {
  const library = useLibraryStore.getState().tracks;
  if (library.length === 0 || !usePlayerStore.getState().ready) return;
  const state = usePlayerStore.getState();
  const seed =
    seedTrack ?? state.queue[state.currentIndex] ?? library[Math.floor(Math.random() * library.length)];
  const recs = recommendNext(library, useTasteStore.getState().profile, {
    seed,
    exclude: new Set([seed.id]),
    count: 30,
  });
  const queue = [seed, ...recs];
  recordLeavingCurrent();
  beginRebuild();
  try {
    usePlayerStore.setState({ baseQueue: queue, queue, radioMode: true, shuffle: false, currentIndex: 0 });
    await TrackPlayer.reset();
    await TrackPlayer.add(queue.map(toRNTPTrack));
    await TrackPlayer.play();
  } finally {
    endRebuild();
  }
}

async function doPrevious(): Promise<void> {
  if (usePlayerStore.getState().positionSec > 3) {
    await TrackPlayer.seekTo(0);
    return;
  }
  try {
    await TrackPlayer.skipToPrevious();
  } catch {
    await TrackPlayer.seekTo(0);
  }
}

async function doToggleShuffle(): Promise<void> {
  const { shuffle, queue, baseQueue, currentIndex, isPlaying, positionSec } = usePlayerStore.getState();
  const current = queue[currentIndex];

  let newQueue: Track[];
  let newIndex: number;
  if (!shuffle) {
    if (!current) {
      usePlayerStore.setState({ shuffle: true });
      return;
    }
    newQueue = shuffleWithCurrentFirst(baseQueue.length ? baseQueue : queue, current);
    newIndex = 0;
  } else {
    newQueue = baseQueue.length ? baseQueue : queue;
    newIndex = current ? newQueue.findIndex((t) => t.id === current.id) : currentIndex;
    if (newIndex < 0) newIndex = Math.max(0, currentIndex);
  }

  beginRebuild();
  try {
    usePlayerStore.setState({ shuffle: !shuffle, queue: newQueue, currentIndex: newIndex });
    await TrackPlayer.reset();
    await TrackPlayer.add(newQueue.map(toRNTPTrack));
    if (newIndex > 0) await TrackPlayer.skip(newIndex);
    if (positionSec > 0) await TrackPlayer.seekTo(positionSec);
    if (isPlaying) await TrackPlayer.play();
  } finally {
    endRebuild();
  }
}

async function doCycleRepeat(): Promise<void> {
  const order: RepeatMode[] = ['off', 'all', 'one'];
  const nextMode = order[(order.indexOf(usePlayerStore.getState().repeat) + 1) % order.length];
  usePlayerStore.setState({ repeat: nextMode });
  const tpMode =
    nextMode === 'one' ? TPRepeatMode.Track : nextMode === 'all' ? TPRepeatMode.Queue : TPRepeatMode.Off;
  await TrackPlayer.setRepeatMode(tpMode);
}

/** In radio mode, append more recommendations as the queue nears its end. */
async function maybeExtendRadio(): Promise<void> {
  const { radioMode, queue, currentIndex } = usePlayerStore.getState();
  if (!radioMode || queue.length - currentIndex > 3) return;
  const library = useLibraryStore.getState().tracks;
  if (library.length === 0) return;
  const seed = queue[currentIndex] ?? queue[queue.length - 1];
  if (!seed) return;
  const exclude = new Set(queue.map((t) => t.id));
  const more = recommendNext(library, useTasteStore.getState().profile, { seed, exclude, count: 15 });
  if (more.length === 0) return;
  usePlayerStore.setState({
    queue: [...queue, ...more],
    baseQueue: [...usePlayerStore.getState().baseQueue, ...more],
  });
  try {
    await TrackPlayer.add(more.map(toRNTPTrack));
  } catch {
    // ignore transient queue errors
  }
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    usePlayerStore.setState({
      isPlaying: event.state === State.Playing,
      isBuffering: event.state === State.Buffering || event.state === State.Loading,
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
    if (event.position > 0) lastProgressSec = event.position;
    usePlayerStore.setState({
      positionSec: event.position,
      durationSec: event.duration > 0 ? event.duration : usePlayerStore.getState().durationSec,
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    // Spurious events fire while we rebuild the queue; the action handles those
    // explicitly (feedback + optimistic index), so ignore them here.
    if (rebuilding) return;

    // Record implicit feedback for the track we just left, resolved from the
    // event payload (the store queue may already have changed).
    const last = event.lastTrack;
    const lastId = last && typeof last.id === 'string' ? (last.id as string) : undefined;
    if (last && lastId) {
      const byId = useLibraryStore.getState().byId;
      const durationSec =
        typeof last.duration === 'number' && last.duration > 0
          ? last.duration
          : (byId[lastId]?.durationMs ?? 0) / 1000;
      const playedSec =
        typeof event.lastPosition === 'number' && event.lastPosition > 0
          ? event.lastPosition
          : lastProgressSec;
      const completed = durationSec > 0 && playedSec >= durationSec - 2;
      const prev: Track = byId[lastId] ?? {
        id: lastId,
        uri: typeof last.url === 'string' ? last.url : '',
        title: typeof last.title === 'string' ? last.title : '',
        artist: typeof last.artist === 'string' ? last.artist : '',
        album: typeof last.album === 'string' ? last.album : '',
        durationMs: Math.round(durationSec * 1000),
        filename: '',
      };
      useTasteStore.getState().recordPlay(prev, { completed, playedSec, durationSec });
    }

    if (typeof event.index === 'number') {
      const track = usePlayerStore.getState().queue[event.index];
      lastProgressSec = 0;
      usePlayerStore.setState({
        currentIndex: event.index,
        positionSec: 0,
        durationSec:
          track && track.durationMs > 0 ? track.durationMs / 1000 : usePlayerStore.getState().durationSec,
      });
      void maybeExtendRadio();
    }
  });
}

/**
 * Initializes the RNTP engine, configures lock-screen / notification controls
 * (incl. next & previous), and attaches state listeners. Call once on startup
 * while the app is in the foreground.
 */
export async function initPlayer(): Promise<void> {
  if (setupDone) return;
  try {
    await TrackPlayer.setupPlayer();
  } catch {
    // setupPlayer throws if already initialized (e.g. fast refresh); ignore.
  }
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    progressUpdateEventInterval: 1,
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
  });
  setupDone = true;
  attachListeners();
  usePlayerStore.setState({ ready: true });
}
