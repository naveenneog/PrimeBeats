// Re-export the native module. On web, it will be resolved to CarMediaModule.web.ts
// and on native platforms to CarMediaModule.ts
export { default } from './src/CarMediaModule';
export * from './src/CarMedia.types';
