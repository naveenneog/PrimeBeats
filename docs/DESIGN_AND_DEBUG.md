# PrimeBeats — Design & Debug Guide

A practical reference for how PrimeBeats is built and how to debug it. For the
product overview and install/build instructions, see the [README](../README.md).

---

## 1. High-level architecture

PrimeBeats is an offline, on-device Android music app (Expo SDK 54 / RN 0.81 /
React 19, TypeScript). It has **no backend** — everything (library, playlists,
taste model, settings) lives on the device.

```
index.ts ──registers──> RNTP playback service (lock-screen remote controls)
   │
   └─> App.tsx ──init──> stores + RNTP engine, gates onboarding
          │
          ├─ NavigationContainer
          │     └─ RootNavigator (native-stack)
          │           ├─ Tabs (Home / Songs / Albums / Playlists / Search) + MiniPlayer
          │           └─ AlbumDetail / PlaylistDetail / SmartPlaylist /
          │              NowPlaying / AddToPlaylist / Settings / ManageHidden
          │
          └─ Onboarding gate (first launch)
```

### State (Zustand stores, all in `src/store/`)
| Store | Responsibility | Persistence |
| --- | --- | --- |
| `libraryStore` | Scans device audio; holds `allTracks` (raw) and `tracks`/`albums`/`byId` (visible) | none (rescans) |
| `playlistStore` | User playlists CRUD | AsyncStorage |
| `tasteStore` | Learned taste profile + Most/Recently Played selectors | AsyncStorage |
| `settingsStore` | Hidden/excluded track ids | AsyncStorage |
| `playerStore` | Playback queue + controls, driven by RNTP | runtime only |

Stores reference each other **only inside actions** (deferred), so cyclic imports
(`libraryStore` ⇄ `settingsStore`, `playerStore` → `library`/`taste`) are safe.

---

## 2. Playback engine (react-native-track-player)

Playback is driven by **react-native-track-player (RNTP)**, which owns a native
Media3 queue + media session. This is what enables **lock-screen / notification
next & previous** (expo-audio deliberately removes those commands).

- **Source of truth:** `playerStore.queue` (a `Track[]`) mirrors RNTP's native
  queue. UI and the recommender reason about `queue`/`currentIndex`.
- **Driving the engine:** actions call `TrackPlayer.reset/add/skip/play/...`.
  Most are async; the store actions are sync wrappers around `do*` helpers.
- **Reading state back:** module-level listeners (attached once in `initPlayer`)
  push RNTP events into the store:
  - `PlaybackState` → `isPlaying` / `isBuffering`
  - `PlaybackProgressUpdated` → `positionSec` / `durationSec` (interval = 1s)
  - `PlaybackActiveTrackChanged` → `currentIndex`, implicit feedback for the
    track just left, and Smart-Radio auto-extend.
- **Lock-screen controls:** `src/player/playbackService.ts` (registered in
  `index.ts`) maps `Remote*` events → `TrackPlayer` calls. Capabilities are set
  in `initPlayer()`'s `updateOptions`.
- **`ready` flag:** `setupPlayer()` is async; actions no-op until `ready` is true
  (set at the end of `initPlayer`).

### Gotchas
- `setupPlayer()` throws if called twice (fast refresh) — caught and ignored.
- On Android, `setupPlayer()` must run in the foreground (it does, from `App`).
- Shuffle toggle rebuilds the RNTP queue (`reset` → `add` → `skip` → `seek` →
  `play`) to preserve the current track + position.

---

## 3. Smart Radio & taste learning

See README §"Smart Radio". Code lives in `src/ml/`:
- `features.ts` — `trackSimilarity` (artist/album/title-keyword overlap).
- `recommender.ts` — `rankTracks` / `recommendNext` / `recommendForYou`
  (similarity + taste affinity + exploration − recency, with per-artist
  diversity and a cold-start shuffle fallback).
- `tasteStore.ts` — learns from completed plays (+), early skips (−), likes (++);
  seeded by onboarding. `selectMostPlayed` / `selectRecentlyPlayed` power the
  smart playlists.

Feedback is logged in the `PlaybackActiveTrackChanged` listener: a track is
"completed" when `lastPosition >= duration - 2s`, otherwise it's a skip.

---

