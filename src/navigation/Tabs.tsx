import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '../components/MiniPlayer';
import { AlbumsScreen } from '../screens/AlbumsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SongsScreen } from '../screens/SongsScreen';
import { colors } from '../theme';
import type { TabsParamList } from './types';

const Tab = createBottomTabNavigator<TabsParamList>();

const ICONS: Record<keyof TabsParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Songs: 'musical-notes',
  Albums: 'albums',
  Playlists: 'list',
  Search: 'search',
};

const TAB_BAR_BASE = 58;

export function Tabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_BASE + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: insets.bottom + 4,
            paddingTop: 6,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? ICONS[route.name]
                  : (`${ICONS[route.name]}-outline` as keyof typeof Ionicons.glyphMap)
              }
              size={size}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Songs" component={SongsScreen} />
        <Tab.Screen name="Albums" component={AlbumsScreen} />
        <Tab.Screen name="Playlists" component={PlaylistsScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
      </Tab.Navigator>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight }}>
        <MiniPlayer />
      </View>
    </View>
  );
}
