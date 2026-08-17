import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiRegistry } from '../../../../core/config/api.registry';
import { ApiService } from '../../../../core/services/api.service';

export interface TipoCpCatalogo {
  codigo: string;
  nombre: string;
  naturaleza?: string;
  aplicaA?: string;
  signo?: string;
}

export interface TipoDocIdentidadCatalogo {
  codigo: string;
  nombre: string;
  longitudMin?: number;
  longitudMax?: number;
  esRuc?: boolean;
}

export interface EstadoComprobanteCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string;
  afectaIgv: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogoSunatService {
  private http = inject(HttpClient);
  private apiRegistry = inject(ApiRegistry);

  private get api(): ApiService {
    return new ApiService(this.http, this.apiRegistry.get('catalogos'));
  }

  obtenerTiposCp(): Observable<TipoCpCatalogo[]> {
    return this.api.get<TipoCpCatalogo[]>('/tipo-cp');
  }

  obtenerTiposDocIdentidad(): Observable<TipoDocIdentidadCatalogo[]> {
    return this.api.get<TipoDocIdentidadCatalogo[]>('/tipo-doc-identidad');
  }

  obtenerEstadosComprobante(): Observable<EstadoComprobanteCatalogo[]> {
    return this.api.get<EstadoComprobanteCatalogo[]>('/estado-comprobante');
  }
}
