import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useLibraryStore } from './src/store/libraryStore';
import { initAudioSession, usePlayerStore } from './src/store/playerStore';
import { usePlaylistStore } from './src/store/playlistStore';
import { colors } from './src/theme';

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function App() {
  useEffect(() => {
    // Configure the audio session for background playback, then load data.
    void initAudioSession();
    void usePlaylistStore.getState().hydrate();
    void useLibraryStore.getState().load();

    return () => {
      // Release lock-screen controls if the app is fully torn down.
      usePlayerStore.getState().stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
