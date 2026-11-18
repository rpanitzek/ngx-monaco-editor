import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { editor } from 'monaco-editor';

/** The global `monaco` namespace, available once Monaco is loaded. */
export type Monaco = typeof import('monaco-editor');

export interface NgxMonacoEditorConfig {
  /** Folder that contains `monaco-editor/min/vs`. Defaults to `./assets`. */
  baseUrl?: string;
  /** Options merged under every editor's `options`. */
  defaultOptions?: editor.IStandaloneEditorConstructionOptions;
  /** Runs once, after Monaco is loaded and before the first editor is created. */
  onMonacoLoad?: (monaco: Monaco) => void;
  /**
   * Creates editors outside the Angular zone, so Monaco's many DOM events don't trigger change detection in zone.js
   * apps. Value changes and outputs still re-enter the zone, but callbacks you register on the editor yourself (for
   * example in `onInit`) then run outside it. Has no effect in zoneless apps.
   */
  runOutsideAngular?: boolean;
}

export const NGX_MONACO_EDITOR_CONFIG = new InjectionToken<NgxMonacoEditorConfig>('NGX_MONACO_EDITOR_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});

export function provideMonacoEditor(config: NgxMonacoEditorConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: NGX_MONACO_EDITOR_CONFIG, useValue: config }]);
}
