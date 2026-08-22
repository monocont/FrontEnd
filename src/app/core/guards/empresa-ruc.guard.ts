import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of, catchError, map } from 'rxjs';
import { EmpresaService } from '../../features/private/empresa/services/empresa.service';
import { ModalService } from '../../shared/ui/modal/modal.service';
import { NavigationHistoryService } from '../services/navigation-history.service';
import { extraerMensajeError } from '../services/extract-error-message';

/**
 * Valida que el :ruc de la ruta exista (para el usuario autenticado) antes de
 * activar cualquier componente hijo. Si no existe o el backend falla, muestra
 * el mensaje del backend y redirige a la última ruta válida.
 */
export const empresaRucGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> => {
  const empresaService = inject(EmpresaService);
  const router = inject(Router);
  const modalService = inject(ModalService);
  const history = inject(NavigationHistoryService);

  const ruc = route.paramMap.get('ruc') || '';
  const volver = (): UrlTree => {
    const destino = history.anterior(router.getCurrentNavigation()?.finalUrl?.toString() ?? route.url.map((s) => s.path).join('/'));
    modalService.open({
      type: 'error',
      title: 'Empresa no encontrada',
      message: `No se encontró la empresa con RUC ${ruc}.`,
      confirmText: 'Volver',
    });
    return router.parseUrl(destino);
  };

  return empresaService.listar({ ruc, pageSize: 1 }).pipe(
    map((res: any) => {
      const items = res?.items || [];
      return items.length > 0 ? true : volver();
    }),
    catchError((err) => {
      modalService.open({
        type: 'error',
        title: 'Error al validar la empresa',
        message: extraerMensajeError(err, 'No se pudo verificar la empresa.'),
        confirmText: 'Volver',
      });
      return of(router.parseUrl(history.anterior()));
    })
  );
};
