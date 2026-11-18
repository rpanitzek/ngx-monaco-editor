import { Component, computed, effect, input } from '@angular/core';
import type { editor } from 'monaco-editor';

import { MonacoEditorBase } from './monaco-editor-base';
import { DiffEditorModel } from './types';

declare const monaco: typeof import('monaco-editor');

/** Diff editor options. `language` is the fallback for models without one. */
export type DiffEditorOptions = editor.IStandaloneDiffEditorConstructionOptions & { language?: string };

@Component({
  selector: 'ngx-monaco-diff-editor',
  template: '<div class="editor-container" #editorContainer></div>',
  styleUrl: './editor.css',
})
export class DiffEditorComponent extends MonacoEditorBase<editor.IStandaloneDiffEditor> {
  /** Diff editor options, merged over the configured `defaultOptions`. */
  readonly options = input<DiffEditorOptions>({});
  readonly originalModel = input.required<DiffEditorModel>();
  readonly modifiedModel = input.required<DiffEditorModel>();

  private readonly mergedOptions = computed<DiffEditorOptions>(() => ({ ...this.config.defaultOptions, ...this.options() }));

  /** Text models created once by this component and updated in place. Monaco doesn't dispose them, so this component does. */
  private textModels: editor.IDiffEditorModel | undefined;

  constructor() {
    super();

    effect(() => this.editor()?.updateOptions(this.mergedOptions()));

    effect(() => {
      const original = this.originalModel();
      const modified = this.modifiedModel();
      const fallbackLanguage = this.mergedOptions().language;
      if (!this.editor() || !this.textModels) {
        return;
      }
      // Update in place: swapping in new models and disposing the old ones breaks diff requests still running in the
      // worker ("no diff result available").
      syncTextModel(this.textModels.original, original, fallbackLanguage);
      syncTextModel(this.textModels.modified, modified, fallbackLanguage);
    });
  }

  protected createEditor(container: HTMLElement): editor.IStandaloneDiffEditor {
    const options = this.mergedOptions();
    const original = this.originalModel();
    const modified = this.modifiedModel();
    this.textModels = {
      original: monaco.editor.createModel(original.code, original.language || options.language),
      modified: monaco.editor.createModel(modified.code, modified.language || options.language),
    };

    const diffEditor = monaco.editor.createDiffEditor(container, options);
    diffEditor.setModel(this.textModels);
    return diffEditor;
  }

  protected override onEditorDisposed(): void {
    this.textModels?.original.dispose();
    this.textModels?.modified.dispose();
    this.textModels = undefined;
  }
}

function syncTextModel(textModel: editor.ITextModel, model: DiffEditorModel, fallbackLanguage: string | undefined): void {
  const language = model.language || fallbackLanguage;
  if (language && textModel.getLanguageId() !== language) {
    monaco.editor.setModelLanguage(textModel, language);
  }
  if (textModel.getValue() !== model.code) {
    textModel.setValue(model.code);
  }
}
