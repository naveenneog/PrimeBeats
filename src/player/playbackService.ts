import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Background playback service for react-native-track-player. Runs in a headless
 * JS context and wires the lock-screen / notification remote controls — crucially
 * including **next / previous** — to the player. Registered in `index.ts`.
 */
export async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const { position } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(position + (event.interval ?? 10));
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const { position } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, position - (event.interval ?? 10)));
  });
}
