import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiRegistry } from '../../../../core/config/api.registry';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../core/services/api.service';

export interface Empresa {
  idEmpresa: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  codigoRegimenTributario: string;
  codigoEstadoContribuyente: string;
  codigoCondicionContribuyente: string;
  direccionFiscal: string;
  ubigeo: string;
  monedaBase: string;
  logoUrl: string | null;
}

export interface EmpresaListResponse {
  items: Empresa[];
  total: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface RegimenTributario {
  codigo: string;
  descripcion: string;
}

export interface EstadoContribuyente {
  codigo: string;
  descripcion: string;
}

export interface CondicionContribuyente {
  codigo: string;
  descripcion: string;
}

export interface CredencialSunat {
  idCredencial: string;
  idEmpresa: string;
  usuarioSol: string;
  claveSol: string;
}

export interface EmpresaFiltro {
  ruc?: string;
  razonSocial?: string;
  codigoRegimenTributario?: string;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private http = inject(HttpClient);
  private apiRegistry = inject(ApiRegistry);

  private get api(): ApiService {
    return new ApiService(this.http, this.apiRegistry.get('empresa'));
  }

  listar(filtro?: EmpresaFiltro): Observable<EmpresaListResponse> {
    const params = new HttpParams();
    let queryString = '';

    if (filtro?.ruc) queryString += `&ruc=${encodeURIComponent(filtro.ruc)}`;
    if (filtro?.razonSocial) queryString += `&razonSocial=${encodeURIComponent(filtro.razonSocial)}`;
    if (filtro?.codigoRegimenTributario) queryString += `&codigoRegimenTributario=${encodeURIComponent(filtro.codigoRegimenTributario)}`;
    if (filtro?.pageNumber) queryString += `&pageNumber=${filtro.pageNumber}`;
    if (filtro?.pageSize) queryString += `&pageSize=${filtro.pageSize}`;

    queryString = queryString.startsWith('&') ? queryString.slice(1) : queryString;

    const url = queryString ? `/empresa?${queryString}` : '/empresa';
    return this.api.get<EmpresaListResponse>(url);
  }

  obtenerPorId(id: string): Observable<Empresa> {
    return this.api.get<Empresa>(`/empresa/${id}`);
  }

  crear(datos: any): Observable<Empresa> {
    return this.api.post<Empresa>('/empresa', datos);
  }

  actualizar(id: string, datos: any): Observable<Empresa> {
    return this.api.put<Empresa>(`/empresa/${id}`, datos);
  }

  eliminar(id: string): Observable<void> {
    return this.api.delete<void>(`/empresa/${id}`);
  }

  obtenerRegimenes(): Observable<RegimenTributario[]> {
    return this.api.get<RegimenTributario[]>('/empresa/regimen-tributario');
  }

  obtenerEstados(): Observable<EstadoContribuyente[]> {
    return this.api.get<EstadoContribuyente[]>('/empresa/estado-contribuyente');
  }

  obtenerCondiciones(): Observable<CondicionContribuyente[]> {
    return this.api.get<CondicionContribuyente[]>('/empresa/condicion-contribuyente');
  }

  obtenerCredencial(idEmpresa: string): Observable<CredencialSunat> {
    return this.api.get<CredencialSunat>(`/empresa/${idEmpresa}/credencial-sunat`);
  }

  guardarCredencial(idEmpresa: string, datos: { usuarioSol: string, claveSol: string }): Observable<CredencialSunat> {
    return this.api.post<CredencialSunat>(`/empresa/${idEmpresa}/credencial-sunat`, datos);
  }

  private maparEmpresa(data: any): Empresa {
    return {
      idEmpresa: data.idEmpresa || '',
      ruc: data.ruc || '',
      razonSocial: data.razonSocial || '',
      nombreComercial: data.nombreComercial || '',
      codigoRegimenTributario: data.codigoRegimenTributario || '',
      codigoEstadoContribuyente: data.codigoEstadoContribuyente || '',
      codigoCondicionContribuyente: data.codigoCondicionContribuyente || '',
      direccionFiscal: data.direccionFiscal || '',
      ubigeo: data.ubigeo || '',
      monedaBase: data.monedaBase || '',
      logoUrl: data.logoUrl || null
    };
  }
}