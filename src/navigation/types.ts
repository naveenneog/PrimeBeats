import type { NavigatorScreenParams } from '@react-navigation/native';

import type { SmartPlaylistKind } from '../types';

/** Bottom-tab routes. */
export type TabsParamList = {
  Home: undefined;
  Songs: undefined;
  Albums: undefined;
  Playlists: undefined;
  Search: undefined;
};

/** Root native-stack routes (tabs + modals + detail screens). */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  NowPlaying: undefined;
  AlbumDetail: { albumId: string };
  PlaylistDetail: { playlistId: string };
  SmartPlaylist: { kind: SmartPlaylistKind };
  AddToPlaylist: { trackIds: string[] };
  Settings: undefined;
  ManageHidden: undefined;
  Queue: undefined;
  Equalizer: undefined;
};
