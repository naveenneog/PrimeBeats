import { Platform } from 'react-native';
import type { PermissionResponse } from 'expo-media-library';

import type { Album, Track } from '../types';
import { folderFromUri, parseTitleArtist } from '../utils/format';

/**
 * `expo-media-library` is a device-only module (Android/iOS) with no web
 * implementation, so importing it on web throws. We therefore only load it on
 * supported platforms, via a guarded dynamic import. This targets the SDK 54
 * legacy API (`getAssetsAsync`), where each asset is a plain object.
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

/**
 * Scans the device for audio assets and maps them to {@link Track} objects.
 * Returns an empty array on unsupported platforms or when permission is denied.
 */
export async function scanTracks(): Promise<Track[]> {
  if (!isSupported) return [];
  const permission = await ensureAudioPermission();
  if (!permission.granted) return [];

  const ML = await import('expo-media-library');
  const tracks: Track[] = [];
  let after: string | undefined;

  // Page through the whole audio library (the default page size is small).
  for (;;) {
    const page = await ML.getAssetsAsync({
      mediaType: ML.MediaType.audio,
      first: 200,
      ...(after ? { after } : {}),
    });

    for (const asset of page.assets) {
      const filename = asset.filename ?? 'Unknown';
      const uri = asset.uri ?? '';
      if (!uri) continue;
      const { title, artist } = parseTitleArtist(filename);
      tracks.push({
        id: asset.id,
        uri,
        title,
        artist,
        album: folderFromUri(uri),
        // Legacy `Asset.duration` is in seconds; normalise to milliseconds.
        durationMs: asset.duration ? Math.round(asset.duration * 1000) : 0,
        filename,
      });
    }

    if (!page.hasNextPage || page.assets.length === 0) break;
    after = page.endCursor;
  }

  return tracks.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
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
