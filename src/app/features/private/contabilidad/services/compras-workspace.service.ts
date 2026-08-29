import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

// ============================================================================
// SERVICIO WORKSPACE DE COMPRAS (Prototipo Frontend Mock en Memoria)
// ============================================================================

export type ResultadoMatch = 'Coincidente' | 'Conflicto' | 'SoloSire' | 'SoloEmpresa';
export type OrigenMatch = 'Ambos' | 'Sire' | 'Empresa' | 'Manual';

export interface CargaEmpresaComprasItem {
  idCargaEmpresa: string;
  periodo: string;
  nombreOriginal: string;
  numRegistros: number;
  numObservaciones: number;
  fechaCreacion: string;
}

export interface CompraEmpresaItem {
  idCompraEmpresa: string;
  numeroLinea: number;
  codigoTipoCp: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  codigoTipoDocIdentidad: string;
  nroDocIdentidad: string;
  razonSocial: string;
  biGravada: number;
  igvIpm: number;
  biGravadaDgng?: number;
  igvIpmDgng?: number;
  biGravadaDng?: number;
  igvIpmDng?: number;
  valorAdqNg?: number;
  icbper?: number;
  otrosTributos?: number;
  totalCp: number;
  codigoMoneda: string;
}

export interface ObservacionEmpresaItem {
  numeroLinea: number;
  tipoError: string;
  campoError: string | null;
  valorLectura: string | null;
  mensaje: string;
  severidad: 'Error' | 'Advertencia';
}

export interface PanelMatchComprasItem {
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

export interface LadoMatchCompra {
  fechaEmision: string;
  nroDocIdentidad: string;
  razonSocial: string;
  biGravada: number;
  igvIpm: number;
  totalCp: number;
  codigoMoneda: string;
}

export interface ConsolidadoMatchCompra {
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
}

export interface MatchComprasDetalleItem {
  idDetalle: string;
  resultado: ResultadoMatch;
  origen: OrigenMatch;
  sire: LadoMatchCompra | null;
  empresa: LadoMatchCompra | null;
  consolidado: ConsolidadoMatchCompra;
  camposConflicto: string | null;
  difBi: number | null;
  difIgv: number | null;
  difTotal: number | null;
}

export interface MatchComprasResumen {
  idMatch: string;
  periodo: string;
  fechaEjecucion: string;
  ejecutadoPor: string;
  totalSire: number;
  totalEmpresa: number;
  totalCoincidentes: number;
  totalConflictos: number;
  totalSoloSire: number;
  totalSoloEmpresa: number;
  sumaBiSire: number;
  sumaIgvSire: number;
  sumaTotalSire: number;
  sumaBiEmpresa: number;
  sumaIgvEmpresa: number;
  sumaTotalEmpresa: number;
  sumaBiConsolidado: number;
  sumaIgvConsolidado: number;
  sumaTotalConsolidado: number;
}

interface CargaEmpresaStore {
  carga: CargaEmpresaComprasItem;
  compras: CompraEmpresaItem[];
  errores: ObservacionEmpresaItem[];
}

interface MatchStore {
  resumen: MatchComprasResumen;
  detalles: MatchComprasDetalleItem[];
}

@Injectable({ providedIn: 'root' })
export class ComprasWorkspaceService {
  private cargasEmpresa: Map<string, CargaEmpresaStore> = new Map();
  private matches: Map<string, MatchStore> = new Map();

  constructor() {
    this.inicializarDatosDemo();
  }

  // --------------------------------------------------------------------------
  // CARGAS DE LA EMPRESA
  // --------------------------------------------------------------------------

  obtenerCargasEmpresa(periodo?: string): Observable<CargaEmpresaComprasItem[]> {
    let lista = Array.from(this.cargasEmpresa.values()).map(s => s.carga);
    if (periodo) {
      lista = lista.filter(c => c.periodo === periodo);
    }
    lista.sort((a, b) => b.periodo.localeCompare(a.periodo));
    return of(lista).pipe(delay(250));
  }

