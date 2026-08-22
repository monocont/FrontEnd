import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of, catchError, map } from 'rxjs';
import { EmpresaService } from '../../features/private/empresa/services/empresa.service';
import { ModalService } from '../../shared/ui/modal/modal.service';
import { NavigationHistoryService } from '../services/navigation-history.service';
import { extraerMensajeError } from '../services/extract-error-message';
import { EmpresaContextService } from '../services/empresa-context.service';

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
  const empresaContext = inject(EmpresaContextService);

  const idEmpresa = route.paramMap.get('idEmpresa') || '';
  const volver = (): UrlTree => {
    const destino = history.anterior(router.getCurrentNavigation()?.finalUrl?.toString() ?? route.url.map((s) => s.path).join('/'));
    modalService.open({
      type: 'error',
      title: 'Empresa no encontrada',
      message: `No se encontró la empresa o no tiene acceso a ella.`,
      confirmText: 'Volver',
    });
    return router.parseUrl(destino);
  };

  return empresaService.obtenerPorId(idEmpresa).pipe(
    map((empresa) => {
      empresaContext.setEmpresa(empresa ?? null);
      return true;
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
