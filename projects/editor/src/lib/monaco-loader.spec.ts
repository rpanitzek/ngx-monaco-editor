import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureMonacoLoaded } from './monaco-loader';

describe('ensureMonacoLoaded', () => {
  afterEach(() => {
    delete (window as any).monaco;
    delete (window as any).require;
    document.head.querySelectorAll('script').forEach(script => script.remove());
  });

  // Runs first: the loader caches its promise for the whole module once it succeeds.
  it('rejects when loader.js fails to load, and retries on the next call', async () => {
    const first = ensureMonacoLoaded({ baseUrl: 'cdn' });
    const firstScript = document.head.querySelector<HTMLScriptElement>('script');
    expect(firstScript?.getAttribute('src')).toBe('cdn/monaco-editor/min/vs/loader.js');

    firstScript?.dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow(/failed to load .*cdn\/monaco-editor\/min\/vs\/loader\.js/);

    const second = ensureMonacoLoaded({ baseUrl: 'cdn' });
    expect(second).not.toBe(first);
    const scripts = document.head.querySelectorAll('script');
    expect(scripts.length).toBe(2);

    scripts[1].dispatchEvent(new Event('error'));
    await expect(second).rejects.toThrow();
  });

  it('loads the AMD build once, runs onMonacoLoad with monaco and resolves with it', async () => {
    const monaco = { editor: {} };
    const config = vi.fn();
    (window as any).require = Object.assign(
      (_modules: string[], onLoad: () => void) => {
        (window as any).monaco = monaco;
        onLoad();
      },
      { config }
    );
    const onMonacoLoad = vi.fn();

    await expect(ensureMonacoLoaded({ baseUrl: 'base', onMonacoLoad })).resolves.toBe(monaco);
    expect(config).toHaveBeenCalledWith({ paths: { vs: 'base/monaco-editor/min/vs' } });
    expect(onMonacoLoad).toHaveBeenCalledTimes(1);
    expect(onMonacoLoad).toHaveBeenCalledWith(monaco);

    await ensureMonacoLoaded({ onMonacoLoad });
    expect(onMonacoLoad).toHaveBeenCalledTimes(1);
  });
});