  obtenerCargaEmpresa(idCargaEmpresa: string): Observable<{
    carga: CargaEmpresaComprasItem;
    compras: CompraEmpresaItem[];
    errores: ObservacionEmpresaItem[];
  }> {
    const store = this.cargasEmpresa.get(idCargaEmpresa);
    if (!store) {
      return throwError(() => new Error(`No se encontró la carga de compras con id ${idCargaEmpresa}`));
    }
    return of({
      carga: { ...store.carga },
      compras: store.compras.map(c => ({ ...c })),
      errores: store.errores.map(e => ({ ...e }))
    }).pipe(delay(200));
  }

  crearCargaEmpresa(datos: {
    periodo: string;
    nombreArchivo: string;
    registros: CompraEmpresaItem[];
    errores?: ObservacionEmpresaItem[];
  }): Observable<CargaEmpresaComprasItem> {
    const idCarga = 'carga-compra-' + Date.now();
    const nuevaCarga: CargaEmpresaComprasItem = {
      idCargaEmpresa: idCarga,
      periodo: datos.periodo,
      nombreOriginal: datos.nombreArchivo,
      numRegistros: datos.registros.length,
      numObservaciones: (datos.errores || []).length,
      fechaCreacion: new Date().toISOString()
    };

    this.cargasEmpresa.set(idCarga, {
      carga: nuevaCarga,
      compras: datos.registros,
      errores: datos.errores || []
    });

    return of(nuevaCarga).pipe(delay(300));
  }

  actualizarComprasEmpresa(idCargaEmpresa: string, cambios: {
    eliminadosIds?: string[];
    nuevos?: CompraEmpresaItem[];
    modificados?: CompraEmpresaItem[];
  }): Observable<{ mensaje: string; totalRegistros: number }> {
    const store = this.cargasEmpresa.get(idCargaEmpresa);
    if (!store) {
      return throwError(() => new Error(`No se encontró la carga con id ${idCargaEmpresa}`));
    }

    const eliminadosSet = new Set(cambios.eliminadosIds || []);
    let lista = store.compras.filter(c => !eliminadosSet.has(c.idCompraEmpresa));

    const modMap = new Map((cambios.modificados || []).map(m => [m.idCompraEmpresa, m]));
    lista = lista.map(c => modMap.get(c.idCompraEmpresa) || c);

    if (cambios.nuevos && cambios.nuevos.length > 0) {
      lista.push(...cambios.nuevos);
    }

    lista.forEach((c, idx) => c.numeroLinea = idx + 1);
    store.compras = lista;
    store.carga.numRegistros = lista.length;

    return of({
      mensaje: 'Registros de compras actualizados correctamente.',
      totalRegistros: lista.length
    }).pipe(delay(300));
  }

  eliminarCargaEmpresa(idCargaEmpresa: string): Observable<boolean> {
    this.cargasEmpresa.delete(idCargaEmpresa);
    return of(true).pipe(delay(200));
  }

  // --------------------------------------------------------------------------
  // MATCH / CONCILIACIÓN
  // --------------------------------------------------------------------------

  obtenerPanelMatch(): Observable<PanelMatchComprasItem[]> {
    const periodos = ['202605', '202604', '202603', '202602'];
    const items: PanelMatchComprasItem[] = periodos.map(periodo => {
      const tieneEmpresa = Array.from(this.cargasEmpresa.values()).some(s => s.carga.periodo === periodo);
      const matchStore = Array.from(this.matches.values()).find(m => m.resumen.periodo === periodo);

      return {
        periodo,
        sireCargado: true, // Demo SIRE cargado
        empresaCargada: tieneEmpresa,
        match: matchStore ? {
          idMatch: matchStore.resumen.idMatch,
          fechaEjecucion: matchStore.resumen.fechaEjecucion,
          totalCoincidentes: matchStore.resumen.totalCoincidentes,
          totalConflictos: matchStore.resumen.totalConflictos,
          totalSoloSire: matchStore.resumen.totalSoloSire,
          totalSoloEmpresa: matchStore.resumen.totalSoloEmpresa
        } : null
      };
    });

    return of(items).pipe(delay(200));
  }

