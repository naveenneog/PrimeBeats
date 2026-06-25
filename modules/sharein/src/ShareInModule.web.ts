import { registerWebModule, NativeModule } from 'expo';

type ShareInEvents = {
  onShareReceived: (payload: { uris: string[] }) => void;
};

class ShareInModule extends NativeModule<ShareInEvents> {
  isSupported(): boolean {
    return false;
  }
  async shareTracks(_paths: string[]): Promise<boolean> {
    return false;
  }
  getInitialShare(): string[] {
    return [];
  }
  async importToCache(_uri: string): Promise<{ uri: string; name: string }> {
    return { uri: '', name: '' };
  }
}

export default registerWebModule(ShareInModule, 'ShareInModule');
