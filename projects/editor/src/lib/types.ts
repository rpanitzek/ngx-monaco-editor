import type { Uri } from 'monaco-editor';

export interface DiffEditorModel {
  code: string;
  /** Falls back to `options.language`. */
  language?: string;
}

export interface NgxEditorModel {
  value: string;
  language?: string;
  /** Reuses the Monaco model registered for this URI, if there is one. */
  uri?: Uri;
}
