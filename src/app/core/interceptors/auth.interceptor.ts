import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ModalService } from '../../shared/ui/modal/modal.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
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
        // Si otra petición ya refrescó el token mientras esta estaba en vuelo, reintenta directo.
        const currentToken = authService.getAccessToken();
        if (currentToken && currentToken !== token) {
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${currentToken}` } }));
        }

        // refreshSession() comparte un único refresh entre todas las peticiones en cola.
        return authService.refreshSession().pipe(
          switchMap((response) => {
            const clonedReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.accessToken}` },
            });
            return next(clonedReq);
          }),
          catchError(() => throwError(() => error))
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
