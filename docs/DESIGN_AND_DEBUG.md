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
| `libraryStore` | Scans device audio; holds `rawTracks` (scan), `allTracks` (overrides applied) and `tracks`/`albums`/`byId` (visible) | none (rescans) |
| `playlistStore` | User playlists CRUD | AsyncStorage |
| `tasteStore` | Learned taste profile + Most/Recently Played selectors | AsyncStorage |
| `settingsStore` | Hidden/excluded track ids | AsyncStorage |
| `metadataStore` | Per-track title/artist overrides (user-edited names) | AsyncStorage |
| `artworkStore` | Per-track custom/web/uploaded cover art | AsyncStorage + files |
| `importedStore` | Tracks received from other PrimeBeats users (P2P) | AsyncStorage + files |
| `eqStore` | Equalizer + bass-boost settings | AsyncStorage |
| `playerStore` | Playback queue + controls, driven by RNTP | runtime only |

`libraryStore` applies `metadataStore` overrides to `rawTracks` (in
`recomputeAll`) and filters `settingsStore.hidden` (in `recomputeVisible`); it
subscribes to both stores so renames/hides reflect live across the app.

Stores reference each other **only inside actions** (deferred), so cyclic imports
(`libraryStore` ⇄ `settingsStore`/`metadataStore`, `playerStore` →
`library`/`taste`) are safe.

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

## 5. Equalizer & audio effects (native local module)

A graphic EQ + bass boost backed by a **local Expo module** in
`modules/equalizer/` (Kotlin). It wraps `android.media.audiofx.Equalizer` and
`BassBoost` on **audio session 0** (the global output mix), so effects apply to
the app's playback without needing the player's session id.

- **Native** (`EqualizerModule.kt`): `isAvailable`, `getInfo`
  (bands / level range / center freqs / presets), `getBandLevels`,
  `setBandLevel`, `usePreset`, `setEnabled`, `setBassBoostEnabled/Strength`,
  `release`. Every call is wrapped in try/catch — creating the effect can throw
  on devices that forbid global effects, so `isAvailable` returns false there.
- **JS bridge** (`src/native/equalizer.ts`): requires the module defensively
  (guarded `require` + per-call try/catch) so the app never crashes if the
  native side is missing (e.g. Expo Go).
- **State** (`eqStore.ts`): persists `{enabled, bandLevels, presetIndex,
  bassBoostEnabled, bassBoostStrength}` to `@primebeats/equalizer/v1` and
  re-applies them on launch (`init()` from `App.tsx`). Sliders call `previewX`
  (live, no write) on change and the persisting setter on release.
- **UI** (`EqualizerScreen`): preset chips, per-band sliders, bass-boost
  toggle + slider, reset-to-flat. Reached from Settings → Audio and the Now
  Playing toolbar (sliders icon).
- **Units:** band levels are **millibels** (÷100 = dB); center freqs are Hz;
  bass-boost strength is 0–1000. Needs `MODIFY_AUDIO_SETTINGS` (declared in the
  module manifest and app.json).
- **Why a custom module?** RNTP exposes no EQ API, and the third-party metadata
  lib we trialled bundled a forked media3 that duplicate-class-clashed with
  RNTP's androidx.media3 — so we own the native effect code instead.

---

## 6. Android Auto (`carmedia` module)

RNTP's service is a `HeadlessJsTaskService`, **not** a `MediaBrowserService`, so
it can't power Android Auto. PrimeBeats adds its own Auto entry point: a local
Expo module `modules/carmedia` containing a legacy `MediaBrowserServiceCompat`
(`PrimeBeatsMediaService`).

- **Discovery:** the module manifest declares the service with the
  `android.media.browse.MediaBrowserService` intent-filter and the
  `com.google.android.gms.car.application` meta-data → `res/xml/automotive_app_desc.xml`
  (`<uses name="media"/>`). These merge into the app manifest.
- **Library snapshot:** JS pushes the visible library to native via
  `CarMedia.setLibrary(tracks)` (App.tsx, on every `libraryStore.tracks` change).
  `CarMediaModule.setLibrary` writes it to `filesDir/primebeats_carlib.json`, so
  the service can browse/search/play even when the car starts it **cold**.
