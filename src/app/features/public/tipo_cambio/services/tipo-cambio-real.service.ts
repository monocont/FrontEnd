import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiRegistry } from '../../../../core/config/api.registry';
import { ApiService } from '../../../../core/services/api.service';

export interface TipoCambioDiario {
  codigoMonedaOrigen: string;
  codigoMonedaDestino: string;
  fecha: string;
  precioCompra: number;
  precioVenta: number;
}

export interface TipoCambioEntry {
  fecha: string;
  compra: number;
  venta: number;
}

@Injectable({ providedIn: 'root' })
export class TipoCambioRealService {
  private http = inject(HttpClient);
  private apiRegistry = inject(ApiRegistry);

  private get api(): ApiService {
    return new ApiService(this.http, this.apiRegistry.get('catalogos'));
  }

  insertarSiNoExiste(): Observable<boolean> {
    return this.api.post<boolean>('/tipo-cambio/diario', {});
  }

  obtenerPorFecha(codigoMonedaOrigen: string, fecha: string): Observable<TipoCambioDiario> {
    const params = new HttpParams()
      .set('codigoMonedaOrigen', codigoMonedaOrigen)
      .set('fecha', fecha);
    return this.api.get<TipoCambioDiario>('/tipo-cambio', params);
  }

  insertarMasivo(anio: number, mes: number): Observable<boolean> {
    return this.api.post<boolean>(`/tipo-cambio/masivo?anio=${anio}&mes=${mes}`, {});
  }

  obtenerPorMes(mes: number, anio: number): Observable<TipoCambioDiario[]> {
    const params = new HttpParams()
      .set('monedaOrigen', 'USD')
      .set('mes', mes)
      .set('anio', anio);
    return this.api.get<TipoCambioDiario[]>('/tipo-cambio/por-mes', params);
  }
}
