import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioStatus,
} from 'expo-audio';
import { create } from 'zustand';

import type { RepeatMode, Track } from '../types';

/**
 * A single, app-wide AudioPlayer that lives for the entire process lifetime.
 * Background playback on Android requires `setActiveForLockScreen`, which is
 * only available on a player (not on AudioPlaylist), so we manage the queue
 * ourselves and drive a single player.
 */
const player = createAudioPlayer(null, { updateInterval: 500 });

/** Guards against `didJustFinish` firing multiple times for one track end. */
let advancing = false;
/** Ensures the native status listener is only attached once. */
let listenerAttached = false;

type PlayerState = {
  queue: Track[];
  /** The pre-shuffle ordering, used to restore order when shuffle is toggled off. */
  baseQueue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  positionSec: number;
  durationSec: number;
  shuffle: boolean;
  repeat: RepeatMode;

  playFrom: (tracks: Track[], index: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: (auto?: boolean) => void;
  previous: () => void;
  seekTo: (sec: number) => void;
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

export const usePlayerStore = create<PlayerState>((set, get) => {
  function loadTrackAt(index: number, autoplay: boolean) {
    const { queue } = get();
    const track = queue[index];
    if (!track) return;

    player.replace({ uri: track.uri });
    player.setActiveForLockScreen(true, {
      title: track.title,
      artist: track.artist,
      albumTitle: track.album,
    });

    set({
      currentIndex: index,
      positionSec: 0,
      durationSec: track.durationMs > 0 ? track.durationMs / 1000 : 0,
    });

    if (autoplay) player.play();
  }

  return {
    queue: [],
    baseQueue: [],
    currentIndex: -1,
    isPlaying: false,
    isBuffering: false,
    positionSec: 0,
    durationSec: 0,
    shuffle: false,
    repeat: 'off',

    playFrom: (tracks, index) => {
      if (tracks.length === 0) return;
      const chosen = tracks[Math.max(0, Math.min(index, tracks.length - 1))];
      if (get().shuffle) {
        const shuffled = shuffleWithCurrentFirst(tracks, chosen);
        set({ baseQueue: tracks, queue: shuffled });
        loadTrackAt(0, true);
      } else {
        set({ baseQueue: tracks, queue: tracks });
        loadTrackAt(tracks.indexOf(chosen), true);
      }
    },

    play: () => {
      if (get().currentIndex < 0) return;
      player.play();
    },

    pause: () => player.pause(),

    togglePlay: () => {
      if (get().currentIndex < 0) return;
      if (get().isPlaying) player.pause();
      else player.play();
    },

    next: (auto = false) => {
      if (advancing && !auto) return;
      const { queue, currentIndex, repeat } = get();
      if (queue.length === 0) return;

      if (repeat === 'one' && auto) {
        void player.seekTo(0);
        player.play();
        return;
      }

      let nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else if (auto) {
          // Reached the end naturally with no repeat: stop.
          player.pause();
          void player.seekTo(0);
          set({ isPlaying: false });
          return;
        } else {
          // Manual next at the end with no repeat: stay put.
          return;
        }
      }
      loadTrackAt(nextIndex, true);
    },

    previous: () => {
      const { queue, currentIndex, positionSec, repeat } = get();
      if (queue.length === 0) return;
      if (positionSec > 3) {
        void player.seekTo(0);
        return;
      }
      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        if (repeat === 'all') prevIndex = queue.length - 1;
        else {
          void player.seekTo(0);
          return;
        }
      }
      loadTrackAt(prevIndex, true);
    },

    seekTo: (sec) => {
      void player.seekTo(Math.max(0, sec));
      set({ positionSec: Math.max(0, sec) });
    },

    toggleShuffle: () => {
      const { shuffle, queue, baseQueue, currentIndex } = get();
      const current = queue[currentIndex];
      if (!shuffle) {
        // Turning shuffle ON.
        if (current) {
          const shuffled = shuffleWithCurrentFirst(baseQueue.length ? baseQueue : queue, current);
          set({ shuffle: true, queue: shuffled, currentIndex: 0 });
        } else {
          set({ shuffle: true });
        }
      } else {
        // Turning shuffle OFF: restore base order.
        const restored = baseQueue.length ? baseQueue : queue;
        const idx = current ? restored.findIndex((t) => t.id === current.id) : -1;
        set({ shuffle: false, queue: restored, currentIndex: idx >= 0 ? idx : get().currentIndex });
      }
    },

    cycleRepeat: () => {
      const order: RepeatMode[] = ['off', 'all', 'one'];
      const nextMode = order[(order.indexOf(get().repeat) + 1) % order.length];
      set({ repeat: nextMode });
    },

    stop: () => {
      player.pause();
      void player.seekTo(0);
      set({ isPlaying: false, positionSec: 0 });
    },
  };
});

/** Selector helper: the currently active track, or null. */
export function selectCurrentTrack(state: PlayerState): Track | null {
  return state.currentIndex >= 0 ? state.queue[state.currentIndex] ?? null : null;
}

// Attach the native status listener exactly once.
if (!listenerAttached) {
  listenerAttached = true;
  player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
    const prev = usePlayerStore.getState();
    usePlayerStore.setState({
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      positionSec: status.currentTime ?? 0,
      durationSec:
        status.duration && status.duration > 0 ? status.duration : prev.durationSec,
    });

    if (status.didJustFinish && !advancing) {
      advancing = true;
      try {
        usePlayerStore.getState().next(true);
      } finally {
        // Release on the next tick so a single end-of-track only advances once.
        setTimeout(() => {
          advancing = false;
        }, 250);
      }
    }
  });
}

/**
 * Configures the global audio session for background playback.
 * Call once during app startup.
 *
 * Note: SDK 54's `expo-audio` does not expose a notification-permission request
 * API; the `POST_NOTIFICATIONS` permission declared in app.json is requested by
 * the OS when the media notification is first shown in a standalone build.
 */
export async function initAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
}
