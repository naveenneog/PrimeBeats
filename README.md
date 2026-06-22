# 🎵 PrimeBeats

A polished, Amazon-Prime-Music-style **local music player for Android**, built with Expo (React Native + TypeScript). It streams audio from your device's storage, builds a browsable library with album/folder grouping, lets you create and manage playlists, and supports **background playback with lock-screen / notification controls**.

> Built on **Expo SDK 54** so it runs in the current **Expo Go** app. Background playback + lock-screen controls require a standalone/dev build (Expo Go can't run the media foreground service).

> **Note on YouTube:** A YouTube "audio-only + ad-blocking" mode was intentionally **not** built — extracting audio-only streams and blocking ads violates YouTube's Terms of Service. This app focuses on your own local music. See [Roadmap](#roadmap) for the compliant way to add YouTube later.

---

## ✨ Features

- **Local audio streaming** — scans your device with `expo-media-library` and plays files via `expo-audio` (ExoPlayer under the hood).
- **Background playback** — keeps playing when the app is backgrounded or the screen is locked, with a media notification & lock-screen controls.
- **Queue + playback controls** — play/pause, next/previous, seek, **shuffle**, and **repeat** (off / all / one), with automatic advance at track end.
- **Playlists** — create, rename, delete, add/remove tracks; persisted locally with `AsyncStorage`.
- **Albums** — automatically grouped from your music folders, with a dedicated album view.
- **Search** — instant filtering across songs, artists, and albums.
- **Album art** — colorful, deterministic generated cover tiles per album/track (see [Album art](#album-art)).
- **Now Playing** — full-screen player with large art, scrubber, and all controls.
- **Persistent mini-player** — docked above the tab bar on every screen.
- Dark, modern Material-inspired UI.

## 🧱 Tech stack

| Concern | Library |
| --- | --- |
| Runtime | Expo SDK **54** (React Native 0.81, React 19) — chosen for Expo Go compatibility |
| Audio playback / background / lock screen | `expo-audio` |
| Media scanning | `expo-media-library` |
| Navigation | `@react-navigation/native` (native-stack + bottom-tabs) |
| State | `zustand` |
| Persistence | `@react-native-async-storage/async-storage` |
| UI | `expo-image`, `expo-linear-gradient`, `@react-native-community/slider`, `@expo/vector-icons` |

## 📁 Project structure

```
src/
  theme.ts                 Design tokens (colors, spacing, gradients)
  types.ts                 Track / Album / Playlist models
  utils/format.ts          Duration formatting, filename parsing, art seeds
  media/scanner.ts         expo-media-library Query scan -> Track[] + album grouping
  store/
    playerStore.ts         Single AudioPlayer + custom queue, lock-screen, auto-advance
    libraryStore.ts        Scanned tracks/albums + load status
    playlistStore.ts       Playlist CRUD + AsyncStorage persistence
  components/               ArtTile, TrackRow, TrackList, MiniPlayer, TopBar, States, …
  navigation/              RootNavigator (stack) + Tabs (bottom tabs + mini-player)
  screens/                 Home, Songs, Albums, AlbumDetail, Playlists,
                           PlaylistDetail, Search, NowPlaying, AddToPlaylist
App.tsx                    Providers, dark theme, startup init
```

## 🚀 Getting started

### Prerequisites
- Node.js 18+ and npm
- For full native features (background audio): an [Expo account](https://expo.dev) for cloud builds (no local Android SDK required).

### Install
```bash
npm install
```

### Run in development

**Option A — Expo Go (quickest, foreground playback only):**
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app. You can browse your library, build playlists, and play music in the foreground. *Background playback and lock-screen controls require a real build* (Option B), because they rely on a native foreground service.

**Option B — Development build (full features):**
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # produces an installable APK
```
Install the resulting APK, then run `npx expo start --dev-client`.

### Build a release APK
```bash
eas build --profile preview --platform android
```
This produces a standalone **APK** you can sideload on any Android device. The `production` profile builds an **AAB** for the Play Store.

> Prefer building locally? With the Android SDK + JDK installed you can run `npx expo run:android` (this runs `expo prebuild` and a Gradle build).

## 🔐 Permissions

Configured in `app.json` and applied by the config plugins:

- `READ_MEDIA_AUDIO` — read audio files (Android 13+).
- `POST_NOTIFICATIONS` — show the media playback notification.
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` — sustain background audio.

Microphone/`RECORD_AUDIO` is explicitly **disabled** (`recordAudioAndroid: false`) since this is a playback-only app.

## 🖼️ Album art

`expo-media-library` on this SDK does not expose embedded ID3 artwork for audio assets, so PrimeBeats renders **deterministic gradient tiles** with the album/track initials. They're stable per album (the same album always gets the same cover) and look clean throughout the UI. The `ArtTile` component already accepts an optional `uri`, so real embedded-artwork extraction can be dropped in later (see Roadmap) without UI changes.

## 🧩 How playback works

Background audio on Android requires `AudioPlayer.setActiveForLockScreen(...)`, which only exists on a *player* (not on `AudioPlaylist`). PrimeBeats therefore keeps a **single, app-lifetime `AudioPlayer`** and manages the queue itself in `playerStore`:

- `playFrom(tracks, index)` sets the queue and loads a track via `player.replace({ uri })`.
- Each track change updates lock-screen metadata (`setActiveForLockScreen` / `updateLockScreenMetadata`).
- A `playbackStatusUpdate` listener mirrors position/duration/playing state into the store and auto-advances on `didJustFinish` (respecting repeat mode).

## ✅ Verifying

```bash
npx tsc --noEmit            # type-check (clean)
npx expo export -p android  # bundle the JS to catch resolution errors
```

## 🗺️ Roadmap

- **Embedded album art** via a small native module / `MediaStore` album-art URIs.
- **Drag-to-reorder** playlist tracks.
- **Compliant YouTube Music**: integrate via the official YouTube IFrame Player / YouTube Data API using the *official player* (which honors ads and ToS) — not audio-only extraction.

## 📄 License

See [LICENSE](./LICENSE).
