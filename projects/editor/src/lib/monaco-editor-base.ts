import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  NgZone,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { editor } from 'monaco-editor';
import { NGX_MONACO_EDITOR_CONFIG } from './config';
import { ensureMonacoLoaded } from './monaco-loader';

/** Lifecycle shared by all editor components: load Monaco after the first render, create, lay out, dispose. */
@Directive()
export abstract class MonacoEditorBase<TEditor extends editor.IEditor> {
  protected readonly config = inject(NGX_MONACO_EDITOR_CONFIG);
  protected readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('editorContainer');
  private readonly _editor = signal<TEditor | undefined>(undefined);

  /** The Monaco editor instance, once it has been created. */
  readonly editor = this._editor.asReadonly();

  /** Emits the Monaco editor instance once it has been created. */
  readonly onInit = output<TEditor>();

  constructor() {
    // afterNextRender only runs in the browser, so nothing touches `window` during server-side rendering.
    afterNextRender(() => {
      ensureMonacoLoaded(this.config).then(() => {
        if (this.destroyRef.destroyed) {
          return;
        }
        const init = () => this.initEditor(this.container().nativeElement);
        // afterNextRender callbacks run outside the Angular zone: enter it unless the app opted out.
        if (this.config.runOutsideAngular) {
          this.ngZone.runOutsideAngular(init);
        } else {
          this.ngZone.run(init);
        }
      });
    });
  }

  protected abstract createEditor(container: HTMLElement): TEditor;

  /** Called after the editor has been disposed. */
  protected onEditorDisposed?(): void;

  /** Runs `fn` in the Angular zone, so changes made from Monaco callbacks reach change detection in zone.js apps. */
  protected inAngularZone(fn: () => void): void {
    if (NgZone.isInAngularZone()) {
      fn();
    } else {
      this.ngZone.run(fn);
    }
  }

  private initEditor(container: HTMLElement): void {
    const monacoEditor = this.createEditor(container);

    // Re-layout whenever the container changes size (window resize, split panes, tabs, dialogs).
    const resizeObserver = new ResizeObserver(() => monacoEditor.layout());
    resizeObserver.observe(container);

    this.destroyRef.onDestroy(() => {
      resizeObserver.disconnect();
      monacoEditor.dispose();
      this.onEditorDisposed?.();
    });

    this._editor.set(monacoEditor);
    this.inAngularZone(() => this.onInit.emit(monacoEditor));
  }
}
