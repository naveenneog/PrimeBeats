import * as FileSystem from 'expo-file-system/legacy';

import { ShareIn } from '../native/shareIn';
import type { Track } from '../types';
import { makeId, parseTitleArtist } from '../utils/format';

// documentDirectory persists across app updates (only a full uninstall clears it).
const IMPORT_DIR = `${FileSystem.documentDirectory}imported/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMPORT_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(IMPORT_DIR, { intermediates: true });
}

/**
 * Turns received share URIs into persistent library tracks: copies each into the
 * app's document directory and derives title/artist from the filename. Returns
 * the new tracks (caller adds them to the imported store).
 */
export async function processSharedUris(uris: string[]): Promise<Track[]> {
  if (!uris || uris.length === 0) return [];
  await ensureDir();

  const out: Track[] = [];
  for (const uri of uris) {
    try {
      const imported = await ShareIn.importToCache(uri);
      if (!imported?.uri) continue;

      const id = makeId('shared');
      const safe = imported.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || `${id}.mp3`;
      const dest = `${IMPORT_DIR}${id}_${safe}`;
      await FileSystem.copyAsync({ from: imported.uri, to: dest });

      const { title, artist } = parseTitleArtist(imported.name);
      out.push({
        id,
        uri: dest,
        title,
        artist,
        album: 'Shared with me',
        durationMs: 0,
        filename: imported.name,
      });
    } catch {
      // skip a file we couldn't import
    }
  }
  return out;
}
