import { artGradients } from '../theme';

/** Formats a duration given in milliseconds as `m:ss` (or `h:mm:ss`). */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0 || !isFinite(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** Formats a playback position/duration given in seconds as `m:ss`. */
export function formatSeconds(sec: number): string {
  return formatDuration(Math.round((sec || 0) * 1000));
}

/** Stable, fast string hash (djb2) used to pick deterministic art colors. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Returns a deterministic gradient pair for a given seed (album/track name). */
export function gradientForSeed(seed: string): [string, string] {
  const index = hashString(seed || 'default') % artGradients.length;
  return artGradients[index];
}

/** Returns 1-2 uppercase initials for generated artwork tiles. */
export function initialsForName(name: string): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return '♪';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Derives a human-friendly title and artist from a media filename.
 * Recognises the common `Artist - Title.ext` pattern, otherwise falls back
 * to the bare filename with an "Unknown Artist".
 */
export function parseTitleArtist(filename: string): { title: string; artist: string } {
  const withoutExt = (filename || '').replace(/\.[^/.]+$/, '');
  // Strip a leading track number like "01 ", "01. ", "01 - ".
  const cleaned = withoutExt.replace(/^\s*\d{1,3}\s*[-_.]?\s*/, '').trim() || withoutExt;
  const separators = [' - ', ' – ', ' — ', '_-_'];
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx > 0) {
      const artist = cleaned.slice(0, idx).trim();
      const title = cleaned.slice(idx + sep.length).trim();
      if (artist && title) return { title, artist };
    }
  }
  return { title: cleaned || filename || 'Unknown Track', artist: 'Unknown Artist' };
}

/**
 * Extracts the containing folder name from a file uri to use as an album label.
 * e.g. `file:///storage/emulated/0/Music/Chill/song.mp3` -> `Chill`.
 */
export function folderFromUri(uri: string): string {
  if (!uri) return 'Unknown Album';
  try {
    const decoded = decodeURIComponent(uri);
    const parts = decoded.split('?')[0].split('#')[0].split('/').filter(Boolean);
    if (parts.length >= 2) {
      const folder = parts[parts.length - 2];
      if (folder && !/^(0|emulated|storage|media|external)$/i.test(folder)) {
        return folder;
      }
    }
  } catch {
    // ignore malformed uris
  }
  return 'Unknown Album';
}

/** Generates a reasonably unique id without external dependencies. */
export function makeId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
