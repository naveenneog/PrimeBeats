import type { Track } from '../types';

/**
 * Crash-proof wrapper around the local `carmedia` native module, which feeds the
 * Android Auto media-browser service a snapshot of the playable library. Loaded
 * defensively so the app degrades to a no-op if the native side is absent.
 */
type NativeCarMedia = {
  isSupported(): boolean;
  setLibrary(json: string): boolean;
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

  /** Push the current library to the Android Auto service (best-effort). */
  setLibrary(tracks: Track[]): void {
    try {
      if (!native) return;
      const payload = tracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        uri: t.uri,
      }));
      native.setLibrary(JSON.stringify(payload));
    } catch {
      // ignore — Auto browsing simply won't have the latest snapshot
    }
  },
};
