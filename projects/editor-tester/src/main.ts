import { enableProdMode, importProvidersFrom } from '@angular/core';
import { monacoConfig } from './app/app.module';
import { environment } from './environments/environment';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'editor';
import { AppComponent } from './app/app.component';
import { NGX_MONACO_EDITOR_CONFIG } from '../../editor/src/lib/config';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [importProvidersFrom(BrowserModule, FormsModule, MonacoEditorModule),
      // manually add the forRoot() providers
      { provide: NGX_MONACO_EDITOR_CONFIG, useValue: monacoConfig },]
})
  .catch(err => console.error(err));