## 4. Hidden / excluded tracks

- `settingsStore.hidden` is a `{ [trackId]: true }` set (persisted).
- `libraryStore` keeps `allTracks` (everything scanned) and derives `tracks`
  (visible = `allTracks` minus hidden) via `recomputeVisible()`.
- `libraryStore` **subscribes** to `settingsStore`, so toggling hidden updates the
  visible library everywhere immediately (lists, albums, recommender, playlists).
- `ManageHiddenScreen` operates on `allTracks` (so hidden items remain visible
  there) with a "Long (10 min+)" filter to quickly find recordings.

---

## 5. Debugging playbook

| Symptom | Where to look |
| --- | --- |
| No songs appear | Audio permission denied → `libraryStore.status === 'denied'`. Re-grant via the Songs/Home "Grant access", or check `scanner.ts` (Android `READ_MEDIA_AUDIO`). |
| Songs play but no lock-screen controls | RNTP service not registered → check `index.ts` `registerPlaybackService`, and `updateOptions` capabilities in `initPlayer`. Lock-screen needs a **standalone build** (not Expo Go). |
| Next/Prev on lock screen do nothing | `playbackService.ts` Remote handlers; ensure `SkipToNext/SkipToPrevious` are in `capabilities`. |
| Progress bar frozen | `PlaybackProgressUpdated` not firing → `progressUpdateEventInterval` must be set in `updateOptions`. |
| Track won't play | Bad `url` (`file://` path). Log `toRNTPTrack` output; verify `Asset.uri` from `expo-media-library` (legacy returns `file://` on Android). |
| Hidden track still shows | `recomputeVisible` not triggered → confirm the `useSettingsStore.subscribe` in `libraryStore.ts` and that screens read `libraryStore.tracks` (not `allTracks`). |
| Recommendations feel random | Cold start (empty profile) falls back to shuffle. Play/like songs or complete onboarding to seed `tasteStore`. |
| Onboarding never shows / shows again | Gate logic in `App.tsx` (`needsOnboarding`) + `tasteStore.onboardingDone`. "Reset taste & onboarding" in Settings clears it. |

### Tools
- **Type-check:** `npx tsc --noEmit`
- **Bundle check (catches import/resolution errors):** `npx expo export -p android`
- **Logs:** Metro console for JS; `adb logcat | findstr -i "TrackPlayer ReactNative"` for native/playback logs on a connected device.
- **Inspect persisted state:** the AsyncStorage keys are
  `@primebeats/playlists/v1`, `@primebeats/taste/v1`, `@primebeats/settings/v1`.

---

## 6. Build & release (local, no EAS)

The standalone APK is built on a machine with JDK 17 + Android SDK (see README).

```powershell
# from repo root
npx expo prebuild -p android --no-install     # (re)generate android/ + autolink
cd android
$env:JAVA_HOME = "<jdk-17>"; $env:ANDROID_HOME = "<sdk>"
.\gradlew.bat :app:assembleRelease --no-daemon --console=plain
# -> android/app/build/outputs/apk/release/app-release.apk
```

Notes:
- **Old architecture** is pinned (`app.json` `newArchEnabled: false`) — the app
  needs no new-arch features and this keeps builds lean.
- The release build is **debug-signed** (default Expo template) — fine for
  sideloading, not for the Play Store.
- Bump `version` + `android.versionCode` in `app.json` before each release.
- Publish: `gh release create vX.Y.Z <apk> --title ... --notes ...`.

---

## 7. Directory map

```
src/
  ml/            features.ts, recommender.ts            (recommendation engine)
  store/         library/playlist/taste/settings/player (zustand state)
  player/        playbackService.ts                     (RNTP lock-screen service)
  media/         scanner.ts                             (expo-media-library scan)
  navigation/    RootNavigator, Tabs, types
  components/    ArtTile, TrackRow, TrackList, MiniPlayer, TrackActionsSheet,
                 TopBar, Header, States, TextPromptModal
  screens/       Home, Songs, Albums, AlbumDetail, Playlists, PlaylistDetail,
                 SmartPlaylist, Search, NowPlaying, AddToPlaylist, Onboarding,
                 Settings, ManageHidden
  utils/         format.ts
  theme.ts, types.ts
App.tsx, index.ts
```
