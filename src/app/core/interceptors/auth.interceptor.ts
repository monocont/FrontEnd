import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService, AuthResponse } from '../auth/auth.service';
import { ApiRegistry } from '../config/api.registry';
import { ModalService } from '../../shared/ui/modal/modal.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const apiRegistry = inject(ApiRegistry);
  const modalService = inject(ModalService);
  let token = authService.getAccessToken();

  let requestToForward = req;
  if (token) {
    requestToForward = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(requestToForward).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/federated-login') || req.url.includes('/auth/registro') || req.url.includes('/auth/refresh');
      if (error.status === 401 && !isAuthEndpoint) {
        const baseUrl = apiRegistry.get('seguridad');
        return authService.refreshToken(baseUrl).pipe(
          switchMap((response) => {
            authService.setTokens(response.accessToken);
            const clonedReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.accessToken}` },
            });
            return next(clonedReq);
          }),
          catchError(() => {
            authService.clearSession();
            return throwError(() => error);
          })
        );
      } else if (error.status === 0 || error.status >= 500) {
        modalService.open({
          type: 'error',
          title: 'Error de Conexión',
          message: 'No se pudo conectar con el servidor o el servicio no esta disponible. Por favor, intentelo de nuevo mas tarde.',
          confirmText: 'Entendido'
        });
      }
      return throwError(() => error);
    })
  );
};