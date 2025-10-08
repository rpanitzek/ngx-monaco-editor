import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, OnDestroy, Output, ViewChild } from '@angular/core';
import { NGX_MONACO_EDITOR_CONFIG, NgxMonacoEditorConfig } from './config';
import { Subscription } from 'rxjs';
import type { editor } from 'monaco-editor';
import { ensureMonacoLoaded } from './monaco-loader';

@Component({
  template: '',
  standalone: false,
})
export abstract class BaseDiffEditor implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) _editorContainer: ElementRef | undefined;
  @Output() onInit = new EventEmitter<any>();

  protected _editor!: editor.IDiffEditor;
  protected _options: editor.IStandaloneDiffEditorConstructionOptions | undefined;
  protected _windowResizeSubscription: Subscription | undefined;

  protected constructor(@Inject(NGX_MONACO_EDITOR_CONFIG) protected config: NgxMonacoEditorConfig) {}

  ngAfterViewInit(): void {
    ensureMonacoLoaded(this.config).then(() => {
      this.initMonaco(this._options!);
    });
  }

  protected abstract initMonaco(options: editor.IStandaloneDiffEditorConstructionOptions): void;

  ngOnDestroy() {
    if (this._windowResizeSubscription) {
      this._windowResizeSubscription.unsubscribe();
    }
    if (this._editor) {
      this._editor.dispose();
    }
  }
}
