import { recommendForYou } from '../ml/recommender';
import { CarMedia, type CarSnapshot } from '../native/carMedia';
import { useLibraryStore } from '../store/libraryStore';
import { usePlaylistStore } from '../store/playlistStore';
import { selectMostPlayed, selectRecentlyPlayed, useTasteStore } from '../store/tasteStore';

/** Builds the browseable snapshot the Android Auto service serves. */
export function buildCarSnapshot(): CarSnapshot {
  const lib = useLibraryStore.getState();
  const tracks = lib.tracks;
  const byId = lib.byId;
  const profile = useTasteStore.getState().profile;
  const playlists = usePlaylistStore.getState().playlists;

  const songs = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    uri: t.uri,
  }));

  const plGroups = playlists.map((p) => ({
    id: p.id,
    name: p.name,
    trackIds: p.trackIds.filter((id) => !!byId[id]),
  }));

  const smart = [
    { id: 'forYou', name: 'Made for You', trackIds: recommendForYou(tracks, profile, 50).map((t) => t.id) },
    { id: 'mostPlayed', name: 'Most Played', trackIds: selectMostPlayed(profile, byId, 100).map((t) => t.id) },
    {
      id: 'recentlyPlayed',
      name: 'Recently Played',
      trackIds: selectRecentlyPlayed(profile, byId, 100).map((t) => t.id),
    },
  ].filter((g) => g.trackIds.length > 0);

  return { songs, playlists: plGroups, smart };
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;

/** Debounced push of the latest snapshot to the Android Auto service. */
export function pushCarSnapshot(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    try {
      const snap = buildCarSnapshot();
      if (snap.songs.length) CarMedia.setLibrary(snap);
    } catch {
      // best-effort
    }
  }, 400);
}
