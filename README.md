# ngx-monaco-editor

The [Monaco Editor](https://github.com/microsoft/monaco-editor) as Angular components: a code editor for forms (`ngModel`, `formControl`), a signal-based code editor that works with Signal Forms, and a diff editor.

| `@rolandp_86/ngx-monaco-editor` | Angular | `monaco-editor` |
| ------------------------------- | ------- | --------------- |
| 23.x                            | 22.x    | ^0.57.0         |
| 22.x                            | 22.x    | ^0.57.0         |

Up to 22.x, the package version followed the Angular major version. 23.0.0 breaks that rule because it contains breaking API changes for Angular 22 (see [Migrating to 23.0.0](#migrating-to-2300)).

## Installation

```bash
npm install @rolandp_86/ngx-monaco-editor monaco-editor
```

Monaco is loaded at runtime from your app's assets, not bundled. Copy its `min` build in `angular.json` (`projects.<app>.architect.build.options.assets`):

```json
{ "glob": "**/*", "input": "node_modules/monaco-editor/min", "output": "assets/monaco-editor/min" }
```

Copy only `min`: the full package is about 100 MB, of which only the 25 MB in `min` are loaded.

## Setup

Configuration is optional. In a standalone app:

```ts
import { provideMonacoEditor } from '@rolandp_86/ngx-monaco-editor';

bootstrapApplication(AppComponent, {
  providers: [provideMonacoEditor({ defaultOptions: { scrollBeyondLastLine: false } })],
});
```

In an NgModule app, import `MonacoEditorModule.forRoot(config)` once in the root module and `MonacoEditorModule` in feature modules.

## Code editor for forms: `ngx-monaco-editor`

`EditorComponent` is a `ControlValueAccessor`, so it works with `ngModel` and reactive forms. A disabled control makes the editor read-only.

```ts
import { EditorComponent } from '@rolandp_86/ngx-monaco-editor';

@Component({
  imports: [EditorComponent, FormsModule],
  template: `<ngx-monaco-editor [options]="options" [(ngModel)]="code" (isValidSyntaxChange)="valid = $event" />`,
})
export class CodeComponent {
  options = { theme: 'vs-dark', language: 'javascript' };
  code = 'function x() {\n  console.log("Hello world!");\n}';
  valid = true;
}
```

To edit a specific Monaco model, bind `[model]` to an `NgxEditorModel` (`{ value, language?, uri? }`). If a Monaco model with that `uri` already exists, the editor reuses it and keeps its content; otherwise it creates one. Models created without a `uri` are disposed by the editor when they're replaced or the editor is destroyed. Models with a `uri` are left alone, so they keep their content and undo history across editor instances.

## Signal-based code editor: `ngx-standalone-monaco-editor`

`StandaloneEditorComponent` has a `value` model signal:

```html
<ngx-standalone-monaco-editor [options]="options" [(value)]="code" />
```

It's also a Signal Forms control (`FormValueControl<string>`), so `[formField]` binds the value and the disabled, read-only and touched state:

```ts
import { form, FormField } from '@angular/forms/signals';
import { StandaloneEditorComponent } from '@rolandp_86/ngx-monaco-editor';

@Component({
  imports: [StandaloneEditorComponent, FormField],
  template: `<ngx-standalone-monaco-editor [options]="options" [formField]="snippetForm.code" />`,
})
export class SnippetComponent {
  options = { language: 'html' };
  snippet = signal({ code: '<p>Hello</p>' });
  snippetForm = form(this.snippet);
}
```

## Diff editor: `ngx-monaco-diff-editor`

```ts
import { DiffEditorComponent, DiffEditorModel } from '@rolandp_86/ngx-monaco-editor';

@Component({
  imports: [DiffEditorComponent],
  template: `<ngx-monaco-diff-editor [options]="options" [originalModel]="original" [modifiedModel]="modified" />`,
})
export class DiffComponent {
  options = { theme: 'vs-dark', language: 'json' };
  original: DiffEditorModel = { code: '{ "a": 1 }' };
  modified: DiffEditorModel = { code: '{ "a": 2 }' };
}
```

`options.language` is the fallback for models without a `language`. When the models change, the editor updates its text models in place, so pending diff computations aren't cut off.

## API

### All editors

| Member    | Kind   | Description                                                                                                                               |
| --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `options` | input  | Monaco options, merged over the configured `defaultOptions`. Changes are applied to the running editor, including `language` and `theme`. |
| `onInit`  | output | Emits the Monaco editor instance once it's created.                                                                                       |
| `editor`  | signal | The Monaco editor instance, `undefined` until it's created.                                                                               |

### Code editors (`ngx-monaco-editor`, `ngx-standalone-monaco-editor`)

| Member                 | Kind   | Description                                                                               |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `isValidSyntax`        | signal | `false` while the current model has error markers. Warnings, infos and hints don't count. |
| `syntaxErrors`         | signal | One message per error marker, for example `Error: Unexpected token at line 2, column 3`.  |
| `markers`              | signal | All markers of the current model, with their severity and position.                       |
| `isValidSyntaxChange`  | output | Emits when `isValidSyntax` changes.                                                       |
| `syntaxErrorsChange`   | output | Emits when `syntaxErrors` changes.                                                        |
| `model`                | input  | `ngx-monaco-editor` only. An `NgxEditorModel` to edit (see above).                        |
| `value`                | model  | `ngx-standalone-monaco-editor` only. The content.                                         |
| `disabled`, `readonly` | input  | `ngx-standalone-monaco-editor` only. Make the editor read-only. Bound by `[formField]`.   |
| `touch`                | output | `ngx-standalone-monaco-editor` only. Emits on blur. Used by `[formField]`.                |
| `focus()`              | method | `ngx-standalone-monaco-editor` only. Focuses the editor.                                  |

### Diff editor

| Member                           | Kind           | Description                                |
| -------------------------------- | -------------- | ------------------------------------------ |
| `originalModel`, `modifiedModel` | required input | `DiffEditorModel` (`{ code, language? }`). |

## Configuration

`provideMonacoEditor(config)` and `MonacoEditorModule.forRoot(config)` accept an `NgxMonacoEditorConfig`:

| Option                 | Description                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`              | Folder that contains `monaco-editor/min/vs`. Default: `./assets`.                                                                                                                                                                             |
| `defaultOptions`       | Options merged under every editor's `options`.                                                                                                                                                                                                |
| `onMonacoLoad(monaco)` | Runs once after Monaco has loaded, before the first editor is created. Register languages, themes and providers here.                                                                                                                         |
| `runOutsideAngular`    | zone.js apps only: creates editors outside the Angular zone, so Monaco's many DOM events don't trigger change detection. Value changes and outputs still re-enter the zone, but callbacks you register on the editor yourself run outside it. |

### Example: JSON schemas

```ts
import { Monaco, provideMonacoEditor } from '@rolandp_86/ngx-monaco-editor';

function onMonacoLoad(monaco: Monaco) {
  monaco.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [
      {
        uri: 'http://myserver/foo-schema.json',
        fileMatch: ['a://b/foo.json'],
        schema: { type: 'object', properties: { p1: { enum: ['v1', 'v2'] } } },
      },
    ],
  });
}

provideMonacoEditor({ onMonacoLoad });
```

Then bind an editor to a model with that URI: `[model]="{ value: json, language: 'json', uri: monaco.Uri.parse('a://b/foo.json') }"`. Create the `Uri` after Monaco has loaded, for example in `(onInit)`.

### Preloading

Monaco loads when the first editor is rendered. To load it earlier, for example while the user is still on another page, call `ensureMonacoLoaded()`. It resolves with the global `monaco` and is safe to call repeatedly.

## Styling

The host element is `display: block` with a default height of 200px, and the editor fills the inner `.editor-container`. Size the host to resize the editor:

```css
ngx-monaco-editor {
  height: 100%;
}
```

The editor re-lays out whenever its container changes size, including editors that start hidden in tabs or dialogs, so the `automaticLayout` option isn't needed.

## Migrating to 23.0.0

- **`isValidSyntax` and `syntaxErrors` are read-only signals with outputs.** Replace `[(isValidSyntax)]="valid"` with `(isValidSyntaxChange)="valid = $event"`, and the same for `syntaxErrors`.
- **Only errors make the syntax invalid.** Warnings no longer set `isValidSyntax` to `false`, and `syntaxErrors` only lists errors. Use `markers` for warnings.
- **Inputs are signals.** `options` of `ngx-standalone-monaco-editor` is an input, not a model: `[(options)]` no longer compiles. The diff editor's `originalModel` and `modifiedModel` are required inputs.
- **`value` of `ngx-standalone-monaco-editor` is a `string` model.** Don't bind `null` or `undefined`.
- **Internal members are private.** `_editorContainer`, `_editor`, `_options`, `propagateChange`, `onTouched`, `onDidChangeMarkersListener` and `ngOnDestroy()` are gone. Use the `editor` signal or `(onInit)` for the Monaco instance.
- **`onMonacoLoad` receives `monaco`**, and `defaultOptions` is typed as Monaco editor options. `NgxEditorModel.uri` is a Monaco `Uri`.
- **The config provider is optional.** Without `provideMonacoEditor()` or `forRoot()`, the defaults apply.
- **`@angular/forms` is a peer dependency.**

## Links

- [Release notes](https://github.com/rpanitzek/ngx-monaco-editor/blob/master/docs/release-notes.md)
- [Monaco Editor](https://github.com/microsoft/monaco-editor/)
- [Monaco Editor options](https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html)

## License

MIT © [Atul Kumar](https://github.com/atularen)
