import { Component, signal, Type, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { disabled, form, FormField } from '@angular/forms/signals';
import { beforeEach, describe, expect, it } from 'vitest';

import { StandaloneEditorComponent } from './standalone-editor.component';
import { FakeMonaco, flush, installFakeMonaco } from './testing/fake-monaco';

@Component({
  imports: [StandaloneEditorComponent],
  template: `<ngx-standalone-monaco-editor [(value)]="code" [readonly]="readonly()" />`,
})
class ValueHostComponent {
  readonly code = signal('a');
  readonly readonly = signal(false);
}

@Component({
  imports: [StandaloneEditorComponent, FormField],
  template: `<ngx-standalone-monaco-editor [formField]="form.code" />`,
})
class FormHostComponent {
  readonly locked = signal(false);
  readonly data = signal({ code: 'x' });
  readonly form = form(this.data, path => {
    disabled(path.code, { when: () => this.locked() });
  });
}

@Component({
  imports: [StandaloneEditorComponent, FormsModule],
  template: `<ngx-standalone-monaco-editor [(ngModel)]="code" required minlength="3" />`,
})
class NgModelHostComponent {
  readonly code = signal('abc');
  readonly ngModel = viewChild.required(NgModel);
}

@Component({
  imports: [StandaloneEditorComponent, ReactiveFormsModule],
  template: `<ngx-standalone-monaco-editor [formControl]="control" />`,
})
class FormControlHostComponent {
  readonly control = new FormControl('x', { nonNullable: true, validators: Validators.required });
}

describe('StandaloneEditorComponent', () => {
  let fake: FakeMonaco;

  beforeEach(() => {
    fake = installFakeMonaco();
  });

  async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await flush();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function render<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance, codeEditor: fake.editors[0] };
  }

  it('syncs [(value)] both ways', async () => {
    const { fixture, host, codeEditor } = await render(ValueHostComponent);
    expect(codeEditor.getValue()).toBe('a');

    codeEditor.type('b');
    expect(host.code()).toBe('b');

    host.code.set('c');
    await settle(fixture);
    expect(codeEditor.getValue()).toBe('c');
  });

  it('makes the editor read-only through the readonly input', async () => {
    const { fixture, host, codeEditor } = await render(ValueHostComponent);

    host.readonly.set(true);
    await settle(fixture);

    expect(codeEditor.options['readOnly']).toBe(true);
  });

  it('works as a Signal Forms control', async () => {
    const { fixture, host, codeEditor } = await render(FormHostComponent);
    expect(codeEditor.getValue()).toBe('x');

    codeEditor.type('typed');
    expect(host.data().code).toBe('typed');
    expect(host.form.code().touched()).toBe(false);

    codeEditor.blur();
    await settle(fixture);
    expect(host.form.code().touched()).toBe(true);

    host.locked.set(true);
    await settle(fixture);
    expect(codeEditor.options['readOnly']).toBe(true);
  });

  // The editor has a `value` model and a `touch` output but no ControlValueAccessor, so ngModel, formControl and
  // formControlName bind to it as a custom control.
  describe('as a classic forms control', () => {
    it('syncs ngModel both ways', async () => {
      const { fixture, host, codeEditor } = await render(NgModelHostComponent);
      expect(codeEditor.getValue()).toBe('abc');

      codeEditor.type('abcd');
      await settle(fixture);
      expect(host.code()).toBe('abcd');

      host.code.set('xyz');
      await settle(fixture);
      expect(codeEditor.getValue()).toBe('xyz');
    });

    // Validator directives reach a custom control without a ControlValueAccessor from Angular 22.3 on.
    it('applies validator directives such as required and minlength', async () => {
      const { fixture, host, codeEditor } = await render(NgModelHostComponent);
      const control = host.ngModel().control;
      expect(control.valid).toBe(true);

      codeEditor.type('');
      await settle(fixture);
      expect(control.errors).toHaveProperty('required');

      codeEditor.type('ab');
      await settle(fixture);
      expect(control.errors).toHaveProperty('minlength');

      codeEditor.type('abc');
      await settle(fixture);
      expect(control.valid).toBe(true);
    });

    it('marks ngModel as touched on blur', async () => {
      const { fixture, host, codeEditor } = await render(NgModelHostComponent);
      expect(host.ngModel().touched).toBe(false);

      codeEditor.blur();
      await settle(fixture);
      expect(host.ngModel().touched).toBe(true);
    });

    it('syncs a FormControl both ways and validates with its validators', async () => {
      const { fixture, host, codeEditor } = await render(FormControlHostComponent);
      expect(codeEditor.getValue()).toBe('x');

      codeEditor.type('typed');
      await settle(fixture);
      expect(host.control.value).toBe('typed');
      expect(host.control.valid).toBe(true);

      codeEditor.type('');
      await settle(fixture);
      expect(host.control.invalid).toBe(true);

      host.control.setValue('set');
      await settle(fixture);
      expect(codeEditor.getValue()).toBe('set');
    });

    it('is read-only while the FormControl is disabled', async () => {
      const { fixture, host, codeEditor } = await render(FormControlHostComponent);

      host.control.disable();
      await settle(fixture);
      expect(codeEditor.options['readOnly']).toBe(true);

      host.control.enable();
      await settle(fixture);
      expect(codeEditor.options['readOnly']).toBe(false);
    });
  });
});
