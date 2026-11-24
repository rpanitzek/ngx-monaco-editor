import type { Monaco, NgxMonacoEditorConfig } from './config';
import { recognizeNativePromises } from './zone-promise';

let loadPromise: Promise<Monaco> | null = null;

/**
 * Loads Monaco's AMD build from `<baseUrl>/monaco-editor/min/vs` once per page and resolves with the global `monaco`.
 * The editor components call this themselves; call it directly to preload Monaco before the first editor is shown.
 * Only the first call's `config` is used. A failed load isn't cached, so the next call retries.
 */
export function ensureMonacoLoaded(config: NgxMonacoEditorConfig = {}): Promise<Monaco> {
  loadPromise ??= load(config).catch(error => {
    loadPromise = null;
    throw error;
  });
  return loadPromise;
}

function load(config: NgxMonacoEditorConfig): Promise<Monaco> {
  recognizeNativePromises();

  return new Promise<Monaco>((resolve, reject) => {
    const win = window as any;
    const vsPath = `${config.baseUrl || './assets'}/monaco-editor/min/vs`;

    const onMonacoReady = () => {
      try {
        config.onMonacoLoad?.(win.monaco);
        resolve(win.monaco);
      } catch (error) {
        reject(error);
      }
    };

    if (typeof win.monaco === 'object') {
      onMonacoReady();
      return;
    }

    // No MonacoEnvironment needed: Monaco resolves its worker URLs relative to the `vs` path.
    const onAmdLoaderReady = () => {
      try {
        win.require.config({ paths: { vs: vsPath } });
        win.require(['vs/editor/editor.main'], onMonacoReady, reject);
      } catch (error) {
        reject(error);
      }
    };

    if (win.require) {
      onAmdLoaderReady();
      return;
    }

    const loaderScript = document.createElement('script');
    loaderScript.src = `${vsPath}/loader.js`;
    loaderScript.addEventListener('load', onAmdLoaderReady);
    loaderScript.addEventListener('error', () => reject(new Error(`ngx-monaco-editor: failed to load ${loaderScript.src}`)));
    document.head.appendChild(loaderScript);
  });
}