  ejecutarMatch(periodo: string): Observable<MatchComprasResumen> {
    const idMatch = 'match-compra-' + periodo;
    const detalles: MatchComprasDetalleItem[] = this.generarDetallesMatchDemo(periodo);

    const coincidentes = detalles.filter(d => d.resultado === 'Coincidente').length;
    const conflictos = detalles.filter(d => d.resultado === 'Conflicto').length;
    const soloSire = detalles.filter(d => d.resultado === 'SoloSire').length;
    const soloEmpresa = detalles.filter(d => d.resultado === 'SoloEmpresa').length;

    const sumaBiSire = detalles.reduce((acc, d) => acc + (d.sire?.biGravada || 0), 0);
    const sumaIgvSire = detalles.reduce((acc, d) => acc + (d.sire?.igvIpm || 0), 0);
    const sumaTotalSire = detalles.reduce((acc, d) => acc + (d.sire?.totalCp || 0), 0);

    const sumaBiEmpresa = detalles.reduce((acc, d) => acc + (d.empresa?.biGravada || 0), 0);
    const sumaIgvEmpresa = detalles.reduce((acc, d) => acc + (d.empresa?.igvIpm || 0), 0);
    const sumaTotalEmpresa = detalles.reduce((acc, d) => acc + (d.empresa?.totalCp || 0), 0);

    const sumaBiConsolidado = detalles.reduce((acc, d) => acc + (d.consolidado.biGravada || 0), 0);
    const sumaIgvConsolidado = detalles.reduce((acc, d) => acc + (d.consolidado.igvIpm || 0), 0);
    const sumaTotalConsolidado = detalles.reduce((acc, d) => acc + (d.consolidado.totalCp || 0), 0);

    const resumen: MatchComprasResumen = {
      idMatch,
      periodo,
      fechaEjecucion: new Date().toISOString(),
      ejecutadoPor: 'Usuario Demo',
      totalSire: coincidentes + conflictos + soloSire,
      totalEmpresa: coincidentes + conflictos + soloEmpresa,
      totalCoincidentes: coincidentes,
      totalConflictos: conflictos,
      totalSoloSire: soloSire,
      totalSoloEmpresa: soloEmpresa,
      sumaBiSire,
      sumaIgvSire,
      sumaTotalSire,
      sumaBiEmpresa,
      sumaIgvEmpresa,
      sumaTotalEmpresa,
      sumaBiConsolidado,
      sumaIgvConsolidado,
      sumaTotalConsolidado
    };

    this.matches.set(idMatch, { resumen, detalles });
    return of(resumen).pipe(delay(400));
  }

  obtenerMatch(idMatch: string): Observable<{ resumen: MatchComprasResumen; detalles: MatchComprasDetalleItem[] }> {
    const store = this.matches.get(idMatch);
    if (!store) {
      return throwError(() => new Error(`No se encontró el match de compras con id ${idMatch}`));
    }
    return of({
      resumen: { ...store.resumen },
      detalles: store.detalles.map(d => ({ ...d, consolidado: { ...d.consolidado } }))
    }).pipe(delay(200));
  }

  actualizarDetalleMatch(idMatch: string, cambios: {
    eliminadosIds?: string[];
    nuevos?: MatchComprasDetalleItem[];
    modificados?: MatchComprasDetalleItem[];
  }): Observable<{ mensaje: string }> {
    const store = this.matches.get(idMatch);
    if (!store) {
      return throwError(() => new Error(`No se encontró el match con id ${idMatch}`));
    }

    const elimSet = new Set(cambios.eliminadosIds || []);
    let lista = store.detalles.filter(d => !elimSet.has(d.idDetalle));

    const modMap = new Map((cambios.modificados || []).map(m => [m.idDetalle, m]));
    lista = lista.map(d => modMap.get(d.idDetalle) || d);

    if (cambios.nuevos && cambios.nuevos.length > 0) {
      lista.push(...cambios.nuevos);
    }

    store.detalles = lista;
    return of({ mensaje: 'Detalle consolidado de compras actualizado con éxito.' }).pipe(delay(300));
  }

  // --------------------------------------------------------------------------
  // DATOS DEMO
  // --------------------------------------------------------------------------

