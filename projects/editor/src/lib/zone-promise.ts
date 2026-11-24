/**
 * Lets native promises pass `instanceof Promise` while zone.js has replaced the global `Promise`.
 *
 * Monaco is loaded as a prebuilt bundle at runtime, outside of the Angular build, so its `async` functions return native
 * promises. zone.js swaps the global `Promise` for its own, and Monaco's quick access (the F1 command palette) tells a
 * promise from a list of picks with `instanceof Promise`: a native promise fails that check and is used as the list
 * itself ("e.reduce is not a function"). Only `Promise` itself is widened, not its subclasses.
 */
export function recognizeNativePromises(): void {
  const zonePromise = globalThis.Promise;
  const nativePromise = (globalThis as unknown as Record<string, PromiseConstructor | undefined>)['__zone_symbol__Promise'];
  if (!nativePromise || nativePromise === zonePromise || Object.hasOwn(zonePromise, Symbol.hasInstance)) {
    return; // no zone.js, or already done
  }

  Object.defineProperty(zonePromise, Symbol.hasInstance, {
    configurable: true,
    value(this: unknown, value: unknown): boolean {
      return (
        Function.prototype[Symbol.hasInstance].call(this, value) || (this === zonePromise && value instanceof nativePromise)
      );
    },
  });
}
