import { NativeModule, requireNativeModule } from 'expo';

export type ShareReceivedPayload = { uris: string[] };
export type ImportedFile = { uri: string; name: string };

type ShareInEvents = {
  onShareReceived: (payload: ShareReceivedPayload) => void;
};

declare class ShareInModule extends NativeModule<ShareInEvents> {
  isSupported(): boolean;
  /** Share local file paths via the OS Sharesheet (Nearby Share, Bluetooth, …). */
  shareTracks(paths: string[]): Promise<boolean>;
  /** Audio stream URIs the app was launched with (a received share), if any. */
  getInitialShare(): string[];
  /** Copy a received content:// URI into the cache; returns a file:// uri + name. */
  importToCache(uri: string): Promise<ImportedFile>;
}

export default requireNativeModule<ShareInModule>('ShareIn');
