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
  totalBaseImponible?: number;
  totalIgv?: number;
  totalGeneral?: number;
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
  totalBaseImponible?: number;
  totalIgv?: number;
  totalGeneral?: number;
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
  empresaRuc?: string;
  periodo?: string;
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
  detraccion?: string;
  esNuevo?: boolean;
  editando?: boolean;
  modificado?: boolean;
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
  esNuevo?: boolean;
  editando?: boolean;
  modificado?: boolean;
}

export interface VentaEmpresaItem {
  idVentaEmpresa: string;
  idCarga?: string;
  empresaRuc?: string;
  periodo?: string;
  numeroLinea: number;
  carSunat?: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  codigoTipoCp: string;
  serie: string;
  numero: string;
  numeroFinal?: string;
  codigoTipoDocIdentidad: string;
  nroDocIdentidad: string;
  razonSocial: string;
  valorFacturadoExportacion?: number;
  biGravada: number;
  descuentoBi?: number;
  igvIpm: number;
  descuentoIgv?: number;
  montoExonerado?: number;
  montoInafecto?: number;
  montoIsc?: number;
  biGravadaIvap?: number;
  montoIvap?: number;
  montoIcbper?: number;
  montoOtrosTributos?: number;
  totalCp: number;
  codigoMoneda: string;
  tipoCambio: number;
  fechaEmisionDocModificado?: string;
  codigoTipoCpModificado?: string;
  serieCpModificado?: string;
  numeroCpModificado?: string;
  codigoEstadoComprobante?: string;
  codigoTipoNota?: string;
  tipoOperacion?: string;
  camposLibres?: string;
  esNuevo?: boolean;
  editando?: boolean;
  modificado?: boolean;
}

export interface CargaEmpresaItem {
  idCargaEmpresa: string;
  periodo: string;
  nombreOriginal: string;
  numRegistros: number;
  numObservaciones: number;
  fechaCreacion: string;
}

export interface ObservacionEmpresaItem {
  numeroLinea: number;
  tipoError: string;
  campoError: string | null;
  valorLectura: string | null;
  mensaje: string;
  severidad: 'Error' | 'Advertencia';
}

export interface PanelMatchItem {
  periodo: string;
  sireCargado: boolean;
  empresaCargada: boolean;
  match: {
    idMatch: string;
    fechaEjecucion: string;
    totalCoincidentes: number;
    totalConflictos: number;
    totalSoloSire: number;
    totalSoloEmpresa: number;
  } | null;
}

export interface VentaMatchItem {
  idVentaMatch: string;
  idCarga: string;
  empresaRuc: string;
  periodo: string;
  numeroLinea: number;
  origenDato: string;
  esCoincidenciaExacta: boolean;
  esDiferencia: boolean;
  esSoloUnOrigen: boolean;
  carSunat?: string;
  codigoTipoCp: string;
  serie: string;
  numero: string;
  numeroFinal?: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  codigoTipoDocIdentidad: string;
  nroDocIdentidad: string;
  razonSocial: string;
  valorFacturadoExportacion?: number;
  biGravada?: number;
  descuentoBi?: number;
  igvIpm?: number;
  descuentoIgv?: number;
  montoExonerado?: number;
  montoInafecto?: number;
  montoIsc?: number;
  biGravadaIvap?: number;
  montoIvap?: number;
  montoIcbper?: number;
  montoOtrosTributos?: number;
  totalCp: number;
  codigoMoneda: string;
  tipoCambio?: number;
  fechaEmisionDocModificado?: string;
  codigoTipoCpModificado?: string;
  serieCpModificado?: string;
  numeroCpModificado?: string;
  codigoEstadoComprobante?: string;
  codigoTipoNota?: string;
  tipoOperacion?: string;
  camposLibres?: string;
  esNuevo?: boolean;
  editando?: boolean;
  modificado?: boolean;
}

export interface EjecutarMatchResponseDTO {
  idCarga: string;
  empresaRuc: string;
  periodo: string;
  totalRegistrosSire: number;
  totalRegistrosEmpresa: number;
  totalConsolidado: number;
  coincidenciasExactas: number;
  diferencias: number;
  soloUnOrigen: number;
  totalObservaciones: number;
  totalGeneral: number;
  mensaje: string;
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

  cargarVentasEmpresa(empresaRuc: string, periodo: string, file: File): Observable<CargarArchivoSunatDTO> {
    const formData = new FormData();
    formData.append('EmpresaRuc', empresaRuc);
    formData.append('Periodo', periodo);
    formData.append('Archivo', file, file.name);

    return this.http
      .post<any>(`${this.baseUrl}/cargas/ventas-empresa`, formData, { withCredentials: true })
      .pipe(map(res => this.extractData<CargarArchivoSunatDTO>(res)));
  }

