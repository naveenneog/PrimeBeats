import { NativeModule, requireNativeModule } from 'expo';

declare class CarMediaModule extends NativeModule {
  /** Whether the Android Auto media service is available (Android only). */
  isSupported(): boolean;
  /** Persist the playable library snapshot (JSON array of {id,title,artist,album,uri}). */
  setLibrary(json: string): boolean;
}

export default requireNativeModule<CarMediaModule>('CarMedia');
