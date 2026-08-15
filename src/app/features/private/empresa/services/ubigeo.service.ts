import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiRegistry } from '../../../../core/config/api.registry';
import { ApiService } from '../../../../core/services/api.service';

export interface Departamento {
  codigoUbigeo: string;
  codigoDepartamento: string;
  departamento: string;
}

export interface Provincia {
  codigoUbigeo: string;
  codigoProvincia: string;
  provincia: string;
}

export interface Distrito {
  codigoUbigeo: string;
  codigoDistrito: string;
  distrito: string;
}

export interface Moneda {
  codigoIso: string;
  nombre: string;
  simbolo: string;
  esMonedaNacional: boolean;
}

@Injectable({ providedIn: 'root' })
export class UbigeoService {
  private http = inject(HttpClient);
  private apiRegistry = inject(ApiRegistry);

  private get api(): ApiService {
    return new ApiService(this.http, this.apiRegistry.get('catalogos'));
  }

  obtenerDepartamentos(): Observable<Departamento[]> {
    return this.api.get<Departamento[]>('/ubigeo/departamentos');
  }

  obtenerProvincias(codigoDepartamento: string): Observable<Provincia[]> {
    return this.api.get<Provincia[]>(`/ubigeo/provincias?codigoDepartamento=${codigoDepartamento}`);
  }

  obtenerDistritos(codigoProvincia: string): Observable<Distrito[]> {
    return this.api.get<Distrito[]>(`/ubigeo/distritos?codigoProvincia=${codigoProvincia}`);
  }

  obtenerMonedas(): Observable<Moneda[]> {
    return this.api.get<Moneda[]>('/monedas');
  }
}