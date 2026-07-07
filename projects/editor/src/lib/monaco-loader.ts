// monaco-loader.ts
import { NgxMonacoEditorConfig } from './config';

let loadPromise: Promise<void> | null = null;

function resolveBaseUrl(config: NgxMonacoEditorConfig): string {
  return (config.baseUrl || './assets') + '/monaco-editor/min/vs';
}

function configureMonacoEnvironment(config: NgxMonacoEditorConfig): void {
  const baseUrl = resolveBaseUrl(config);
  (self as any).MonacoEnvironment = {
    getWorkerUrl: (_moduleId: string, _label: string) => `${baseUrl}/base/worker/workerMain.js`,
  };
}

export function ensureMonacoLoaded(config: NgxMonacoEditorConfig): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>(resolve => {
    const win = window as any;
    const baseUrl = resolveBaseUrl(config);

    configureMonacoEnvironment(config);

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
