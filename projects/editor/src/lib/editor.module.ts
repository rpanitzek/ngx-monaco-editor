import { ModuleWithProviders, NgModule } from '@angular/core';

import { NGX_MONACO_EDITOR_CONFIG, NgxMonacoEditorConfig } from './config';
import { DiffEditorComponent } from './diff-editor.component';
import { EditorComponent } from './editor.component';

/** For NgModule apps. Standalone apps import the components directly and use `provideMonacoEditor()`. */
@NgModule({
  imports: [EditorComponent, DiffEditorComponent],
  exports: [EditorComponent, DiffEditorComponent],
})
export class MonacoEditorModule {
  public static forRoot(config: NgxMonacoEditorConfig = {}): ModuleWithProviders<MonacoEditorModule> {
    return {
      ngModule: MonacoEditorModule,
      providers: [{ provide: NGX_MONACO_EDITOR_CONFIG, useValue: config }],
    };
  }
}
