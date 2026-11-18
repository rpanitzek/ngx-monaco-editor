import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, disabled } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import type { editor } from 'monaco-editor';
import {
  DiffEditorComponent,
  DiffEditorModel,
  EditorComponent,
  NgxEditorModel,
  StandaloneEditorComponent,
} from '../../../editor/src/public-api';

declare const monaco: typeof import('monaco-editor');

@Component({
  selector: 'app-root',
  template: `
    <h1>Editor (Valid Syntax {{ isValid }})</h1>
    <button (click)="updateOptions()">Change Language</button>
    <button (click)="code = ''">Set Value To Empty String</button>
    <button (click)="code = null">Set Value To Null</button>
    <button (click)="code = undefined">Set Value To undefined</button>
    <button (click)="showMultiple = !showMultiple">{{ showMultiple ? 'Hide' : 'Show' }} Multiple Editor</button>

    <div style="height: 200px">
      <ngx-monaco-editor [options]="options" [(ngModel)]="code" (isValidSyntaxChange)="isValid = $event"></ngx-monaco-editor>
    </div>

    @if (showMultiple) {
      <div style="height: 200px">
        <ngx-standalone-monaco-editor
          [options]="options"
          [value]="code ?? ''"
          (valueChange)="code = $event"
          (onInit)="onInit($event)"
          (isValidSyntaxChange)="isValid = $event"></ngx-standalone-monaco-editor>
      </div>
    }

    <pre>{{ code | json }}</pre>

    <h1>JSON Model With Schema</h1>
    <p>Schema violations are warnings, so they don't make the syntax invalid. Syntax errors do.</p>
    @if (jsonModel) {
      <ngx-monaco-editor
        [model]="jsonModel"
        [(ngModel)]="json"
        (isValidSyntaxChange)="jsonValid = $event"
        (syntaxErrorsChange)="jsonErrors = $event"></ngx-monaco-editor>
      <p>Valid syntax: {{ jsonValid }}</p>
      <pre>{{ jsonErrors | json }}</pre>
    } @else {
      <p>Click "Show Multiple Editor" to create the JSON model.</p>
    }

    <h1>Signal Forms</h1>
    <button (click)="locked.set(!locked())">{{ locked() ? 'Unlock' : 'Lock' }}</button>
    <ngx-standalone-monaco-editor [options]="options" [formField]="snippetForm.code"></ngx-standalone-monaco-editor>
    <p>
      touched: {{ snippetForm.code().touched() }}, dirty: {{ snippetForm.code().dirty() }}, disabled:
      {{ snippetForm.code().disabled() }}
    </p>
    <pre>{{ snippet() | json }}</pre>

    <h1>Diff Editor</h1>
    <button (click)="updateDiffModel()">Update Models</button>
    <ngx-monaco-diff-editor
      [options]="options"
      [originalModel]="originalModel"
      [modifiedModel]="modifiedModel"
      (onInit)="onInitDiffEditor($event)"></ngx-monaco-diff-editor>
  `,
  imports: [EditorComponent, StandaloneEditorComponent, DiffEditorComponent, FormsModule, FormField, JsonPipe],
})
export class AppComponent implements OnInit {
  editor: editor.IStandaloneCodeEditor | undefined;
  diffEditor: editor.IStandaloneDiffEditor | undefined;
  showMultiple = false;
  toggleLanguage = true;
  options: editor.IStandaloneEditorConstructionOptions = {
    theme: 'vs-dark',
    language: 'html',
  };
  code: string | null | undefined;
  cssCode = `.my-class {
  color: red;
}`;
  jsCode = `function hello() {
	alert('Hello world!');
}`;

  originalModel: DiffEditorModel = {
    code: 'heLLo world!',
    language: 'text/plain',
  };

  modifiedModel: DiffEditorModel = {
    code: 'hello orlando!',
    language: 'text/plain',
  };

  jsonCode = ['{', '    "p1": "v3",', '    "p2": false', '}'].join('\n');
  jsonModel: NgxEditorModel | undefined;
  json = '';
  jsonValid = true;
  jsonErrors: string[] = [];

  isValid = true;

  readonly locked = signal(false);
  readonly snippet = signal({ code: '<p>Edit me</p>' });
  readonly snippetForm = form(this.snippet, path => {
    disabled(path.code, { when: () => this.locked() });
  });

  ngOnInit() {
    this.updateOptions();
  }

  updateOptions() {
    this.toggleLanguage = !this.toggleLanguage;
    if (this.toggleLanguage) {
      this.code = this.cssCode;
      this.options = Object.assign({}, this.options, { language: 'java' });
    } else {
      this.code = this.jsCode;
      this.options = Object.assign({}, this.options, { language: 'javascript' });
    }
  }

  updateDiffModel() {
    this.originalModel = Object.assign({}, this.originalModel, { code: 'abcd' });
    this.modifiedModel = Object.assign({}, this.originalModel, { code: 'ABCD ef' });
  }

  onInit(codeEditor: editor.IStandaloneCodeEditor) {
    this.editor = codeEditor;
    // The schema registered in onMonacoLoad matches this URI.
    this.jsonModel = {
      value: this.jsonCode,
      language: 'json',
      uri: monaco.Uri.parse('a://b/foo.json'),
    };
  }

  onInitDiffEditor(diffEditor: editor.IStandaloneDiffEditor) {
    this.diffEditor = diffEditor;
  }
}
