// Re-export the native module. On web, it will be resolved to ShareInModule.web.ts
// and on native platforms to ShareInModule.ts
export { default } from './src/ShareInModule';
export * from './src/ShareIn.types';
