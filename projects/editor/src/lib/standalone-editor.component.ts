import { booleanAttribute, Component, effect, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { BaseEditor } from './base-editor';

/** Signal-based code editor. Bind `[(value)]`, or a Signal Forms field with `[formField]`. */
@Component({
  selector: 'ngx-standalone-monaco-editor',
  template: '<div class="editor-container" #editorContainer></div>',
  styleUrl: './editor.css',
})
export class StandaloneEditorComponent extends BaseEditor implements FormValueControl<string> {
  /** The editor content. Ignored while a model is supplied through `options.model`. */
  readonly value = model('');

  /** Makes the editor read-only. Bound automatically by `[formField]`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Makes the editor read-only. Bound automatically by `[formField]`. */
  readonly readonly = input(false, { transform: booleanAttribute });

  /** Emits when the editor loses focus, which marks a `[formField]` as touched. */
  readonly touch = output<void>();

  constructor() {
    super();

    effect(() => {
      const value = this.value() ?? '';
      const codeEditor = this.editor();
      if (codeEditor && !this.modelSource() && codeEditor.getValue() !== value) {
        codeEditor.setValue(value);
      }
    });
  }

  /** Focuses the editor. Signal Forms calls this, for example to focus the first invalid field. */
  focus(): void {
    this.editor()?.focus();
  }

  protected override currentValue(): string {
    return this.value() ?? '';
  }

  protected override onValueChange(value: string): void {
    this.value.set(value);
  }

  protected override onBlur(): void {
    this.touch.emit();
  }

  protected override isReadOnly(): boolean {
    return this.disabled() || this.readonly();
  }
}
