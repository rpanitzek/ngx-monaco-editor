// monaco-loader.ts
import { NgxMonacoEditorConfig } from './config';

let loadedMonaco = false;
let loadPromise: Promise<void> | null = null;

export function ensureMonacoLoaded(config: NgxMonacoEditorConfig): Promise<void> {
  if (loadedMonaco && loadPromise) {
    return loadPromise;
  }

  loadedMonaco = true;

  loadPromise = new Promise<void>((resolve) => {
    const win = window as any;
    const baseUrl = (config.baseUrl || './assets') + '/monaco-editor/min/vs';

    // Already loaded
    if (typeof win.monaco === 'object') {
      if (typeof config.onMonacoLoad === 'function') config.onMonacoLoad();
      resolve();
      return;
    }

    const onGotAmdLoader = () => {
      win.require.config({ paths: { vs: baseUrl } });
      win.require(['vs/editor/editor.main'], () => {
        if (typeof config.onMonacoLoad === 'function') config.onMonacoLoad();
        resolve();
      });
    };

    // Load AMD loader if necessary
    if (!win.require) {
      const loaderScript: HTMLScriptElement = document.createElement('script');
      loaderScript.type = 'text/javascript';
      loaderScript.src = `${baseUrl}/loader.js`;
      loaderScript.addEventListener('load', onGotAmdLoader);
      document.body.appendChild(loaderScript);
    } else {
      onGotAmdLoader();
    }
  });

  return loadPromise;
}
