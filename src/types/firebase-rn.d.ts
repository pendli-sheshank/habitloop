// firebase/auth ships getReactNativePersistence only in its React Native build.
// Metro resolves it via the "react-native" package.json field at runtime, but
// TypeScript's bundler resolver hits the browser types first because the firebase
// wrapper sub-package has no react-native export condition.
// This augmentation exposes the function to TypeScript without changing runtime behavior.

export {};

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: import('@react-native-async-storage/async-storage').AsyncStorageStatic
  ): import('@firebase/auth').Persistence;
}
