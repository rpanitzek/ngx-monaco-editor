import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

export const NGX_MONACO_EDITOR_CONFIG = new InjectionToken<NgxMonacoEditorConfig>('NGX_MONACO_EDITOR_CONFIG');

export interface NgxMonacoEditorConfig {
  baseUrl?: string;
  defaultOptions?: Record<string, any>;
  onMonacoLoad?: Function;
}

export function provideMonacoEditor(config: NgxMonacoEditorConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: NGX_MONACO_EDITOR_CONFIG, useValue: config }]);
}
