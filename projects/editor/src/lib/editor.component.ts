import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { BaseEditor } from './base-editor';
import { NgxEditorModel } from './types';

/** Code editor for template-driven and reactive forms (`ngModel`, `formControl`). */
@Component({
  selector: 'ngx-monaco-editor',
  template: '<div class="editor-container" #editorContainer></div>',
  styleUrl: './editor.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
  ],
})
export class EditorComponent extends BaseEditor implements ControlValueAccessor {
  /** Model to edit. Reuses the Monaco model registered for `model.uri`, or creates one. */
  readonly model = input<NgxEditorModel>();

  private value = '';
  private readonly disabled = signal(false);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null | undefined): void {
    this.value = value ?? '';
    const codeEditor = this.editor();
    // A bound model is the source of truth for the content.
    if (codeEditor && !this.modelSource() && codeEditor.getValue() !== this.value) {
      codeEditor.setValue(this.value);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected override currentValue(): string {
    return this.value;
  }

  protected override onValueChange(value: string): void {
    // writeValue() comes back here through Monaco's change event; the form already has that value.
    if (value === this.value) {
      return;
    }
    this.value = value;
    this.onChange(value);
  }

  protected override onBlur(): void {
    this.onTouched();
  }

  protected override isReadOnly(): boolean {
    return this.disabled();
  }

  protected override boundModel(): NgxEditorModel | undefined {
    return this.model();
  }
}
