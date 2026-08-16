import { Injectable, Optional, Inject, InjectionToken } from '@angular/core';

export const SEGURIDAD_API_URL = new InjectionToken<string>('SEGURIDAD_API_URL');
export const EMPRESA_API_URL = new InjectionToken<string>('EMPRESA_API_URL');
export const CONTABILIDAD_API_URL = new InjectionToken<string>('CONTABILIDAD_API_URL');
export const FISCAL_API_URL = new InjectionToken<string>('FISCAL_API_URL');
export const CATALOGOS_API_URL = new InjectionToken<string>('CATALOGOS_API_URL');
export const OPERACIONES_API_URL = new InjectionToken<string>('OPERACIONES_API_URL');

@Injectable()
export class ApiRegistry {
  private microservicios: Map<string, string> = new Map();

  constructor(
    @Optional() @Inject(SEGURIDAD_API_URL) seguridadUrl?: string,
    @Optional() @Inject(EMPRESA_API_URL) empresaUrl?: string,
    @Optional() @Inject(CONTABILIDAD_API_URL) contabilidadUrl?: string,
    @Optional() @Inject(FISCAL_API_URL) fiscalUrl?: string,
    @Optional() @Inject(CATALOGOS_API_URL) catalogosUrl?: string,
    @Optional() @Inject(OPERACIONES_API_URL) operacionesUrl?: string
  ) {
    if (seguridadUrl) this.microservicios.set('seguridad', seguridadUrl);
    if (empresaUrl) this.microservicios.set('empresa', empresaUrl);
    if (contabilidadUrl) this.microservicios.set('contabilidad', contabilidadUrl);
    if (fiscalUrl) this.microservicios.set('fiscal', fiscalUrl);
    if (catalogosUrl) this.microservicios.set('catalogos', catalogosUrl);
    if (operacionesUrl) this.microservicios.set('operaciones', operacionesUrl);
  }

  register(nombre: string, url: string): void {
    this.microservicios.set(nombre, url);
  }

  get(nombre: string): string {
    const url = this.microservicios.get(nombre);
    if (!url) {
      throw new Error(`Microservicio "${nombre}" no esta registrado en el ApiRegistry.`);
    }
    return url;
  }

  has(nombre: string): boolean {
    return this.microservicios.has(nombre);
  }
}