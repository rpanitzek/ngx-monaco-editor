import { Component, OnInit, signal } from '@angular/core';
import { DiffEditorModel, NgxEditorModel } from 'editor';
import { MonacoEditorModule } from '../../../editor/src/lib/editor.module';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { StandaloneEditorComponent } from '../../../editor/src/lib/standalone-editor.component';

declare var monaco: any;

@Component({
  selector: 'app-root',
  template: `
    <h1>Editor (Valid Syntax {{ isValid }})</h1>
    <button (click)="updateOptions()">Change Language</button>
    <button (click)="code = ''; codeInput = ''">Set Value To Empty String</button>
    <button (click)="code = null; codeInput = null">Set Value To Null</button>
    <button (click)="code = undefined; codeInput = undefined">Set Value To undefined</button>
    <button (click)="showMultiple = !showMultiple">{{ showMultiple ? 'Hide' : 'Show' }} Multiple Editor</button>

    <div style="height: 200px">
      <ngx-standalone-monaco-editor
        style="height: 100%"
        [options]="options"
        [(value)]="code"
        (valueChange)="valueChanged($event)"
        (onInit)="onInit($event)"
      [(isValidSyntax)]="isValid"></ngx-standalone-monaco-editor>
    </div>

    <ngx-monaco-editor
      [options]="options"
      [(ngModel)]="code"
      [(isValidSyntax)]="isValid"></ngx-monaco-editor>

  <!--  @if (showMultiple) {
      <ngx-monaco-editor
        [options]="options"
        [(ngModel)]="code"
      [(isValidSyntax)]="isValid"></ngx-monaco-editor>
    }-->

    <pre>{{ code | json }}</pre>

    <h1>Diff Editor</h1>
    <button (click)="updateDiffModel()">Update Models</button>
    <ngx-monaco-diff-editor
      [options]="options"
      [originalModel]="originalModel"
      [modifiedModel]="modifiedModel"
    (onInit)="onInitDiffEditor($event)"></ngx-monaco-diff-editor>

    <ngx-monaco-editor [options]="options" [model]="model"></ngx-monaco-editor>
    `,
  styles: [],
  standalone: true,
  imports: [MonacoEditorModule, StandaloneEditorComponent, FormsModule, JsonPipe],
})
export class AppComponent implements OnInit {
  codeInput: string | null | undefined = 'Sample Code';
  editor: any;
  diffEditor: any;
  showMultiple = false;
  toggleLanguage = true;
  options = {
    theme: 'vs-dark',
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

  model: NgxEditorModel = {
    value: this.jsonCode,
    language: 'json',
  };

  isValid = false;

  ngOnInit() {
    this.updateOptions();
  }

  valueChanged(event: string): void {
    //console.log('valueChanged', event);
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

  onInit(editor: any) {
    this.editor = editor;
    console.log(editor);
    this.model = {
      value: this.jsonCode,
      language: 'json',
      uri: monaco.Uri.parse('a://b/foo.json'),
    };
    // let line = editor.getPosition();
    // let range = new monaco.Range(line.lineNumber, 1, line.lineNumber, 1);
    // let id = { major: 1, minor: 1 };
    // let text = 'FOO';
    // let op = { identifier: id, range: range, text: text, forceMoveMarkers: true };
    // editor.executeEdits("my-source", [op]);
  }

  onInitDiffEditor(editor: any) {
    this.diffEditor = editor;
    console.log(editor);
  }
}
