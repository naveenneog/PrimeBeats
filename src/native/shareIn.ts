import type { Track } from '../types';

/**
 * Crash-proof wrapper around the local `sharein` native module (P2P sharing via
 * the OS Sharesheet + receiving shared audio). Degrades to no-ops if the native
 * side isn't present.
 */
export type ImportedFile = { uri: string; name: string };

type NativeShareIn = {
  isSupported(): boolean;
  shareTracks(paths: string[]): Promise<boolean>;
  getInitialShare(): string[];
  importToCache(uri: string): Promise<ImportedFile>;
  addListener(
    event: 'onShareReceived',
    listener: (payload: { uris: string[] }) => void,
  ): { remove(): void };
};

let native: NativeShareIn | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  native = (require('../../modules/sharein') as { default: NativeShareIn }).default;
} catch {
  native = null;
}

export const ShareIn = {
  isSupported(): boolean {
    try {
      return native?.isSupported() ?? false;
    } catch {
      return false;
    }
  },

  /** Share the given tracks' files via the OS Sharesheet. */
  async shareTracks(tracks: Track[]): Promise<boolean> {
    try {
      if (!native || tracks.length === 0) return false;
      return await native.shareTracks(tracks.map((t) => t.uri));
    } catch {
      return false;
    }
  },

  getInitialShare(): string[] {
    try {
      return native?.getInitialShare() ?? [];
    } catch {
      return [];
    }
  },

  async importToCache(uri: string): Promise<ImportedFile | null> {
    try {
      return (await native?.importToCache(uri)) ?? null;
    } catch {
      return null;
    }
  },

  /** Subscribe to shares received while the app is running. Returns an unsubscribe. */
  onShareReceived(listener: (uris: string[]) => void): () => void {
    try {
      const sub = native?.addListener('onShareReceived', (p) => listener(p?.uris ?? []));
      return () => sub?.remove();
    } catch {
      return () => undefined;
    }
  },
};
