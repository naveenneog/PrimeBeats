/**
 * Core domain models for PrimeBeats.
 */

/** A single playable audio track sourced from the device's media library. */
export type Track = {
  /** Stable id (the MediaLibrary asset id / Android content uri). */
  id: string;
  /** Playable uri (file:// path resolved from the asset). */
  uri: string;
  /** Display title, derived from tags/filename. */
  title: string;
  /** Artist name, derived from filename pattern or "Unknown Artist". */
  artist: string;
  /** Album / containing folder name. */
  album: string;
  /** Duration in milliseconds (0 when unknown). */
  durationMs: number;
  /** Original filename including extension. */
  filename: string;
  /** Optional artwork uri (reserved for future embedded-art extraction). */
  artworkUri?: string;
};

/** A grouping of tracks that share the same album/folder. */
export type Album = {
  id: string;
  name: string;
  artist: string;
  trackIds: string[];
};

/** A user-created, persisted playlist. */
export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

/** Repeat behaviour for the playback queue. */
export type RepeatMode = 'off' | 'all' | 'one';
