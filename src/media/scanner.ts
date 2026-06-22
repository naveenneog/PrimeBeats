import { Platform } from 'react-native';
import type { PermissionResponse } from 'expo-media-library';

import type { Album, Track } from '../types';
import { folderFromUri, parseTitleArtist } from '../utils/format';

/**
 * `expo-media-library` is a device-only module (Android/iOS). Its new Query API
 * defines classes that extend the native `ExpoMediaLibraryNext` module *at
 * module-evaluation time*, so even importing it on web throws. We therefore
 * only load it on supported platforms, via a guarded dynamic import.
 */
const isSupported = Platform.OS === 'android' || Platform.OS === 'ios';

const DENIED: PermissionResponse = {
  granted: false,
  canAskAgain: false,
  expires: 'never',
  status: 'denied',
} as PermissionResponse;

/** Requests (or re-checks) read access to the device's audio library. */
export async function ensureAudioPermission(): Promise<PermissionResponse> {
  if (!isSupported) return DENIED;
  const ML = await import('expo-media-library');
  const current = await ML.getPermissionsAsync(false, ['audio']);
  if (current.granted) return current;
  if (current.canAskAgain) {
    return ML.requestPermissionsAsync(false, ['audio']);
  }
  return current;
}

/** Runs async mappers over `items` with a bounded concurrency to keep the UI responsive. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length || 1)).fill(0).map(async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Scans the device for audio assets and maps them to {@link Track} objects.
 * Returns an empty array on unsupported platforms or when permission is denied.
 */
export async function scanTracks(): Promise<Track[]> {
  if (!isSupported) return [];
  const permission = await ensureAudioPermission();
  if (!permission.granted) return [];

  const ML = await import('expo-media-library');
  const assets = await new ML.Query()
    .eq(ML.AssetField.MEDIA_TYPE, ML.MediaType.AUDIO)
    .orderBy(ML.AssetField.MODIFICATION_TIME)
    .exe();

  const tracks = await mapWithConcurrency(assets, 16, async (asset) => {
    try {
      const info = await asset.getInfo();
      const filename = info.filename ?? 'Unknown';
      const { title, artist } = parseTitleArtist(filename);
      const uri = info.uri ?? '';
      const track: Track = {
        id: asset.id,
        uri,
        title,
        artist,
        album: folderFromUri(uri),
        durationMs: info.duration != null ? Math.round(info.duration) : 0,
        filename,
      };
      return track;
    } catch {
      return null;
    }
  });

  return tracks
    .filter((t): t is Track => t != null && !!t.uri)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

/** Groups a flat list of tracks into album buckets keyed by folder + artist. */
export function groupAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>();
  for (const track of tracks) {
    const key = track.album.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.trackIds.push(track.id);
      if (existing.artist !== track.artist) existing.artist = 'Various Artists';
    } else {
      map.set(key, {
        id: key,
        name: track.album,
        artist: track.artist,
        trackIds: [track.id],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
