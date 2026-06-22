// Re-export the native module. On web, it will be resolved to EqualizerModule.web.ts
// and on native platforms to EqualizerModule.ts
export { default } from './src/EqualizerModule';
export * from './src/Equalizer.types';
