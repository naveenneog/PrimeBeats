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

type CarMediaEvents = {
  onCarPlayback: (state: CarPlaybackState) => void;
};

declare class CarMediaModule extends NativeModule<CarMediaEvents> {
  /** Whether the Android Auto media service is available (Android only). */
  isSupported(): boolean;
  /** Persist the browseable library snapshot (songs + playlists + smart playlists). */
  setLibrary(json: string): boolean;
  /** Latest car playback state (for seeding the UI). */
  getNowPlaying(): CarPlaybackState | null;
  /** Forward a transport command (play/pause/playpause/next/previous/stop) to the car service. */
  sendCommand(command: string): void;
}

export default requireNativeModule<CarMediaModule>('CarMedia');
