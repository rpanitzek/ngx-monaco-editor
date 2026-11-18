import { Component, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import type { editor } from 'monaco-editor';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideMonacoEditor } from './config';
import { EditorComponent } from './editor.component';
import { FakeMonaco, flush, installFakeMonaco } from './testing/fake-monaco';
import { NgxEditorModel } from './types';

@Component({
  imports: [EditorComponent, FormsModule],
  template: `<ngx-monaco-editor
    [options]="options()"
    [(ngModel)]="code"
    (ngModelChange)="changes.set(changes() + 1)"
    [disabled]="disabled()"
    (isValidSyntaxChange)="valid.set($event)"
    (syntaxErrorsChange)="errors.set($event)" />`,
})
class HostComponent {
  readonly options = signal<editor.IStandaloneEditorConstructionOptions>({ language: 'json' });
  readonly code = signal('hello');
  readonly changes = signal(0);
  readonly disabled = signal(false);
  readonly valid = signal<boolean | undefined>(undefined);
  readonly errors = signal<string[]>([]);
}

@Component({
  imports: [EditorComponent, FormsModule],
  template: `<ngx-monaco-editor [model]="model()" [(ngModel)]="code" />`,
})
class ModelHostComponent {
  readonly model = signal<NgxEditorModel>({ value: '{}', language: 'json' });
  readonly code = signal('');
}

describe('EditorComponent', () => {
  let fake: FakeMonaco;

  beforeEach(() => {
    fake = installFakeMonaco();
    TestBed.configureTestingModule({ providers: [provideMonacoEditor({ defaultOptions: { tabSize: 2 } })] });
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

  it('creates the editor with the form value and the merged options', async () => {
    const { codeEditor } = await render(HostComponent);

    expect(fake.editor.create).toHaveBeenCalledTimes(1);
    expect(codeEditor.getValue()).toBe('hello');
    expect(codeEditor.options).toMatchObject({ tabSize: 2, language: 'json', readOnly: false });
  });

  it('does not report values written by the form back to it', async () => {
    const { fixture, host, codeEditor } = await render(HostComponent);

    host.code.set('from the form');
    await settle(fixture);
    expect(codeEditor.getValue()).toBe('from the form');
    expect(host.changes()).toBe(0);

    codeEditor.type('typed');
    expect(host.code()).toBe('typed');
    expect(host.changes()).toBe(1);
  });

  it('makes the editor read-only while the form control is disabled', async () => {
    const { fixture, host, codeEditor } = await render(HostComponent);

    host.disabled.set(true);
    await settle(fixture);
    expect(codeEditor.options['readOnly']).toBe(true);

    host.disabled.set(false);
    await settle(fixture);
    expect(codeEditor.options['readOnly']).toBe(false);
  });

  it('applies a language change from the options to the model', async () => {
    const { fixture, host, codeEditor } = await render(HostComponent);

    host.options.set({ language: 'javascript' });
    await settle(fixture);

    expect(codeEditor.getModel()?.getLanguageId()).toBe('javascript');
  });

  it('counts only error markers of its own model as invalid syntax', async () => {
    const { host, codeEditor } = await render(HostComponent);
    const model = codeEditor.getModel()!;

    fake.setMarkers(model, [{ severity: 4, message: 'Just a warning', startLineNumber: 1, startColumn: 1 }]);
    expect(host.valid()).toBeUndefined();

    fake.setMarkers(model, [{ severity: 8, message: 'Unexpected token', startLineNumber: 2, startColumn: 3 }]);
    expect(host.valid()).toBe(false);
    expect(host.errors()).toEqual(['Error: Unexpected token at line 2, column 3']);

    fake.setMarkers(fake.editor.createModel('other'), []);
    expect(host.valid()).toBe(false);

    fake.setMarkers(model, []);
    expect(host.valid()).toBe(true);
    expect(host.errors()).toEqual([]);
  });

  it('creates the editor once Monaco is available after the first render', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();

    expect(fake.editor.create).toHaveBeenCalledTimes(1);
  });

  it('creates no editor when destroyed before Monaco has loaded', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.destroy();
    await flush();

    expect(fake.editor.create).not.toHaveBeenCalled();
  });

  it('disposes the editor and its marker listener on destroy', async () => {
    const { fixture, codeEditor } = await render(HostComponent);
    expect(fake.markerListenerCount).toBe(1);

    fixture.destroy();

    expect(codeEditor.disposed).toBe(true);
    expect(fake.markerListenerCount).toBe(0);
  });

  it('shows a bound model, reuses models by URI and disposes the models it created', async () => {
    const { fixture, host, codeEditor } = await render(ModelHostComponent);
    const first = codeEditor.getModel()!;
    expect(first.getValue()).toBe('{}');
    expect(first.getLanguageId()).toBe('json');

    host.model.set({ value: '[]' });
    await settle(fixture);
    const second = codeEditor.getModel()!;
    expect(second).not.toBe(first);
    expect(second.getValue()).toBe('[]');
    expect(first.disposed).toBe(true);

    const registered = fake.editor.createModel('registered', 'json', fake.Uri.parse('file:///a.json'));
    host.model.set({ value: 'ignored', uri: fake.Uri.parse('file:///a.json') as any });
    await settle(fixture);
    expect(codeEditor.getModel()).toBe(registered);
    expect(registered.getValue()).toBe('registered');
    expect(second.disposed).toBe(true);

    fixture.destroy();
    expect(registered.disposed).toBe(false);
  });
});
