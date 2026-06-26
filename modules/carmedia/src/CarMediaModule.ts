import { NativeModule, requireNativeModule } from 'expo';

export type CarPlaybackState = {
  active: boolean;
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  playing?: boolean;
};

/** What the phone is playing, mirrored into the car session. */
export type CarNowPlayingInput = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  positionMs: number;
  playing: boolean;
  liked: boolean;
  repeat: boolean;
};

type CarMediaEvents = {
  onCarPlayback: (state: CarPlaybackState) => void;
  onCarCommand: (payload: { command: string }) => void;
};

declare class CarMediaModule extends NativeModule<CarMediaEvents> {
  /** Whether the Android Auto media service is available (Android only). */
  isSupported(): boolean;
  /** Persist the browseable library snapshot (songs + playlists + smart playlists). */
  setLibrary(json: string): boolean;
  /** Mirror the phone's current track into the car session (keeps Auto in sync). */
  setNowPlaying(state: CarNowPlayingInput): void;
  /** Latest local car playback state (for seeding the in-app banner). */
  getNowPlaying(): CarPlaybackState | null;
  /** Forward a transport command (play/pause/playpause/next/previous/stop) to the car. */
  sendCommand(command: string): void;
}

export default requireNativeModule<CarMediaModule>('CarMedia');
