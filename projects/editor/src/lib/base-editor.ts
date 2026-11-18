import { computed, Directive, effect, input, output, signal } from '@angular/core';
import type { editor } from 'monaco-editor';
import { MonacoEditorBase } from './monaco-editor-base';
import { NgxEditorModel } from './types';

declare const monaco: typeof import('monaco-editor');

/** `monaco.MarkerSeverity.Error`, as a constant so it can be used before Monaco is loaded. */
const MARKER_SEVERITY_ERROR = 8;

type ModelSource = editor.ITextModel | NgxEditorModel;

/** Options, models, value and syntax state shared by the two code editor components. */
@Directive()
export abstract class BaseEditor extends MonacoEditorBase<editor.IStandaloneCodeEditor> {
  /** Editor options, merged over the configured `defaultOptions`. */
  readonly options = input<editor.IStandaloneEditorConstructionOptions>({});

  private readonly _markers = signal<editor.IMarker[]>([]);

  /** All markers (errors, warnings, infos, hints) of the editor's current model. */
  readonly markers = this._markers.asReadonly();

  /** `false` while the current model has error markers. Warnings don't count. */
  readonly isValidSyntax = computed(() => !this._markers().some(isError));

  /** One message per error marker of the current model. */
  readonly syntaxErrors = computed(() => this._markers().filter(isError).map(formatError), { equal: sameStrings });

  /** Emits when `isValidSyntax` changes. */
  readonly isValidSyntaxChange = output<boolean>();

  /** Emits when `syntaxErrors` changes. */
  readonly syntaxErrorsChange = output<string[]>();

  protected readonly mergedOptions = computed(() => ({ ...this.config.defaultOptions, ...this.options() }));

  /** The model to show: a model bound by the subclass, or `options.model`. */
  protected readonly modelSource = computed<ModelSource | null | undefined>(
    () => this.boundModel() ?? this.mergedOptions().model
  );

  private resolved: { source: ModelSource; model: editor.ITextModel } | undefined;

  /** Models created here from an `NgxEditorModel` without `uri`. Nobody else can reach them, so they're disposed here. */
  private readonly ownedModels = new Set<editor.ITextModel>();

  constructor() {
    super();

    effect(() => {
      const codeEditor = this.editor();
      if (!codeEditor) {
        return;
      }
      const { model: _model, ...options } = this.mergedOptions();
      codeEditor.updateOptions({ ...options, readOnly: this.isReadOnly() || !!options.readOnly });

      // `language` belongs to the model, so updateOptions() ignores it. A bound model keeps its own language.
      const textModel = codeEditor.getModel();
      if (!this.modelSource() && options.language && textModel && textModel.getLanguageId() !== options.language) {
        monaco.editor.setModelLanguage(textModel, options.language);
      }
    });

    effect(() => {
      const codeEditor = this.editor();
      const source = this.modelSource();
      if (!codeEditor || !source) {
        return;
      }
      const previous = codeEditor.getModel();
      const textModel = this.resolveModel(source);
      if (previous !== textModel) {
        codeEditor.setModel(textModel);
        this.disposeIfOwned(previous);
      }
    });
  }

  /** The value shown when the editor is created without a model. */
  protected abstract currentValue(): string;

  /** Called when the editor content changes: typing, paste, undo, or `setValue`. */
  protected abstract onValueChange(value: string): void;

  /** Called when the editor loses focus. */
  protected onBlur?(): void;

  /** Forces the editor read-only. Called inside an effect, so signal reads are tracked. */
  protected isReadOnly(): boolean {
    return false;
  }

  /** A model bound through an input of the subclass. Called inside a computed, so signal reads are tracked. */
  protected boundModel(): ModelSource | undefined {
    return undefined;
  }

  protected createEditor(container: HTMLElement): editor.IStandaloneCodeEditor {
    const { model: _model, ...options } = this.mergedOptions();
    const source = this.modelSource();
    const value = this.currentValue();
    const textModel = source ? this.resolveModel(source) : undefined;

    // A supplied model keeps its own content unless a different, non-empty value is bound.
    if (textModel && value && textModel.getValue() !== value) {
      textModel.setValue(value);
    }

    const codeEditor = monaco.editor.create(container, {
      ...options,
      readOnly: this.isReadOnly() || !!options.readOnly,
      ...(textModel ? { model: textModel } : { value }),
    });

    codeEditor.onDidChangeModelContent(() => this.inAngularZone(() => this.onValueChange(codeEditor.getValue())));
    codeEditor.onDidBlurEditorWidget(() => this.inAngularZone(() => this.onBlur?.()));
    codeEditor.onDidChangeModel(() => this.inAngularZone(() => this.updateMarkers(codeEditor)));

    const markersListener = monaco.editor.onDidChangeMarkers(uris => {
      const ownUri = codeEditor.getModel()?.uri.toString();
      if (ownUri && uris.some(uri => uri.toString() === ownUri)) {
        this.inAngularZone(() => this.updateMarkers(codeEditor));
      }
    });
    codeEditor.onDidDispose(() => markersListener.dispose());

    // A reused model may already have markers.
    this.updateMarkers(codeEditor);
    return codeEditor;
  }

  protected override onEditorDisposed(): void {
    for (const textModel of this.ownedModels) {
      textModel.dispose();
    }
    this.ownedModels.clear();
  }

  private resolveModel(source: ModelSource): editor.ITextModel {
    if (this.resolved?.source !== source) {
      this.resolved = { source, model: this.toTextModel(source) };
    }
    return this.resolved.model;
  }

  private toTextModel(source: ModelSource): editor.ITextModel {
    if (isTextModel(source)) {
      return source;
    }
    const existing = source.uri ? monaco.editor.getModel(source.uri) : null;
    if (existing) {
      return existing;
    }
    const created = monaco.editor.createModel(source.value ?? '', source.language, source.uri);
    if (!source.uri) {
      this.ownedModels.add(created);
    }
    return created;
  }

  private disposeIfOwned(textModel: editor.ITextModel | null): void {
    if (textModel && this.ownedModels.delete(textModel)) {
      textModel.dispose();
    }
  }

  private updateMarkers(codeEditor: editor.IStandaloneCodeEditor): void {
    const wasValid = this.isValidSyntax();
    const previousErrors = this.syntaxErrors();
    const textModel = codeEditor.getModel();
    this._markers.set(textModel ? monaco.editor.getModelMarkers({ resource: textModel.uri }) : []);

    if (this.isValidSyntax() !== wasValid) {
      this.isValidSyntaxChange.emit(this.isValidSyntax());
    }
    if (this.syntaxErrors() !== previousErrors) {
      this.syntaxErrorsChange.emit(this.syntaxErrors());
    }
  }
}

function isTextModel(source: ModelSource): source is editor.ITextModel {
  return typeof (source as editor.ITextModel).getValue === 'function';
}

function isError(marker: editor.IMarker): boolean {
  return marker.severity === MARKER_SEVERITY_ERROR;
}

function formatError(marker: editor.IMarker): string {
  return `Error: ${marker.message} at line ${marker.startLineNumber}, column ${marker.startColumn}`;
}

function sameStrings(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
