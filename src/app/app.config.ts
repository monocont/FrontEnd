import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { ApiRegistry, SEGURIDAD_API_URL, EMPRESA_API_URL, CATALOGOS_API_URL, OPERACIONES_API_URL } from './core/config/api.registry';
import { environment } from '../environments/environment';

function initializeAuth(): () => Promise<void> {
  return () => {
    const authService = inject(AuthService);
    return authService.inicializarSesion();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: SEGURIDAD_API_URL, useValue: `${environment.gateway}/${environment.microservicios.seguridad}` },
    { provide: EMPRESA_API_URL, useValue: `${environment.gateway}/${environment.microservicios.empresa}` },
    { provide: CATALOGOS_API_URL, useValue: `${environment.gateway}/${environment.microservicios.catalogos}` },
    { provide: OPERACIONES_API_URL, useValue: `${environment.gateway}/${environment.microservicios.operaciones}` },
    { provide: ApiRegistry },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
};