- **Browse tree:** root → "Songs" → each track (FLAG_PLAYABLE, mediaId = track id).
- **Playback:** the service has its **own** `MediaPlayer` + `MediaSessionCompat`
  + `AudioManager` focus + a MediaStyle foreground notification. It's independent
  of RNTP; audio focus stops the two playing at once (RNTP `autoHandleInterruptions`).
- **Voice:** `onPlayFromSearch(query)` → `findMatch` (mirrors the JS
  `matchTrackIndex`) → play the match, else **fall back to another song**.
  `onPlayFromMediaId` plays a tapped item. RNTP also handles `RemotePlaySearch`
  (`Capability.PlayFromSearch`) for when *its* session is the active one.
- **Testing:** Auto only lists Play-Store apps unless you enable
  **Android Auto → Developer settings → "Unknown sources"**; then use a head unit
  or the Desktop Head Unit (DHU). Open the app once after install so the snapshot
  exists. In-app vs Auto playback state aren't mirrored in this first version.

---

## 7. Peer-to-peer sharing (`sharein` module)

Selecting songs and sending them to another PrimeBeats user, via the OS — no
in-app server, works over Nearby Share / Bluetooth / etc.

- **Send** (`ShareMusicScreen`, Settings → Sharing; or a track's ⋯ → Share):
  `ShareIn.shareTracks(tracks)` → native `ACTION_SEND_MULTIPLE` with FileProvider
  `content://` URIs for each file → the OS Sharesheet.
- **Receive:** app.json `android.intentFilters` make MainActivity accept
  `SEND`/`SEND_MULTIPLE` `audio/*`. `ShareIn.getInitialShare()` reads the launch
  intent once; `OnNewIntent` → `onShareReceived` event handles shares while
  running. `processSharedUris` calls `ShareIn.importToCache` (copies the
  `content://` stream into the cache), moves it into `documentDirectory/imported/`,
  derives title/artist from the filename, and `importedStore.add` persists it.
- **Library merge:** `libraryStore.recomputeAll` concatenates `rawTracks` (scan)
  with `importedStore.tracks`, so received songs are first-class (searchable,
  playlistable, art/rename/EQ all apply). They survive updates (document dir).
- **Why not MediaStore?** Writing received audio to the shared MediaStore needs
  extra permissions/SAF and is flaky across OEMs; keeping imports app-private is
  reliable and fully under our control.
- **Testing:** needs two devices (or share an audio file to PrimeBeats from any
  app). Can't be exercised in CI.

---

## 8. Debugging playbook

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
| Equalizer screen says "unavailable" | Device forbids app-controlled global effects → `Equalizer(0,0)` threw, `eqStore.available === false`. Expected on some phones; not a bug. |
| Renamed song reverts after restart | `metadataStore` not hydrated before use, or `libraryStore.recomputeAll` not re-run. Check `App.tsx` hydrates `metadataStore` and the `useMetadataStore.subscribe` in `libraryStore.ts`. Overrides live in `@primebeats/metadata/v1`. |
| Seek pin not showing while scrubbing | `SeekBar` only renders the pin while `seeking` and after `onLayout` sets a width; verify the slider has a measured width. |
| Now Playing slider won't drag | Don't feed the slider a new `value` from the 250 ms progress tick mid-drag — `SeekBar` isolates scrubbing with `seekingRef`. A controlled value changing during the gesture fights the native thumb on Android. Tap-to-seek and the progressive double-tap (below) are the reliable fallbacks. |
| Double-tap seek feels fixed at 2s | `NowPlayingArt` runs a *burst*: a double-tap starts it, then each further tap on the same side advances `progressiveSeekStep(n)` = max(2,n) → +2,+2,+3,+4,+5… The burst resets after `BURST_WINDOW` (1.3 s) of no taps. The step math is pure in `utils/seek.ts` (tested). |
| Most Played / Recently Played not updating | Plays are counted on a *substantial* listen (not only full completion) and recorded when **leaving** a track via `recordPlay`; Recently Played is recorded the moment a track becomes active via the `usePlayerStore.subscribe` → `tasteStore.recordStart`. `lastProgressSec` backs up `event.lastPosition` when it's missing. |
| EQ sliders editable while master off | Native `Slider` ignores a parent's `pointerEvents="none"` — pass `disabled={!enabled}` to each slider/preset instead. |
| Bass boost inaudible | Strength defaults to 0; `eqStore.setBassBoostEnabled` applies a default strength (600/1000) when first enabled. Some devices report `bassBoostSupported:false` (UI hides it). |
| Queue reorder doesn't stick | `reorderQueue(from,to)` updates the mirror + `TrackPlayer.move`; current index is recomputed by track id. If native `move` throws, the next track change re-syncs. |
| App doesn't appear in Android Auto | Auto only lists Play-Store apps by default — enable **Developer settings → "Unknown sources"** in the Android Auto app. Then check the merged manifest has `PrimeBeatsMediaService` + the `com.google.android.gms.car.application` meta-data (`modules/carmedia`). |
| Voice "play X from PrimeBeats" plays the wrong/over a song | `carmedia` reads the JSON library snapshot from `filesDir/primebeats_carlib.json` (written by `CarMedia.setLibrary` on every library change). If empty, the app hasn't run since install — open it once. Matching is `matchTrackIndex` (tested); no match → falls back to another song by design. |
| Auto playback and phone playback fight | They're separate sessions (carmedia uses its own `MediaPlayer`; in-app uses RNTP). Android **audio focus** arbitrates — RNTP has `autoHandleInterruptions:true` so it pauses when the car service takes focus. |
| Sharing a song does nothing | `sharein` shares via a FileProvider (`${applicationId}.sharein.fileprovider`, paths in `res/xml/sharein_file_paths.xml`). Needs the launching **activity** — `ShareIn.shareTracks` rejects from a non-activity context. Scanned tracks are external `file://`, imported ones live under `documentDirectory` (both covered by the file_paths). |
| Received songs don't appear | Receiving relies on the `SEND`/`SEND_MULTIPLE` `audio/*` intent-filters (app.json `android.intentFilters`) on MainActivity. `ShareIn.getInitialShare()` reads the launch intent once; `onShareReceived` (via `OnNewIntent`) handles shares while running. `processSharedUris` copies them into `documentDirectory/imported/` and `importedStore.add` merges them into the library (no MediaStore write needed). |

### Tools
- **Type-check:** `npx tsc --noEmit`
- **Unit tests (regression):** `npm test` (jest-expo). Pure-logic suites live in
  `src/**/__tests__/` and cover formatting/parsing, the iTunes art search, taste
  metadata overrides, the Smart-Radio recommender/features, and the seek-pin math
  — so the core features stay intact across changes. Run before every release.
- **Bundle check (catches import/resolution errors):** `npx expo export -p android`
- **Logs:** Metro console for JS; `adb logcat | findstr -i "TrackPlayer ReactNative"` for native/playback logs on a connected device.
- **Inspect persisted state:** the AsyncStorage keys are
  `@primebeats/playlists/v1`, `@primebeats/taste/v1`, `@primebeats/settings/v1`,
  `@primebeats/equalizer/v1`, `@primebeats/metadata/v1`, `@primebeats/artwork/v1`,
  `@primebeats/imported/v1`.

---

## 9. Build & release (local, no EAS)

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

## 10. Directory map

```
src/
  ml/            features.ts, recommender.ts            (recommendation engine)
  store/         library/playlist/taste/settings/metadata/artwork/eq/imported/player
  player/        playbackService.ts                     (RNTP lock-screen service)
  media/         scanner.ts, embeddedArt.ts, webArt.ts, shareImport.ts
  native/        equalizer.ts, carMedia.ts, shareIn.ts  (crash-proof native bridges)
  hooks/         useKeyboardHeight.ts                   (lift sheets over keyboard)
  navigation/    RootNavigator, Tabs, types
  components/    ArtTile, TrackRow, TrackList, MiniPlayer, TrackActionsSheet,
                 NowPlayingArt, ReorderablePlaylist, ReorderableQueue, ArtworkSheet,
                 SeekBar, TopBar, Header, States, TextPromptModal
  screens/       Home, Songs, Albums, AlbumDetail, Playlists, PlaylistDetail,
                 SmartPlaylist, Search, NowPlaying, AddToPlaylist, Onboarding,
                 Settings, ManageHidden, Queue, Equalizer, ShareMusic
  utils/         format.ts, seek.ts, search.ts
  **/__tests__/  jest-expo unit tests (run with `npm test`)
  theme.ts, types.ts
modules/
  equalizer/     Expo local native module (Kotlin EQ + BassBoost)
  carmedia/      Expo local native module (Android Auto MediaBrowserService)
  sharein/       Expo local native module (P2P share send + receive)
App.tsx, index.ts
```
