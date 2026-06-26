import { registerWebModule, NativeModule } from 'expo';

type CarMediaEvents = {
  onCarPlayback: (state: { active: boolean }) => void;
  onCarCommand: (payload: { command: string }) => void;
};

class CarMediaModule extends NativeModule<CarMediaEvents> {
  isSupported(): boolean {
    return false;
  }
  setLibrary(_json: string): boolean {
    return false;
  }
  setNowPlaying(_state: unknown): void {}
  getNowPlaying(): null {
    return null;
  }
  sendCommand(_command: string): void {}
}

export default registerWebModule(CarMediaModule, 'CarMediaModule');
