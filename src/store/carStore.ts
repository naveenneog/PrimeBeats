import { create } from 'zustand';

import { CarMedia, type CarPlaybackState } from '../native/carMedia';
import { carSource } from './carSource';
import { usePlayerStore } from './playerStore';

export type CarNowPlaying = {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
};

type CarState = {
  /** True while the car (Android Auto) is the active playback source. */
  active: boolean;
  playing: boolean;
  track: CarNowPlaying | null;

  init: () => void;
  playPause: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
};

let started = false;

export const useCarStore = create<CarState>((set, get) => ({
  active: false,
  playing: false,
  track: null,

  init: () => {
    if (started) return;
    started = true;

    const apply = (s: CarPlaybackState | null) => {
      if (!s || !s.active) {
        carSource.active = false;
        set({ active: false, playing: false });
        return;
      }
      carSource.active = true;
      set({
        active: true,
        playing: !!s.playing,
        track: { id: s.id, title: s.title, artist: s.artist, album: s.album, durationMs: s.durationMs },
      });
      // The car has audio focus — make sure the in-app engine isn't also playing.
      if (s.playing) usePlayerStore.getState().pause();
    };

    apply(CarMedia.getNowPlaying());
    CarMedia.onCarPlayback(apply);

    // When the user starts playback on the phone, hand off (hide the car banner).
    usePlayerStore.subscribe((state) => {
      if (state.isPlaying && get().active) {
        carSource.active = false;
        set({ active: false });
      }
    });
  },

  playPause: () => CarMedia.sendCommand('playpause'),
  next: () => CarMedia.sendCommand('next'),
  previous: () => CarMedia.sendCommand('previous'),
  stop: () => {
    CarMedia.sendCommand('stop');
    carSource.active = false;
    set({ active: false, playing: false, track: null });
  },
}));
