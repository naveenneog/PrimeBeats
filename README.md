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
- **Smart Radio (on-device ML)** — an endless auto-queue that picks similar songs based on the current track and your learned taste, with exploration + per-artist diversity. Fully offline.
- **Taste onboarding** — a first-run picker to seed your profile from favorite artists; it refines as you listen (plays / skips / likes).
- **Smart playlists** — auto-generated **Most Played**, **Recently Played**, and **Made for You**.
- **Albums** — automatically grouped from your music folders, with a dedicated album view.
- **Search** — instant filtering across songs, artists, and albums.
- **Album art** — uses custom/web-downloaded art when available, with colorful deterministic generated cover tiles as a fallback. Tap a track's art to **find art on the web** (iTunes) or **upload your own** (see [Album art](#album-art)).
- **Equalizer & bass boost** — a graphic EQ with device presets (Flat, Rock, Pop, …), per-band sliders, and a bass-boost control, backed by a native audio-effects module. Settings are saved across launches and updates.
- **Now Playing** — full-screen player with large art, scrubber, and all controls. **Swipe** the art to change track and **double-tap** left/right to seek ∓2s. While scrubbing, a **floating pin** shows the exact timestamp above the thumb.
- **Edit song details** — rename a track's **title & artist** (saved as a persistent override), then auto-search album art using the full info; if nothing's found, refine the search with more details (album, year). Reach it from the track menu or the artwork editor.
- **Drag-to-reorder** — rearrange tracks within a playlist by dragging.
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

## 🧠 Smart Radio & taste learning
A lightweight, **fully on-device** recommender (no cloud, no extra ML runtime):
- **Content similarity** (`src/ml/features.ts`) — track-to-track closeness from metadata (artist, album/folder, title keywords).
- **Taste profile** (`src/store/tasteStore.ts`) — accumulates affinity from **completed plays (+), early skips (−) and likes (++)**, seeded by onboarding; persisted via `AsyncStorage`.
- **Recommender** (`src/ml/recommender.ts`) — blends similarity-to-seed + taste affinity + an exploration term − a recency penalty, then enforces per-artist diversity. Smart Radio auto-extends the queue as it nears the end.
- **Smart playlists** derive from the same signals: Most Played (play count), Recently Played (recency), Made for You (taste mix).

This is "Option A" (metadata + behavior). It's structured so **on-device audio analysis** (acoustic similarity) and **external trend/genre enrichment** can layer in later without UI changes.

## ✅ Verifying

```bash
npx tsc --noEmit            # type-check (clean)
npx expo export -p android  # bundle the JS to catch resolution errors
```

## 🗺️ Roadmap

- **Embedded album art** — read ID3/cover art straight from files via a built-in `MediaMetadataRetriever` in the native module (the previous third-party lib clashed with the player's media3 and was removed).
- **Compliant YouTube Music**: integrate via the official YouTube IFrame Player / YouTube Data API using the *official player* (which honors ads and ToS) — not audio-only extraction.

## 📄 License

See [LICENSE](./LICENSE).
