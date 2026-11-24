import { describe, expect, it } from 'vitest';

import { recognizeNativePromises } from './zone-promise';

describe('recognizeNativePromises', () => {
  // zone.js keeps the real Promise under this key. The test target loads zone.js (`polyfills` in angular.json).
  const NativePromise = (globalThis as any).__zone_symbol__Promise as PromiseConstructor;

  it('lets native promises pass instanceof Promise while zone.js has replaced it', () => {
    // Monaco's quick access (F1) tells a promise from an array with this check.
    expect(NativePromise).toBeDefined();
    expect(NativePromise.resolve() instanceof Promise).toBe(false);

    recognizeNativePromises();

    expect(NativePromise.resolve() instanceof Promise).toBe(true);
    expect(Promise.resolve() instanceof Promise).toBe(true);
  });

  it('is idempotent', () => {
    recognizeNativePromises();
    const patched = Object.getOwnPropertyDescriptor(Promise, Symbol.hasInstance)?.value;
    expect(patched).toBeTypeOf('function');

    recognizeNativePromises();

    expect(Object.getOwnPropertyDescriptor(Promise, Symbol.hasInstance)?.value).toBe(patched);
  });

  it('only widens Promise itself, and still rejects non-promises', () => {
    recognizeNativePromises();
    class CustomPromise<T> extends Promise<T> {}

    expect(NativePromise.resolve() instanceof CustomPromise).toBe(false);
    expect([] instanceof Promise).toBe(false);
    expect({ then: () => undefined } instanceof Promise).toBe(false);
  });
});