  listarCargas(
    empresaRuc: string,
    tipoArchivo: 'Ventas' | 'Compras' | 'VentasEmpresa' | 'ComprasEmpresa' | string,
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

  listarVentasEmpresaPorCarga(idCarga: string): Observable<VentaEmpresaItem[]> {
    return this.http
      .get<any>(`${this.baseUrl}/cargas/${idCarga}/ventas-empresa`, { withCredentials: true })
      .pipe(
        map(res => {
          const data = this.extractData<any>(res);
          if (Array.isArray(data)) return data as VentaEmpresaItem[];
          if (data && Array.isArray(data.items)) return data.items as VentaEmpresaItem[];
          return [];
        })
      );
  }

  actualizarVentas(
    idCarga: string,
    eliminadosIds: string[] = [],
    nuevos: any[] = [],
    modificados: any[] = []
  ): Observable<{ exito: boolean; mensaje: string; numRegistros: number; numObservaciones: number }> {
    const body = { eliminadosIds, nuevos, modificados };
    return this.http
      .post<any>(`${this.baseUrl}/cargas/${idCarga}/actualizar-ventas`, body, { withCredentials: true })
      .pipe(map(res => this.extractData<any>(res)));
  }

  actualizarVentasEmpresa(
    idCarga: string,
    eliminadosIds: string[] = [],
    nuevos: any[] = [],
    modificados: any[] = []
  ): Observable<{ idCarga: string; mensaje: string; numRegistros: number; numRegistrosError: number; totalGeneral: number }> {
    const body = { eliminadosIds, nuevos, modificados };
    return this.http
      .post<any>(`${this.baseUrl}/cargas/${idCarga}/actualizar-ventas-empresa`, body, { withCredentials: true })
      .pipe(map(res => this.extractData<any>(res)));
  }

  actualizarCompras(
    idCarga: string,
    eliminadosIds: string[] = [],
    nuevos: any[] = [],
    modificados: any[] = []
  ): Observable<{ exito: boolean; mensaje: string; numRegistros: number; numObservaciones: number }> {
    const body = { eliminadosIds, nuevos, modificados };
    return this.http
      .post<any>(`${this.baseUrl}/cargas/${idCarga}/actualizar-compras`, body, { withCredentials: true })
      .pipe(map(res => this.extractData<any>(res)));
  }

  ejecutarMatchVentas(empresaRuc: string, periodo: string): Observable<EjecutarMatchResponseDTO> {
    const body = { empresaRuc, periodo };
    return this.http
      .post<any>(`${this.baseUrl}/ventas/ejecutar-match`, body, { withCredentials: true })
      .pipe(map(res => this.extractData<EjecutarMatchResponseDTO>(res)));
  }

  reejecutarMatchVentas(empresaRuc: string, periodo: string): Observable<EjecutarMatchResponseDTO> {
    const body = { empresaRuc, periodo };
    return this.http
      .post<any>(`${this.baseUrl}/ventas/re-ejecutar-match`, body, { withCredentials: true })
      .pipe(map(res => this.extractData<EjecutarMatchResponseDTO>(res)));
  }

  listarVentasMatch(idCarga: string): Observable<VentaMatchItem[]> {
    return this.http
      .get<any>(`${this.baseUrl}/cargas/${idCarga}/ventas-match`, { withCredentials: true })
      .pipe(
        map(res => {
          const data = this.extractData<any>(res);
          if (Array.isArray(data)) return data as VentaMatchItem[];
          if (data && Array.isArray(data.items)) return data.items as VentaMatchItem[];
          return [];
        })
      );
  }

  actualizarVentasMatch(
    idCarga: string,
    eliminadosIds: string[] = [],
    nuevos: any[] = [],
    modificados: any[] = []
  ): Observable<{
    idCarga: string;
    exito: boolean;
    mensaje: string;
    numRegistros: number;
    numObservaciones: number;
    totalBaseImponible: number;
    totalIgv: number;
    totalGeneral: number;
  }> {
    const body = { eliminadosIds, nuevos, modificados };
    return this.http
      .post<any>(`${this.baseUrl}/cargas/${idCarga}/actualizar-ventas-match`, body, { withCredentials: true })
      .pipe(map(res => this.extractData<any>(res)));
  }

  eliminarMatchVentas(idCargaMatch: string): Observable<boolean> {
    return this.http
      .delete<any>(`${this.baseUrl}/ventas/match/${idCargaMatch}`, { withCredentials: true })
      .pipe(map(res => this.extractData<boolean>(res)));
  }

  eliminarCarga(idCarga: string): Observable<boolean> {
    return this.http
      .delete<any>(`${this.baseUrl}/cargas/${idCarga}`, { withCredentials: true })
      .pipe(map(res => this.extractData<boolean>(res)));
  }
}
