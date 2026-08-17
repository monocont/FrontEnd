import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiRegistry } from '../../../../core/config/api.registry';

export interface CargarArchivoSunatDTO {
  idCarga: string;
  empresaRuc: string;
  periodo: string;
  tipoArchivo: string;
  formato: string;
  nombreOriginal: string;
  estado: string;
  numRegistros: number;
  numRegistrosValidos: number;
  numRegistrosError: number;
  observaciones?: string;
}

export interface ArchivoCargaItem {
  idCarga: string;
  empresaRuc: string;
  periodo: string;
  tipoArchivo: string;
  formato: string;
  nombreOriginal: string;
  numRegistros: number;
  numRegistrosValidos: number;
  numRegistrosError: number;
  numObservaciones: number;
  estado: string;
  observaciones?: string;
  creadoPor?: string;
  fechaCreacion: string;
}

export interface ArchivoCargaErrorItem {
  idError: string;
  idCarga: string;
  numeroLinea: number;
  tipoError: string;
  campoError?: string;
  valorLectura?: string;
  mensaje: string;
  severidad: string;
  fechaRegistro: string;
}

export interface CompraItem {
  idCompra: string;
  carSunat: string;
  codigoTipoCp: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  codigoTipoDocIdentidad: string;
  nroDocIdentidad: string;
  razonSocial: string;
  biGravadoDg: number;
  igvIpmDg: number;
  totalCp: number;
  codigoMoneda: string;
  tipoCambio: number;
  codigoEstadoComprobante: string;
}

export interface VentaItem {
  idVenta: string;
  carSunat: string;
  codigoTipoCp: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  codigoTipoDocIdentidad: string;
  nroDocIdentidad: string;
  razonSocial: string;
  biGravada: number;
  igvIpm: number;
  totalCp: number;
  codigoMoneda: string;
  tipoCambio: number;
  codigoEstadoComprobante: string;
  codigoTipoNota?: string;
  tipoOperacion?: string;
  camposLibres?: string;
}

@Injectable({ providedIn: 'root' })
export class OperacionesService {
  private http = inject(HttpClient);
  private apiRegistry = inject(ApiRegistry);

  private get baseUrl(): string {
    return this.apiRegistry.get('operaciones');
  }

  private extractData<T>(response: any): T {
    if (response && typeof response === 'object') {
      if ('data' in response) return response.data as T;
      if ('Data' in response) return response.Data as T;
    }
    return response as T;
  }

  cargarCompras(empresaRuc: string, periodo: string, file: File): Observable<CargarArchivoSunatDTO> {
    const formData = new FormData();
    formData.append('EmpresaRuc', empresaRuc);
    formData.append('Periodo', periodo);
    formData.append('Archivo', file, file.name);

    return this.http
      .post<any>(`${this.baseUrl}/cargas/compras`, formData, { withCredentials: true })
      .pipe(map(res => this.extractData<CargarArchivoSunatDTO>(res)));
  }

  cargarVentas(empresaRuc: string, periodo: string, file: File): Observable<CargarArchivoSunatDTO> {
    const formData = new FormData();
    formData.append('EmpresaRuc', empresaRuc);
    formData.append('Periodo', periodo);
    formData.append('Archivo', file, file.name);

    return this.http
      .post<any>(`${this.baseUrl}/cargas/ventas`, formData, { withCredentials: true })
      .pipe(map(res => this.extractData<CargarArchivoSunatDTO>(res)));
  }

  listarCargas(
    empresaRuc: string,
    tipoArchivo: 'Ventas' | 'Compras' | string,
    periodo?: string,
    pageNumber: number = 1,
    pageSize: number = 20
  ): Observable<ArchivoCargaItem[]> {
    let query = `empresaRuc=${encodeURIComponent(empresaRuc)}&tipoArchivo=${encodeURIComponent(tipoArchivo)}&pageNumber=${pageNumber}&pageSize=${pageSize}`;
    if (periodo && periodo.trim()) {
      query += `&periodo=${encodeURIComponent(periodo.trim())}`;
    }

    return this.http
      .get<any>(`${this.baseUrl}/cargas?${query}`, { withCredentials: true })
      .pipe(
        map(res => {
          const data = this.extractData<any>(res);
          if (Array.isArray(data)) return data as ArchivoCargaItem[];
          if (data && Array.isArray(data.items)) return data.items as ArchivoCargaItem[];
          return [];
        })
      );
  }

  obtenerCargaPorId(id: string): Observable<ArchivoCargaItem> {
    return this.http
      .get<any>(`${this.baseUrl}/cargas/${id}`, { withCredentials: true })
      .pipe(map(res => this.extractData<ArchivoCargaItem>(res)));
  }

  obtenerErroresCarga(id: string): Observable<ArchivoCargaErrorItem[]> {
    return this.http
      .get<any>(`${this.baseUrl}/cargas/${id}/errores`, { withCredentials: true })
      .pipe(
        map(res => {
          const data = this.extractData<any>(res);
          return (Array.isArray(data) ? data : []) as ArchivoCargaErrorItem[];
        })
      );
  }

  listarComprasPorCarga(idCarga: string): Observable<CompraItem[]> {
    return this.http
      .get<any>(`${this.baseUrl}/cargas/${idCarga}/compras`, { withCredentials: true })
      .pipe(
        map(res => {
          const data = this.extractData<any>(res);
          if (Array.isArray(data)) return data as CompraItem[];
          if (data && Array.isArray(data.items)) return data.items as CompraItem[];
          return [];
        })
      );
  }

  listarVentasPorCarga(idCarga: string): Observable<VentaItem[]> {
    return this.http
      .get<any>(`${this.baseUrl}/cargas/${idCarga}/ventas`, { withCredentials: true })
      .pipe(
        map(res => {
          const data = this.extractData<any>(res);
          if (Array.isArray(data)) return data as VentaItem[];
          if (data && Array.isArray(data.items)) return data.items as VentaItem[];
          return [];
        })
      );
  }
}