  private inicializarDatosDemo(): void {
    const idCargaMay = 'carga-compra-202605-demo';
    const comprasDemo: CompraEmpresaItem[] = [
      {
        idCompraEmpresa: 'cmp-01',
        numeroLinea: 1,
        codigoTipoCp: '01',
        serie: 'F001',
        numero: '10452',
        fechaEmision: '02/05/2026',
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20100070970',
        razonSocial: 'SUPERMERCADOS PERUANOS S.A.',
        biGravada: 1250.00,
        igvIpm: 225.00,
        totalCp: 1475.00,
        codigoMoneda: 'PEN'
      },
      {
        idCompraEmpresa: 'cmp-02',
        numeroLinea: 2,
        codigoTipoCp: '01',
        serie: 'F002',
        numero: '8841',
        fechaEmision: '05/05/2026',
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20504012345',
        razonSocial: 'DISTRIBUIDORA LIMA NORTE S.A.C.',
        biGravada: 3400.00,
        igvIpm: 612.00,
        totalCp: 4012.00,
        codigoMoneda: 'PEN'
      },
      {
        idCompraEmpresa: 'cmp-03',
        numeroLinea: 3,
        codigoTipoCp: '03',
        serie: 'B001',
        numero: '5012',
        fechaEmision: '10/05/2026',
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20601234567',
        razonSocial: 'SERVICIOS GRAFICOS DEL SUR E.I.R.L.',
        biGravada: 450.00,
        igvIpm: 81.00,
        totalCp: 531.00,
        codigoMoneda: 'PEN'
      },
      {
        idCompraEmpresa: 'cmp-04',
        numeroLinea: 4,
        codigoTipoCp: '01',
        serie: 'E001',
        numero: '334',
        fechaEmision: '14/05/2026',
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20492837162',
        razonSocial: 'TECNOLOGIA Y SISTEMAS AVANZADOS S.A.',
        biGravada: 5200.00,
        igvIpm: 936.00,
        totalCp: 6136.00,
        codigoMoneda: 'PEN'
      },
      {
        idCompraEmpresa: 'cmp-05',
        numeroLinea: 5,
        codigoTipoCp: '07',
        serie: 'FC01',
        numero: '102',
        fechaEmision: '18/05/2026',
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20100070970',
        razonSocial: 'SUPERMERCADOS PERUANOS S.A.',
        biGravada: -200.00,
        igvIpm: -36.00,
        totalCp: -236.00,
        codigoMoneda: 'PEN'
      }
    ];

    this.cargasEmpresa.set(idCargaMay, {
      carga: {
        idCargaEmpresa: idCargaMay,
        periodo: '202605',
        nombreOriginal: 'Registro_Compras_Mayo_2026_ERP.xlsx',
        numRegistros: comprasDemo.length,
        numObservaciones: 1,
        fechaCreacion: new Date().toISOString()
      },
      compras: comprasDemo,
      errores: [
        {
          numeroLinea: 3,
          tipoError: 'Formato RUC',
          campoError: 'nroDocIdentidad',
          valorLectura: '20601234567',
          mensaje: 'Se sugiere verificar dígito verificador del proveedor.',
          severidad: 'Advertencia'
        }
      ]
    });
  }

