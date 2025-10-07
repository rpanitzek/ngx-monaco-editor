import { Component, forwardRef, Inject, Input, NgZone, signal, model, ModelSignal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fromEvent } from 'rxjs';

import { BaseEditor } from './base-editor';
import { NGX_MONACO_EDITOR_CONFIG, NgxMonacoEditorConfig } from './config';
import { NgxEditorModel } from './types';

declare const monaco: typeof import('monaco-editor');

@Component({
  standalone: false,
  selector: 'ngx-monaco-editor',
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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
  ],
})
export class EditorComponent extends BaseEditor implements ControlValueAccessor {
  private _value: string = '';

  propagateChange = (_: any) => {};
  onTouched = () => {};

  isValidSyntax: ModelSignal<boolean> = model(true);
  syntaxErrors: ModelSignal<string[]> = model<string[]>([]);

  @Input()
  set options(options: any) {
    this._options = Object.assign({}, this.config.defaultOptions, options);

    if (this._editor) {
      const mergedOptions = Object.assign({}, this.config.defaultOptions, options);

      console.log('change-options', mergedOptions);

      // Update editor dynamically
      this._editor.updateOptions(mergedOptions);

      // You can update language/model separately if needed
      if (options.model && this._editor.getModel() !== options.model) {
        this._editor.setModel(options.model);
      }

      this._options = mergedOptions;
    }else{
      //this.initMonaco(options);
    }
  }

  get options(): any {
    return this._options;
  }

  @Input()
  set model(model: NgxEditorModel) {
    if (!model) return;

    console.log('model', model);

    // If editor exists
    if (this._editor) {
      // Get Monaco model by URI
      let monacoModel = monaco.editor.getModel(model.uri);

      if (!monacoModel) {
        // Create a new Monaco model if it doesn’t exist
        monacoModel = monaco.editor.createModel(
          model.value || '',
          model.language || 'html',
          model.uri
        );
      }

      // Only set if it's a different Monaco model
      if (this._editor.getModel()?.uri.toString() !== monacoModel.uri.toString()) {
        this._editor.setModel(monacoModel);
      }
    } else {
      // Editor not initialized yet
      this.options = {
        ...this.options,
        model: model,
      };
      //this.initMonaco(this.options);
    }
  }

  constructor(
    private zone: NgZone,
    @Inject(NGX_MONACO_EDITOR_CONFIG) private editorConfig: NgxMonacoEditorConfig
  ) {
    super(editorConfig);
  }

  writeValue(value: any): void {
    this._value = value || '';
    // Fix for value change while dispose in process.
    setTimeout(() => {
      if (this._editor && !this.options.model) {
        this._editor.setValue(this._value);
      }
    });
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  protected initMonaco(options: any): void {
    const hasModel = !!options.model;

    if (hasModel && monaco) {
      const model = monaco.editor.getModel(options.model.uri || '');
      if (model) {
        options.model = model;
        options.model.setValue(this._value);
      } else {
        options.model = monaco.editor.createModel(options.model.value, options.model.language, options.model.uri);
      }
    }

    if (this._editorContainer) {
      console.log('Init with options', options);
      this._editor = monaco.editor.create(this._editorContainer.nativeElement, options);
    }

    if (!hasModel) {
      this._editor.setValue(this._value);
    }

    this._editor.onDidChangeModelContent((e: any) => {
      const value = this._editor.getValue();

      // value is not propagated to parent when executing outside zone.
      this.zone.run(() => {
        this.propagateChange(value);
        this._value = value;
      });
    });

    monaco.editor.onDidChangeMarkers((e: any) => {
      if (!this._editor || !this._editor.getModel()) {
        this.isValidSyntax.update(() => false); // or true, depending on your desired fallback behavior
        this.syntaxErrors.set(['Editor is not initialized.']);
        return;
      }

      const markers: Array<any> = monaco.editor.getModelMarkers({ resource: this._editor.getModel().uri });
      this.isValidSyntax.update(current => markers.length === 0);
      this.syntaxErrors.set(
        markers.map(marker => `Error: ${marker.message} at line ${marker.startLineNumber}, column ${marker.startColumn}`)
      );
    });

    this._editor.onDidBlurEditorWidget(() => {
      this.onTouched();
    });

    // refresh layout on resize event.
    if (this._windowResizeSubscription) {
      this._windowResizeSubscription.unsubscribe();
    }
    this._windowResizeSubscription = fromEvent(window, 'resize').subscribe(() => this._editor.layout());
    this.onInit.emit(this._editor);
  }
}
