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
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ArtworkSheet } from './src/components/ArtworkSheet';
import { prefetchEmbeddedArt } from './src/media/embeddedArt';
import { useArtworkStore } from './src/store/artworkStore';
import { useLibraryStore } from './src/store/libraryStore';
import { initPlayer, usePlayerStore } from './src/store/playerStore';
import { usePlaylistStore } from './src/store/playlistStore';
import { useSettingsStore } from './src/store/settingsStore';
import { useTasteStore } from './src/store/tasteStore';
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
  const tasteHydrated = useTasteStore((s) => s.hydrated);
  const onboardingDone = useTasteStore((s) => s.onboardingDone);
  const libraryStatus = useLibraryStore((s) => s.status);
  const trackCount = useLibraryStore((s) => s.tracks.length);

  useEffect(() => {
    // Set up the playback engine (RNTP) for background + lock-screen controls.
    void initPlayer();
    void useSettingsStore.getState().hydrate();
    void usePlaylistStore.getState().hydrate();
    void useTasteStore.getState().hydrate();
    void useArtworkStore.getState().hydrate();
    void useLibraryStore.getState().load();

    return () => {
      // Release lock-screen controls if the app is fully torn down.
      usePlayerStore.getState().stop();
    };
  }, []);

  // First-run: once the library is scanned, let the user seed their taste.
  const needsOnboarding =
    tasteHydrated && !onboardingDone && libraryStatus === 'ready' && trackCount > 0;

  useEffect(() => {
    // Background-extract embedded album art once the library is ready.
    if (libraryStatus === 'ready') {
      void prefetchEmbeddedArt(useLibraryStore.getState().allTracks);
    }
  }, [libraryStatus]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {needsOnboarding ? (
          <OnboardingScreen />
        ) : (
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        )}
        <ArtworkSheet />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
