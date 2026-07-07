import { Component, Inject, model, ModelSignal, effect, ChangeDetectionStrategy } from '@angular/core';
import { fromEvent } from 'rxjs';

import { BaseEditor } from './base-editor';
import { NGX_MONACO_EDITOR_CONFIG, NgxMonacoEditorConfig } from './config';
import { type editor, IDisposable } from 'monaco-editor';

declare const monaco: typeof import('monaco-editor');

@Component({
  standalone: true,
  selector: 'ngx-standalone-monaco-editor',
  template: '<div class="editor-container" #editorContainer></div>',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      :host {
        display: block;
        height: 200px;
      }

      .editor-container {
        width: 100%;
        height: 98%;
      }
    `,
  ],
})
export class StandaloneEditorComponent extends BaseEditor {
  value: ModelSignal<any> = model<any>('');
  options: ModelSignal<editor.IStandaloneEditorConstructionOptions> = model<editor.IStandaloneEditorConstructionOptions>({});

  isValidSyntax: ModelSignal<boolean> = model(true);
  syntaxErrors: ModelSignal<string[]> = model<string[]>([]);

  onDidChangeMarkersListener: IDisposable | undefined;

  constructor(@Inject(NGX_MONACO_EDITOR_CONFIG) private editorConfig: NgxMonacoEditorConfig) {
    super(editorConfig);

    effect(() => {
      const val = this.value();
      if (this._editor && !this.options().model && this._editor.getValue() !== val) {
        this._editor.setValue(val ?? '');
      }
    });

    effect(() => {
      const options = this.options();
      if (options) {
        this._options = Object.assign({}, this.config.defaultOptions, options);
        if (this._editor) {
          const mergedOptions = Object.assign({}, this.config.defaultOptions, options);

          this._editor.updateOptions(mergedOptions);

          // You can update language/model separately if needed
          if (options.model && this._editor.getModel() !== options.model) {
            this._editor.setModel(options.model);
          }
        }
      }
    });
  }

  override ngOnDestroy() {
    if (this.onDidChangeMarkersListener) {
      this.onDidChangeMarkersListener.dispose();
    }
    super.ngOnDestroy();
  }

  protected initMonaco(options: editor.IStandaloneEditorConstructionOptions): void {
    const hasModel = !!options.model;

    if (hasModel && monaco) {
      const providedModel = options.model;
      if (providedModel && providedModel.uri) {
        const model = monaco.editor.getModel(providedModel.uri);

        if (model) {
          options.model = model;
          options.model.setValue(this.value());
        } else {
          options.model = monaco.editor.createModel(model ?? '');
        }
      }
    }

    if (this._editorContainer) {
      this._editor = monaco.editor.create(this._editorContainer.nativeElement, options);
    }

    if (!hasModel) {
      this._editor.setValue(this.value());
    }

    this._editor.onDidChangeModelContent((e: any) => {
      const value = this._editor.getValue();
      this.value.set(value);
    });

    this.onDidChangeMarkersListener = monaco.editor.onDidChangeMarkers((e: any) => {
      if (!this._editor || !this._editor.getModel()) {
        this.isValidSyntax.update(() => false); // or true, depending on your desired fallback behavior
        this.syntaxErrors.set(['Editor is not initialized.']);
        return;
      }

      const markers: any[] = monaco.editor.getModelMarkers({
        resource: this._editor.getModel()!.uri,
      });
      this.isValidSyntax.update(current => markers.length === 0);
      this.syntaxErrors.set(
        markers.map(marker => `Error: ${marker.message} at line ${marker.startLineNumber}, column ${marker.startColumn}`)
      );
    });

    this._editor.onDidBlurEditorWidget(() => {
      //this.onTouched();
    });

    // refresh layout on resize event.
    if (this._windowResizeSubscription) {
      this._windowResizeSubscription.unsubscribe();
    }
    this._windowResizeSubscription = fromEvent(window, 'resize').subscribe(() => this._editor.layout());

    this.onInit.emit(this._editor);
  }
}
