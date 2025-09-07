import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { provideHttpClient } from '@angular/common/http';

// Inicia a aplicação Angular usando o AppComponent como o componente raiz
// e fornece o HttpClient para que as chamadas à API funcionem.
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient()
  ]
}).catch(err => console.error(err));
