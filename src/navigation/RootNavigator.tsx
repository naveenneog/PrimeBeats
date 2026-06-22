import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddToPlaylistScreen } from '../screens/AddToPlaylistScreen';
import { AlbumDetailScreen } from '../screens/AlbumDetailScreen';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { PlaylistDetailScreen } from '../screens/PlaylistDetailScreen';
import { SmartPlaylistScreen } from '../screens/SmartPlaylistScreen';
import { Tabs } from './Tabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="SmartPlaylist" component={SmartPlaylistScreen} />
      <Stack.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AddToPlaylist"
        component={AddToPlaylistScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
