import { Component, Inject, Input, NgZone, model, ModelSignal, effect } from '@angular/core';
import { fromEvent } from 'rxjs';

import { BaseEditor } from './base-editor';
import { NGX_MONACO_EDITOR_CONFIG, NgxMonacoEditorConfig } from './config';

declare const monaco: typeof import('monaco-editor');

@Component({
  standalone: true,
  selector: 'ngx-standalone-monaco-editor',
  template: '<div class="editor-container" #editorContainer></div>',
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
  options: ModelSignal<any> = model<any>('');

  isValidSyntax: ModelSignal<boolean> = model(true);
  syntaxErrors: ModelSignal<string[]> = model<string[]>([]);

  constructor(
    private zone: NgZone,
    @Inject(NGX_MONACO_EDITOR_CONFIG) private editorConfig: NgxMonacoEditorConfig
  ) {
    super(editorConfig);

    effect(() => {
      const val = this.value();
      if (this._editor && !this.options().model && this._editor.getValue() !== val) {
        this._editor.setValue(val);
      }
    });

    effect(() => {
      const val = this.options();
      if (val) {
        this._options = Object.assign({}, this.config.defaultOptions, val);
        if (this._editor) {
          this._editor.dispose();
          this.initMonaco(val);
        }
      }
    });
  }

  protected initMonaco(options: any): void {
    const hasModel = !!options.model;

    if (hasModel) {
      const model = monaco.editor.getModel(options.model.uri || '');
      if (model) {
        options.model = model;
        options.model.setValue(this.value());
      } else {
        options.model = monaco.editor.createModel(options.model.value, options.model.language, options.model.uri);
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

      // value is not propagated to parent when executing outside zone.
      this.zone.run(() => {
        this.value.set(value);
      });
    });

    monaco.editor.onDidChangeMarkers((e: any) => {
      if (!this._editor || !this._editor.getModel()) {
        this.isValidSyntax.update(() => false); // or true, depending on your desired fallback behavior
        this.syntaxErrors.set(['Editor is not initialized.']);
        return;
      }

      const markers: Array<any> = monaco.editor.getModelMarkers({
        resource: this._editor.getModel().uri,
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
