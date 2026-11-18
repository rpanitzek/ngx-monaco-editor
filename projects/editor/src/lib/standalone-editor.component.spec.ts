import { Component, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
