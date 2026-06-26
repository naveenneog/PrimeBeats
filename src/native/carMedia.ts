import type { CarPlaybackState, CarNowPlayingInput } from '../../modules/carmedia/src/CarMediaModule';

/**
 * Crash-proof wrapper around the local `carmedia` native module. Feeds the
 * Android Auto media-browser service a snapshot of songs / playlists / smart
 * playlists, mirrors phone playback into the car session, relays car playback
 * state + Auto commands back to the app, and forwards transport commands.
 */
export type CarTrackLite = { id: string; title: string; artist: string; album: string; uri: string };
export type CarGroupLite = { id: string; name: string; trackIds: string[] };
export type CarSnapshot = {
  songs: CarTrackLite[];
  playlists: CarGroupLite[];
  smart: CarGroupLite[];
};
export type { CarPlaybackState, CarNowPlayingInput };

type NativeCarMedia = {
  isSupported(): boolean;
  setLibrary(json: string): boolean;
  setNowPlaying(state: CarNowPlayingInput): void;
  getNowPlaying(): CarPlaybackState | null;
  sendCommand(command: string): void;
  addListener(event: 'onCarPlayback', listener: (s: CarPlaybackState) => void): { remove(): void };
  addListener(event: 'onCarCommand', listener: (p: { command: string }) => void): { remove(): void };
};

let native: NativeCarMedia | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  native = (require('../../modules/carmedia') as { default: NativeCarMedia }).default;
} catch {
  native = null;
}

export const CarMedia = {
  isSupported(): boolean {
    try {
      return native?.isSupported() ?? false;
    } catch {
      return false;
    }
  },

  /** Push the browseable library (songs + playlists + smart playlists) to the car. */
  setLibrary(snapshot: CarSnapshot): void {
    try {
      native?.setLibrary(JSON.stringify(snapshot));
    } catch {
      // ignore — Auto browsing simply won't have the latest snapshot
    }
  },

  /** Mirror the phone's current track into the car session (proxy sync). */
  setNowPlaying(state: CarNowPlayingInput): void {
    try {
      native?.setNowPlaying(state);
    } catch {
      // ignore
    }
  },

  getNowPlaying(): CarPlaybackState | null {
    try {
      return native?.getNowPlaying() ?? null;
    } catch {
      return null;
    }
  },

  /** play | pause | playpause | next | previous | stop (controls local car playback) */
  sendCommand(command: string): void {
    try {
      native?.sendCommand(command);
    } catch {
      // ignore
    }
  },

  onCarPlayback(listener: (state: CarPlaybackState) => void): () => void {
    try {
      const sub = native?.addListener('onCarPlayback', listener);
      return () => sub?.remove();
    } catch {
      return () => undefined;
    }
  },

  /** Commands from Android Auto (while proxying the phone): play/pause/next/previous/seek:<ms>/like/loop/radio/stop. */
  onCarCommand(listener: (command: string) => void): () => void {
    try {
      const sub = native?.addListener('onCarCommand', (p) => listener(p?.command ?? ''));
      return () => sub?.remove();
    } catch {
      return () => undefined;
    }
  },
};
