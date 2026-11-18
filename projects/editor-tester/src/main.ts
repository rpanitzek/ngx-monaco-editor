import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { monacoConfig } from './app/app.module';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { provideMonacoEditor } from '../../editor/src/public-api';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideMonacoEditor(monacoConfig)],
}).catch(err => console.error(err));
