import { enableProdMode, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { monacoConfig } from './app/app.module';
import { environment } from './environments/environment';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app/app.component';
import { provideMonacoEditor } from '../../editor/src/public-api';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    importProvidersFrom(BrowserModule, FormsModule),
    provideMonacoEditor(monacoConfig),
  ],
}).catch(err => console.error(err));
