import { Platform } from 'react-native';

import { useArtworkStore } from '../store/artworkStore';
import type { Track } from '../types';

/**
 * Extracts embedded album art (ID3 / metadata) from local audio files using a
 * native metadata retriever. This is **best-effort**: the library is loaded via
 * a guarded dynamic import, so if it isn't available the app simply falls back
 * to web-downloaded / custom / generated artwork without crashing.
 */
const isSupported = Platform.OS === 'android' || Platform.OS === 'ios';

let retriever: { getArtwork?: (uri: string) => Promise<string | null> } | null | undefined;
let prefetchStarted = false;

async function getRetriever() {
  if (retriever !== undefined) return retriever;
  try {
    const mod = (await import('@missingcore/react-native-metadata-retriever')) as unknown as {
      getArtwork?: (uri: string) => Promise<string | null>;
    };
    retriever = mod;
  } catch {
    retriever = null;
  }
  return retriever;
}

/** Extracts and caches embedded art for one track, unless art already exists. */
export async function ensureEmbeddedArt(track: Track): Promise<void> {
  if (!isSupported || !track?.uri) return;
  if (useArtworkStore.getState().art[track.id]) return;
  try {
    const mod = await getRetriever();
    if (!mod?.getArtwork) return;
    const base64 = await mod.getArtwork(track.uri);
    if (base64) await useArtworkStore.getState().setFromBase64(track.id, base64);
  } catch {
    // ignore — unsupported file / no embedded art
  }
}

/** Background pass over the library to populate embedded art (runs once per session). */
export async function prefetchEmbeddedArt(tracks: Track[]): Promise<void> {
  if (!isSupported || prefetchStarted) return;
  prefetchStarted = true;
  const mod = await getRetriever();
  if (!mod?.getArtwork) return;
  let cursor = 0;
  const worker = async () => {
    while (cursor < tracks.length) {
      const track = tracks[cursor++];
      await ensureEmbeddedArt(track);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}
