import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of, catchError, map } from 'rxjs';
import { OperacionesService } from '../../features/private/contabilidad/services/operaciones.service';
import { ModalService } from '../../shared/ui/modal/modal.service';
import { NavigationHistoryService } from '../services/navigation-history.service';
import { extraerMensajeError } from '../services/extract-error-message';

/**
 * Valida que la carga (:idCarga) exista antes de activar el detalle de
 * ventas/compras. Si no existe, muestra el mensaje del backend y redirige
 * a la última ruta válida.
 */
export const cargaGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> => {
  const operacionesService = inject(OperacionesService);
  const router = inject(Router);
  const modalService = inject(ModalService);
  const history = inject(NavigationHistoryService);

  const idCarga = route.paramMap.get('idCarga') || '';
  const destinoAnterior = history.anterior(route.url.map((s) => s.path).join('/'));

  return operacionesService.obtenerCargaPorId(idCarga).pipe(
    map(() => true),
    catchError((err) => {
      modalService.open({
        type: 'error',
        title: 'Carga no encontrada',
        message: extraerMensajeError(err, `No se encontró la carga ${idCarga}.`),
        confirmText: 'Volver',
      });
      return of(router.parseUrl(destinoAnterior));
    })
  );
};