  private generarDetallesMatchDemo(periodo: string): MatchComprasDetalleItem[] {
    return [
      {
        idDetalle: 'mc-1',
        resultado: 'Coincidente',
        origen: 'Ambos',
        sire: {
          fechaEmision: '02/05/2026',
          nroDocIdentidad: '20100070970',
          razonSocial: 'SUPERMERCADOS PERUANOS S.A.',
          biGravada: 1250.00,
          igvIpm: 225.00,
          totalCp: 1475.00,
          codigoMoneda: 'PEN'
        },
        empresa: {
          fechaEmision: '02/05/2026',
          nroDocIdentidad: '20100070970',
          razonSocial: 'SUPERMERCADOS PERUANOS S.A.',
          biGravada: 1250.00,
          igvIpm: 225.00,
          totalCp: 1475.00,
          codigoMoneda: 'PEN'
        },
        consolidado: {
          codigoTipoCp: '01',
          serie: 'F001',
          numero: '10452',
          fechaEmision: '02/05/2026',
          codigoTipoDocIdentidad: '6',
          nroDocIdentidad: '20100070970',
          razonSocial: 'SUPERMERCADOS PERUANOS S.A.',
          biGravada: 1250.00,
          igvIpm: 225.00,
          totalCp: 1475.00,
          codigoMoneda: 'PEN'
        },
        camposConflicto: null,
        difBi: 0,
        difIgv: 0,
        difTotal: 0
      },
      {
        idDetalle: 'mc-2',
        resultado: 'Conflicto',
        origen: 'Ambos',
        sire: {
          fechaEmision: '05/05/2026',
          nroDocIdentidad: '20504012345',
          razonSocial: 'DISTRIBUIDORA LIMA NORTE S.A.C.',
          biGravada: 3400.00,
          igvIpm: 612.00,
          totalCp: 4012.00,
          codigoMoneda: 'PEN'
        },
        empresa: {
          fechaEmision: '06/05/2026',
          nroDocIdentidad: '20504012345',
          razonSocial: 'DISTRIBUIDORA LIMA NORTE S.A.C.',
          biGravada: 3450.00,
          igvIpm: 621.00,
          totalCp: 4071.00,
          codigoMoneda: 'PEN'
        },
        consolidado: {
          codigoTipoCp: '01',
          serie: 'F002',
          numero: '8841',
          fechaEmision: '05/05/2026',
          codigoTipoDocIdentidad: '6',
          nroDocIdentidad: '20504012345',
          razonSocial: 'DISTRIBUIDORA LIMA NORTE S.A.C.',
          biGravada: 3400.00,
          igvIpm: 612.00,
          totalCp: 4012.00,
          codigoMoneda: 'PEN'
        },
        camposConflicto: 'Fecha de Emisión, Base Imponible, Total CP',
        difBi: -50.00,
        difIgv: -9.00,
        difTotal: -59.00
      },
      {
        idDetalle: 'mc-3',
        resultado: 'SoloSire',
        origen: 'Sire',
        sire: {
          fechaEmision: '12/05/2026',
          nroDocIdentidad: '20304050607',
          razonSocial: 'TELEFONICA DEL PERU S.A.A.',
          biGravada: 820.00,
          igvIpm: 147.60,
          totalCp: 967.60,
          codigoMoneda: 'PEN'
        },
        empresa: null,
        consolidado: {
          codigoTipoCp: '14',
          serie: 'S001',
          numero: '9921',
          fechaEmision: '12/05/2026',
          codigoTipoDocIdentidad: '6',
          nroDocIdentidad: '20304050607',
          razonSocial: 'TELEFONICA DEL PERU S.A.A.',
          biGravada: 820.00,
          igvIpm: 147.60,
          totalCp: 967.60,
          codigoMoneda: 'PEN'
        },
        camposConflicto: null,
        difBi: null,
        difIgv: null,
        difTotal: null
      },
      {
        idDetalle: 'mc-4',
        resultado: 'SoloEmpresa',
        origen: 'Empresa',
        sire: null,
        empresa: {
          fechaEmision: '14/05/2026',
          nroDocIdentidad: '20492837162',
          razonSocial: 'TECNOLOGIA Y SISTEMAS AVANZADOS S.A.',
          biGravada: 5200.00,
          igvIpm: 936.00,
          totalCp: 6136.00,
          codigoMoneda: 'PEN'
        },
        consolidado: {
          codigoTipoCp: '01',
          serie: 'E001',
          numero: '334',
          fechaEmision: '14/05/2026',
          codigoTipoDocIdentidad: '6',
          nroDocIdentidad: '20492837162',
          razonSocial: 'TECNOLOGIA Y SISTEMAS AVANZADOS S.A.',
          biGravada: 5200.00,
          igvIpm: 936.00,
          totalCp: 6136.00,
          codigoMoneda: 'PEN'
        },
        camposConflicto: null,
        difBi: null,
        difIgv: null,
        difTotal: null
      }
    ];
  }
}
