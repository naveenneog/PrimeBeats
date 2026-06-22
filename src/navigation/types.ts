import type { NavigatorScreenParams } from '@react-navigation/native';

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
  AddToPlaylist: { trackIds: string[] };
};
