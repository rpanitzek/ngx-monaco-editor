import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DiffEditorComponent, DiffEditorOptions } from './diff-editor.component';
import { FakeMonaco, flush, installFakeMonaco } from './testing/fake-monaco';
import { DiffEditorModel } from './types';

@Component({
  imports: [DiffEditorComponent],
  template: `<ngx-monaco-diff-editor [options]="options()" [originalModel]="original()" [modifiedModel]="modified()" />`,
})
class DiffHostComponent {
  readonly options = signal<DiffEditorOptions>({ language: 'json' });
  readonly original = signal<DiffEditorModel>({ code: 'a' });
  readonly modified = signal<DiffEditorModel>({ code: 'b', language: 'markdown' });
}

describe('DiffEditorComponent', () => {
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

  async function render() {
    const fixture = TestBed.createComponent(DiffHostComponent);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance, diffEditor: fake.diffEditors[0] };
  }

  it('creates the models from the inputs, with options.language as fallback', async () => {
    const { diffEditor } = await render();

    expect(diffEditor.model?.original.getValue()).toBe('a');
    expect(diffEditor.model?.original.getLanguageId()).toBe('json');
    expect(diffEditor.model?.modified.getValue()).toBe('b');
    expect(diffEditor.model?.modified.getLanguageId()).toBe('markdown');
  });

  it('updates its models in place when both inputs change together', async () => {
    const { fixture, host, diffEditor } = await render();
    const { original, modified } = diffEditor.model!;

    host.original.set({ code: 'abcd' });
    host.modified.set({ code: 'ABCD ef', language: 'plaintext' });
    await settle(fixture);

    expect(diffEditor.model?.original).toBe(original);
    expect(diffEditor.model?.modified).toBe(modified);
    expect(original.getValue()).toBe('abcd');
    expect(modified.getValue()).toBe('ABCD ef');
    expect(modified.getLanguageId()).toBe('plaintext');
    expect(fake.editor.createModel).toHaveBeenCalledTimes(2);
    expect(original.disposed || modified.disposed).toBe(false);
  });

  it('passes option changes to the editor', async () => {
    const { fixture, host, diffEditor } = await render();

    host.options.set({ language: 'json', readOnly: true });
    await settle(fixture);

    expect(diffEditor.options['readOnly']).toBe(true);
  });

  it('disposes the editor and its models on destroy', async () => {
    const { fixture, diffEditor } = await render();
    const { original, modified } = diffEditor.model!;

    fixture.destroy();

    expect(diffEditor.disposed).toBe(true);
    expect(original.disposed).toBe(true);
    expect(modified.disposed).toBe(true);
  });
});
