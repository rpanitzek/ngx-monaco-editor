# Release notes: @rolandp_86/ngx-monaco-editor

## 23.0.1 (2026-11-18)

Packaging fix, no code changes.

- **README and license:** the npm package now includes `README.md` and `LICENSE`. 23.0.0 was published without them, so its npm page shows no documentation.

## 23.0.0 (2026-11-18)

**Requires:** Angular 22.2+, `@angular/forms` 22.2+, `monaco-editor` ^0.57.0.

This is a major release because it contains breaking API changes. Up to 22.x the major version followed Angular's. 23.x targets Angular 22.

### Highlights

- **Signal-based components:** all three editors are standalone, signal-based components. `MonacoEditorModule` is kept for NgModule apps.
- **Signal Forms support:** `<ngx-standalone-monaco-editor [formField]="form.code" />` binds the value and the disabled, read-only and touched state.
- **Fixed for Monaco 0.57:** the language workers load again, so validation works.
- **Fixed for forms:** forms are no longer marked dirty when data loads.

### Breaking changes

See the README section "Migrating to 23.0.0" for before/after examples.

- **Syntax state:** `isValidSyntax` and `syntaxErrors` are read-only signals with outputs. Replace `[(isValidSyntax)]="valid"` with `(isValidSyntaxChange)="valid = $event"`, and the same for `syntaxErrors`.
- **Only errors count:** warnings, infos and hints no longer make the syntax invalid, and `syntaxErrors` lists only errors. All markers are available through the new `markers` signal.
- **Signal inputs:**
  - **Standalone editor `options`:** an input, no longer a model, so `[(options)]` no longer compiles.
  - **Standalone editor `value`:** a `string` model. Don't bind `null` or `undefined`.
  - **Diff editor models:** `originalModel` and `modifiedModel` are required inputs.
- **Typed configuration:** `onMonacoLoad` receives `monaco`, `defaultOptions` is typed as Monaco editor options, and `NgxEditorModel.uri` is a Monaco `Uri`. `DiffEditorModel.language` is optional.
- **Internal members are gone:** `_editorContainer`, `_editor`, `_options`, `propagateChange`, `onTouched`, `onDidChangeMarkersListener` and `ngOnDestroy()` were removed or made private. Use the new `editor` signal or `(onInit)`.
- **Peer dependencies:** `@angular/forms` is now required; `@angular/common` is no longer needed.

### New features

- **Signal Forms:** `ngx-standalone-monaco-editor` implements `FormValueControl<string>`. It has `disabled` and `readonly` inputs, a `touch` output and `focus()`.
- **Disabled forms:** a disabled form control (`ngModel`, reactive forms) makes `ngx-monaco-editor` read-only.
- **`editor` signal:** the Monaco instance is available as a signal on every editor component.
- **`markers` signal:** all markers of the current model, with severity and position.
- **Optional configuration:** components work without `provideMonacoEditor()` or `MonacoEditorModule.forRoot()`.
- **Preloading:** `ensureMonacoLoaded()` is exported, so Monaco can be loaded before the first editor is shown.
- **`runOutsideAngular`:** an opt-in config option for zone.js apps. It keeps Monaco's DOM events out of change detection.
- **Language changes:** changing `language` in `[options]` now changes the language of the running editor.
- **Server-side rendering:** Monaco is only loaded in the browser, after the first render.

### Bug fixes

- **Workers:** web workers failed with Monaco 0.57 because the library pointed them at `base/worker/workerMain.js`, which no longer exists. Validation and other language features either didn't work or ran on the main thread.
- **Forms dirty on load:** values written by a form were reported back to it, which marked the form dirty while data was loading.
- **Crash without options:** `ngx-monaco-editor` threw when used without `[options]`.
- **Models:**
  - **Lost content:** a model created from `[model]` lost its value, language and URI.
  - **Wiped content:** an existing model's content was replaced with an empty form value.
  - **Leaked models:** models created by the editor were never disposed.
- **Diff editor:**
  - **Leaked models:** every input change created two new models and never disposed the old ones.
  - **Lost defaults:** changing `options` dropped `defaultOptions`.
  - **Mutated inputs:** the editor changed the model objects you passed in.
  - **Console errors:** changing both models at once threw `no diff result available` and `Canceled`.
- **Leak on early destroy:** an editor destroyed while Monaco was still loading was created anyway and never disposed.
- **Stale syntax state:** marker changes of other models no longer recompute it, and it now updates when the editor switches models.
- **Load errors:** a failed load of Monaco's scripts now rejects instead of hanging, and the next editor retries.
- **Settings left alone:** an existing `MonacoEnvironment` is no longer overwritten.

### Other changes

- **Layout:** editors re-lay out whenever their container changes size (split panes, tabs, dialogs), not only on window resize, so `automaticLayout` is no longer needed.
- **Fewer runtime dependencies:** the library no longer uses `rxjs` or `CommonModule`.
- **Assets:** the README recommends copying only `node_modules/monaco-editor/min` (25 MB instead of the whole ~100 MB package).
- **Tooling:**
  - The library tests run on Vitest and jsdom instead of Karma.
  - ESLint reports no problems.
  - The workspace is updated to Angular 22.2.6, Angular CLI 22.2.7, ESLint 10.15, angular-eslint 22.7 and Vitest 5.

### Upgrading

1. **Install the new version:** `npm install @rolandp_86/ngx-monaco-editor@^23`.
2. **Narrow the assets glob:** `{ "glob": "**/*", "input": "node_modules/monaco-editor/min", "output": "assets/monaco-editor/min" }`.
3. **Apply the breaking changes above.** Most apps only need to replace `[(isValidSyntax)]` and `[(syntaxErrors)]` bindings.
4. **Remove layout workarounds:** delayed `layout()` calls and `automaticLayout: true` can go.
