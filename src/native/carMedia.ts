import type { CarPlaybackState } from '../../modules/carmedia/src/CarMediaModule';

/**
 * Crash-proof wrapper around the local `carmedia` native module. Feeds the
 * Android Auto media-browser service a snapshot of songs / playlists / smart
 * playlists, relays car playback state back to the app, and forwards transport
 * commands. Loaded defensively so the app degrades to a no-op without it.
 */
export type CarTrackLite = { id: string; title: string; artist: string; album: string; uri: string };
export type CarGroupLite = { id: string; name: string; trackIds: string[] };
export type CarSnapshot = {
  songs: CarTrackLite[];
  playlists: CarGroupLite[];
  smart: CarGroupLite[];
};
export type { CarPlaybackState };

type NativeCarMedia = {
  isSupported(): boolean;
  setLibrary(json: string): boolean;
  getNowPlaying(): CarPlaybackState | null;
  sendCommand(command: string): void;
  addListener(event: 'onCarPlayback', listener: (s: CarPlaybackState) => void): { remove(): void };
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

  getNowPlaying(): CarPlaybackState | null {
    try {
      return native?.getNowPlaying() ?? null;
    } catch {
      return null;
    }
  },

  /** play | pause | playpause | next | previous | stop */
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
};
