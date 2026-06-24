import { registerWebModule, NativeModule } from 'expo';

class CarMediaModule extends NativeModule {
  isSupported(): boolean {
    return false;
  }
  setLibrary(_json: string): boolean {
    return false;
  }
}

export default registerWebModule(CarMediaModule, 'CarMediaModule');
