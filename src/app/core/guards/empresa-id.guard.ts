import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, of, catchError, map } from 'rxjs';
import { EmpresaService } from '../../features/private/empresa/services/empresa.service';
import { ModalService } from '../../shared/ui/modal/modal.service';
import { NavigationHistoryService } from '../services/navigation-history.service';
import { extraerMensajeError } from '../services/extract-error-message';

/**
 * Valida que el :id de edición de empresa exista antes de activar el
 * formulario. Evita que un id inválido muestre un formulario vacío.
 */
export const empresaIdGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> => {
  const empresaService = inject(EmpresaService);
  const router = inject(Router);
  const modalService = inject(ModalService);
  const history = inject(NavigationHistoryService);

  const id = route.paramMap.get('id') || '';
  const destinoAnterior = history.anterior(route.url.map((s) => s.path).join('/'));

  return empresaService.obtenerPorId(id).pipe(
    map(() => true),
    catchError((err) => {
      modalService.open({
        type: 'error',
        title: 'Empresa no encontrada',
        message: extraerMensajeError(err, `No se encontró la empresa ${id}.`),
        confirmText: 'Volver',
      });
      return of(router.parseUrl(destinoAnterior));
    })
  );
};
