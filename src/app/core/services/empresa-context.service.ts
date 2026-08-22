import { Injectable, signal } from '@angular/core';
import { Empresa } from '../../features/private/empresa/services/empresa.service';

/**
 * Empresa validada por el guard de ruta, disponible de forma inmediata para
 * los componentes (evita el breadcrumb vacío mientras llega su propia consulta).
 */
@Injectable({ providedIn: 'root' })
export class EmpresaContextService {
  private readonly _empresa = signal<Empresa | null>(null);
  public readonly empresa = this._empresa.asReadonly();

  setEmpresa(empresa: Empresa | null): void {
    this._empresa.set(empresa);
  }
}
