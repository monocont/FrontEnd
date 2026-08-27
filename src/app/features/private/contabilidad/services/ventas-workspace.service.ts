import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

// ============================================================================
// MAQUETA UX v2 — Servicio del workspace de Ventas (Fases 2 y 3) con datos
// simulados en memoria. NO realiza llamadas al backend. Cuando el backend esté
// listo, reemplazar los métodos por llamadas reales vía ApiService (operaciones):
//   POST   cargas/empresa                              (multipart)
//   GET    cargas/empresa?empresaRuc&periodo
//   GET    cargas/empresa/{id}/ventas | /errores
//   POST   cargas/empresa/{id}/actualizar-ventas       {eliminadosIds, nuevos, modificados}
//   DELETE cargas/empresa/{id}
//   GET    matches/panel?empresaRuc
//   POST   matches/ejecutar                            {EmpresaRuc, Periodo}
//   GET    matches/{idMatch} | /detalle
//   POST   matches/{idMatch}/actualizar-detalle        {eliminadosIds, nuevos, modificados}
// ============================================================================

export type ResultadoMatch = 'Coincidente' | 'Conflicto' | 'SoloSire' | 'SoloEmpresa';
export type OrigenMatch = 'Ambos' | 'Sire' | 'Empresa' | 'Manual';

export interface CargaEmpresaItem {
  idCargaEmpresa: string;
  periodo: string;
  nombreOriginal: string;
  numRegistros: number;
  numObservaciones: number;
  fechaCreacion: string;
}

export interface VentaEmpresaItem {
  idVentaEmpresa: string;
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

export interface LadoMatch {
  fechaEmision: string;
  nroDocIdentidad: string;
  razonSocial: string;
  biGravada: number;
  igvIpm: number;
  totalCp: number;
  codigoMoneda: string;
}

export interface ConsolidadoMatch {
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

export interface MatchDetalleItem {
  idDetalle: string;
  resultado: ResultadoMatch;
  origen: OrigenMatch;
  sire: LadoMatch | null;
  empresa: LadoMatch | null;
  consolidado: ConsolidadoMatch;
  camposConflicto: string | null;
  difBi: number | null;
  difIgv: number | null;
  difTotal: number | null;
}

export interface MatchResumen {
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
  difBi: number;
  difIgv: number;
  difTotal: number;
}

const TOLERANCIA = 0.01;

interface RowDef {
  tipo: string; serie: string; numero: string; dia: number;
  docTipo: string; doc: string; razon: string; bi: number; igv: number;
}

// Comprobantes del universo de ejemplo (definidos una sola vez)
const ROWS_SIRE: RowDef[] = [
  { tipo: '01', serie: 'F001', numero: '00000001', dia: 5, docTipo: '6', doc: '20512345678', razon: 'COMERCIAL ANDINA S.A.C.', bi: 5000, igv: 900 },
  { tipo: '01', serie: 'F001', numero: '00000002', dia: 8, docTipo: '6', doc: '10457896312', razon: 'INVERSIONES DEL NORTE S.R.L.', bi: 1250.5, igv: 225.09 },
  { tipo: '01', serie: 'F001', numero: '00000003', dia: 12, docTipo: '6', doc: '10547896312', razon: 'DISTRIBUIDORA SUR E.I.R.L.', bi: 860, igv: 154.8 },
  { tipo: '01', serie: 'F001', numero: '00000010', dia: 20, docTipo: '6', doc: '20587412369', razon: 'MINERA LOS ANDES S.A.C.', bi: 2000, igv: 360 },
  { tipo: '01', serie: 'F001', numero: '00000022', dia: 26, docTipo: '6', doc: '20987654321', razon: 'CONSTRUCTORA EL SOL S.A.', bi: 3200, igv: 576 },
  { tipo: '01', serie: 'F002', numero: '00000015', dia: 15, docTipo: '6', doc: '20604512378', razon: 'SERVICIOS GENERALES SIGMA S.A.', bi: 3420, igv: 615.6 },
  { tipo: '01', serie: 'F002', numero: '00000018', dia: 22, docTipo: '6', doc: '10745896320', razon: 'CORPORACION PACIFICO S.A.C.', bi: 980, igv: 176.4 },
  { tipo: '01', serie: 'F002', numero: '00000020', dia: 28, docTipo: '6', doc: '10045879632', razon: 'AGROINDUSTRIAS VERDE S.R.L.', bi: 1750, igv: 315 },
  { tipo: '03', serie: 'B001', numero: '00000008', dia: 18, docTipo: '6', doc: '10234567890', razon: 'TRANSPORTES RAPIDO E.I.R.L.', bi: 480, igv: 86.4 },
  { tipo: '03', serie: 'B001', numero: '00000031', dia: 27, docTipo: '1', doc: '08123456', razon: 'PEREZ LOPEZ, JUAN CARLOS', bi: 150, igv: 27 },
  { tipo: '07', serie: 'F001', numero: '00000025', dia: 24, docTipo: '6', doc: '20123456789', razon: 'FARMACIA CENTRAL S.A.C.', bi: -1000, igv: -180 }
];

// Datos empresa: coinciden con SIRE excepto las diferencias del ejemplo
const ROWS_EMPRESA: RowDef[] = [
  { tipo: '01', serie: 'F001', numero: '00000001', dia: 5, docTipo: '6', doc: '20512345678', razon: 'COMERCIAL ANDINA S.A.C.', bi: 5000, igv: 900 },
  { tipo: '01', serie: 'F001', numero: '00000002', dia: 8, docTipo: '6', doc: '10457896312', razon: 'INVERSIONES DEL NORTE S.R.L.', bi: 1250.5, igv: 225.09 },
  { tipo: '01', serie: 'F001', numero: '00000003', dia: 12, docTipo: '6', doc: '10547896312', razon: 'DISTRIBUIDORA SUR E.I.R.L.', bi: 860, igv: 154.8 },
  { tipo: '01', serie: 'F001', numero: '00000010', dia: 20, docTipo: '6', doc: '20587412369', razon: 'MINERA LOS ANDES S.A.C.', bi: 1950, igv: 351 },
  { tipo: '01', serie: 'F001', numero: '00000024', dia: 9, docTipo: '6', doc: '20458796321', razon: 'TEXTILES DEL PERU S.A.C.', bi: 2400, igv: 432 },
  { tipo: '01', serie: 'F002', numero: '00000015', dia: 15, docTipo: '6', doc: '20604512378', razon: 'SERVICIOS GENERALES SIGMA S.A.', bi: 3420, igv: 615.6 },
  { tipo: '01', serie: 'F002', numero: '00000018', dia: 22, docTipo: '6', doc: '10745896320', razon: 'CORPORACION PACIFICO S.A.C.', bi: 980, igv: 170 },
  { tipo: '03', serie: 'B001', numero: '00000008', dia: 18, docTipo: '6', doc: '10234567890', razon: 'TRANSPORTES RAPIDO E.I.R.L.', bi: 480, igv: 86.4 },
  { tipo: '03', serie: 'B001', numero: '00000040', dia: 11, docTipo: '1', doc: '09456782', razon: 'QUISPE MAMANI, ROSA', bi: 320, igv: 57.6 },
  { tipo: '07', serie: 'F001', numero: '00000025', dia: 24, docTipo: '6', doc: '20123456789', razon: 'FARMACIA CENTRAL S.A.C.', bi: -900, igv: -162 },
  { tipo: '07', serie: 'F001', numero: '00000030', dia: 14, docTipo: '6', doc: '20512345678', razon: 'COMERCIAL ANDINA S.A.C.', bi: -600, igv: -108 }
];

interface EstadoPeriodo {
  periodo: string;
  cargaSire: { nombreOriginal: string; numRegistros: number } | null;
  cargaEmpresa: CargaEmpresaItem | null;
  ventasEmpresa: VentaEmpresaItem[];
  erroresEmpresa: ObservacionEmpresaItem[];
  match: { idMatch: string; fechaEjecucion: string; detalle: MatchDetalleItem[] } | null;
}

@Injectable({ providedIn: 'root' })
export class VentasWorkspaceService {
  private estado = new Map<string, EstadoPeriodo>();
  private indiceCargas = new Map<string, string>();   // idCargaEmpresa -> periodo
  private indiceMatches = new Map<string, string>();  // idMatch -> periodo

  constructor() {
    this.registrar('202607', 'ventas_internas_julio_2026.xlsx', true);
    this.registrar('202606', 'registro_ventas_junio_2026.csv', true);
    this.registrar('202605', null, false);
  }

  private registrar(periodo: string, nombreEmpresa: string | null, conMatch: boolean): void {
    const est: EstadoPeriodo = {
      periodo,
      cargaSire: { nombreOriginal: `PDT-RVIE_${periodo}.TXT`, numRegistros: ROWS_SIRE.length },
      cargaEmpresa: null,
      ventasEmpresa: [],
      erroresEmpresa: [],
      match: null
    };
    this.estado.set(periodo, est);

    if (nombreEmpresa) {
      const idCarga = `mock-ce-${periodo}`;
      est.cargaEmpresa = {
        idCargaEmpresa: idCarga, periodo, nombreOriginal: nombreEmpresa,
        numRegistros: ROWS_EMPRESA.length, numObservaciones: 2,
        fechaCreacion: this.fechaMock(periodo)
      };
      this.indiceCargas.set(idCarga, periodo);
      est.ventasEmpresa = this.crearVentasEmpresa(idCarga, periodo, ROWS_EMPRESA);
      est.erroresEmpresa = this.crearObservaciones();

      if (conMatch) {
        this.construirMatch(periodo, this.fechaMock(periodo));
      }
    }
  }

  // --------------------------------------------------------------------------
  // Fase 2 — Datos de la empresa
  // --------------------------------------------------------------------------

  obtenerCargasEmpresa(): Observable<CargaEmpresaItem[]> {
    const items = Array.from(this.estado.values())
      .filter(e => !!e.cargaEmpresa)
      .map(e => e.cargaEmpresa!)
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
    return of(items).pipe(delay(500));
  }

  obtenerCargaEmpresa(idCargaEmpresa: string): Observable<CargaEmpresaItem> {
    const est = this.estadoPorCarga(idCargaEmpresa);
    if (!est || !est.cargaEmpresa) {
      return throwError(() => new Error('No se encontró el archivo de datos de la empresa.'));
    }
    return of({ ...est.cargaEmpresa }).pipe(delay(400));
  }

  obtenerVentasEmpresa(idCargaEmpresa: string): Observable<VentaEmpresaItem[]> {
    const est = this.estadoPorCarga(idCargaEmpresa);
    if (!est) {
      return throwError(() => new Error('No se encontró el archivo de datos de la empresa.'));
    }
    return of(est.ventasEmpresa.map(v => ({ ...v }))).pipe(delay(600));
  }

  obtenerErroresEmpresa(idCargaEmpresa: string): Observable<ObservacionEmpresaItem[]> {
    const est = this.estadoPorCarga(idCargaEmpresa);
    if (!est) {
      return throwError(() => new Error('No se encontró el archivo de datos de la empresa.'));
    }
    return of(est.erroresEmpresa.map(e => ({ ...e }))).pipe(delay(400));
  }

  cargarArchivoEmpresa(periodo: string, archivo: File): Observable<{ idCargaEmpresa: string; mensaje: string; numRegistros: number }> {
    if (!/\.(xlsx|csv)$/i.test(archivo.name)) {
      return throwError(() => new Error('Formato no permitido. Solo se aceptan archivos .xlsx o .csv según la plantilla.'));
    }
    const est = this.estado.get(periodo);
    if (!est) {
      return throwError(() => new Error('No se encontró el periodo indicado.'));
    }
    return of(null).pipe(
      delay(1200),
      map(() => {
        const idCarga = `mock-ce-${periodo}-${Date.now()}`;
        est.cargaEmpresa = {
          idCargaEmpresa: idCarga, periodo, nombreOriginal: archivo.name,
          numRegistros: ROWS_EMPRESA.length, numObservaciones: 2,
          fechaCreacion: new Date().toISOString()
        };
        this.indiceCargas.set(idCarga, periodo);
        est.ventasEmpresa = this.crearVentasEmpresa(idCarga, periodo, ROWS_EMPRESA);
        est.erroresEmpresa = this.crearObservaciones();
        // Reemplazar el archivo invalida el match previo del periodo
        if (est.match) {
          this.indiceMatches.delete(est.match.idMatch);
          est.match = null;
        }
        return {
          idCargaEmpresa: idCarga,
          mensaje: `Se procesaron ${ROWS_EMPRESA.length} registros del archivo "${archivo.name}" para el periodo ${periodo}.`,
          numRegistros: ROWS_EMPRESA.length
        };
      })
    );
  }

  actualizarVentasEmpresa(
    idCargaEmpresa: string,
    eliminados: string[],
    nuevos: VentaEmpresaItem[],
    modificados: VentaEmpresaItem[]
  ): Observable<{ mensaje: string; numObservaciones: number }> {
    const est = this.estadoPorCarga(idCargaEmpresa);
    if (!est || !est.cargaEmpresa) {
      return throwError(() => new Error('No se encontró el archivo de datos de la empresa.'));
    }
    return of(null).pipe(
      delay(1000),
      map(() => {
        est.ventasEmpresa = est.ventasEmpresa.filter(v => !eliminados.includes(v.idVentaEmpresa));
        for (const m of modificados) {
          const i = est.ventasEmpresa.findIndex(v => v.idVentaEmpresa === m.idVentaEmpresa);
          if (i >= 0) est.ventasEmpresa[i] = { ...m };
        }
        for (const n of nuevos) {
          est.ventasEmpresa.push({ ...n, idVentaEmpresa: `nuevo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
        }
        est.ventasEmpresa.sort((a, b) => a.numeroLinea - b.numeroLinea);
        est.ventasEmpresa.forEach((v, i) => (v.numeroLinea = i + 1));
        this.revalidarEmpresa(est);
        // Cambiar los datos empresa invalida el match del periodo
        if (est.match) {
          this.indiceMatches.delete(est.match.idMatch);
          est.match = null;
        }
        return {
          mensaje: `Datos actualizados correctamente: ${est.ventasEmpresa.length} registros, ${est.erroresEmpresa.length} observaciones.`,
          numObservaciones: est.erroresEmpresa.length
        };
      })
    );
  }

  eliminarCargaEmpresa(idCargaEmpresa: string): Observable<boolean> {
    const est = this.estadoPorCarga(idCargaEmpresa);
    if (!est || !est.cargaEmpresa) {
      return throwError(() => new Error('No se encontró el archivo de datos de la empresa.'));
    }
    return of(null).pipe(
      delay(800),
      map(() => {
        this.indiceCargas.delete(idCargaEmpresa);
        est.cargaEmpresa = null;
        est.ventasEmpresa = [];
        est.erroresEmpresa = [];
        if (est.match) {
          this.indiceMatches.delete(est.match.idMatch);
          est.match = null;
        }
        return true;
      })
    );
  }

  private revalidarEmpresa(est: EstadoPeriodo): void {
    const errores: ObservacionEmpresaItem[] = [];
    for (const v of est.ventasEmpresa) {
      if (v.codigoTipoDocIdentidad === '6' && !/^\d{11}$/.test(v.nroDocIdentidad)) {
        errores.push({
          numeroLinea: v.numeroLinea, tipoError: 'Formato', campoError: 'num_doc_identidad',
          valorLectura: v.nroDocIdentidad, severidad: 'Advertencia',
          mensaje: 'El RUC del cliente no tiene 11 dígitos.'
        });
      }
      if (v.codigoTipoDocIdentidad === '1' && !/^\d{8}$/.test(v.nroDocIdentidad)) {
        errores.push({
          numeroLinea: v.numeroLinea, tipoError: 'Formato', campoError: 'num_doc_identidad',
          valorLectura: v.nroDocIdentidad, severidad: 'Advertencia',
          mensaje: 'El DNI del cliente no tiene 8 dígitos.'
        });
      }
    }
    est.erroresEmpresa = errores;
    if (est.cargaEmpresa) {
      est.cargaEmpresa.numRegistros = est.ventasEmpresa.length;
      est.cargaEmpresa.numObservaciones = errores.length;
    }
  }

  // --------------------------------------------------------------------------
  // Fase 3 — Match de Información
  // --------------------------------------------------------------------------

  obtenerPanelMatch(): Observable<PanelMatchItem[]> {
    const items: PanelMatchItem[] = Array.from(this.estado.values())
      .filter(e => e.cargaSire || e.cargaEmpresa)
      .sort((a, b) => b.periodo.localeCompare(a.periodo))
      .map(e => ({
        periodo: e.periodo,
        sireCargado: !!e.cargaSire,
        empresaCargada: !!e.cargaEmpresa,
        match: e.match ? {
          idMatch: e.match.idMatch,
          fechaEjecucion: e.match.fechaEjecucion,
          totalCoincidentes: e.match.detalle.filter(d => d.resultado === 'Coincidente').length,
          totalConflictos: e.match.detalle.filter(d => d.resultado === 'Conflicto').length,
          totalSoloSire: e.match.detalle.filter(d => d.resultado === 'SoloSire').length,
          totalSoloEmpresa: e.match.detalle.filter(d => d.resultado === 'SoloEmpresa').length
        } : null
      }));
    return of(items).pipe(delay(500));
  }

  ejecutarMatch(periodo: string): Observable<MatchResumen> {
    const est = this.estado.get(periodo);
    if (!est) {
      return throwError(() => new Error('No se encontró el periodo indicado.'));
    }
    if (!est.cargaSire) {
      return throwError(() => new Error('Falta cargar el archivo SIRE del periodo (pestaña Datos SIRE).'));
    }
    if (!est.cargaEmpresa) {
      return throwError(() => new Error('Falta cargar los datos de la empresa (pestaña Datos Empresa).'));
    }
    return of(null).pipe(
      delay(1800),
      map(() => this.construirMatch(periodo, new Date().toISOString()))
    );
  }

  obtenerMatch(idMatch: string): Observable<MatchResumen> {
    const est = this.estadoPorMatch(idMatch);
    if (!est || !est.match) {
      return throwError(() => new Error('No se encontró el match indicado (pudo haber sido invalidado por una nueva carga).'));
    }
    return of(this.calcularResumen(est.match, est.periodo)).pipe(delay(500));
  }

  listarMatchDetalle(idMatch: string): Observable<MatchDetalleItem[]> {
    const est = this.estadoPorMatch(idMatch);
    if (!est || !est.match) {
      return throwError(() => new Error('No se encontró el match indicado.'));
    }
    return of(est.match.detalle.map(d => ({ ...d, consolidado: { ...d.consolidado } }))).pipe(delay(600));
  }

  actualizarMatchDetalle(
    idMatch: string,
    eliminados: string[],
    nuevos: ConsolidadoMatch[],
    modificados: { idDetalle: string; consolidado: ConsolidadoMatch }[]
  ): Observable<{ mensaje: string }> {
    const est = this.estadoPorMatch(idMatch);
    if (!est || !est.match) {
      return throwError(() => new Error('No se encontró el match indicado.'));
    }
    return of(null).pipe(
      delay(1000),
      map(() => {
        const match = est.match!;
        match.detalle = match.detalle.filter(d => !eliminados.includes(d.idDetalle));
        for (const m of modificados) {
          const i = match.detalle.findIndex(d => d.idDetalle === m.idDetalle);
          if (i >= 0) match.detalle[i].consolidado = { ...m.consolidado };
        }
        for (const n of nuevos) {
          match.detalle.push({
            idDetalle: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            resultado: 'Coincidente', origen: 'Manual',
            sire: null, empresa: null,
            consolidado: { ...n },
            camposConflicto: null, difBi: null, difIgv: null, difTotal: null
          });
        }
        return { mensaje: 'Consolidado actualizado correctamente.' };
      })
    );
  }

  // --------------------------------------------------------------------------
  // Construcción del match (lógica simulada)
  // --------------------------------------------------------------------------

  private construirMatch(periodo: string, fecha: string): MatchResumen {
    const est = this.estado.get(periodo)!;
    const anio = periodo.substring(0, 4);
    const mes = periodo.substring(4, 6);
    const f = (dia: number) => `${anio}-${mes}-${dia.toString().padStart(2, '0')}`;

    const aLado = (r: RowDef): LadoMatch => ({
      fechaEmision: f(r.dia), nroDocIdentidad: r.doc, razonSocial: r.razon,
      biGravada: r.bi, igvIpm: Number(r.igv.toFixed(2)), totalCp: Number((r.bi + r.igv).toFixed(2)),
      codigoMoneda: 'PEN'
    });
    const aConsolidado = (r: RowDef): ConsolidadoMatch => ({
      codigoTipoCp: r.tipo, serie: r.serie, numero: r.numero,
      fechaEmision: f(r.dia),
      codigoTipoDocIdentidad: r.docTipo, nroDocIdentidad: r.doc, razonSocial: r.razon,
      biGravada: r.bi, igvIpm: Number(r.igv.toFixed(2)), totalCp: Number((r.bi + r.igv).toFixed(2)),
      codigoMoneda: 'PEN'
    });

    const empresaMap = new Map<string, RowDef>();
    for (const r of ROWS_EMPRESA) empresaMap.set(this.clave(r.tipo, r.serie, r.numero), r);

    const detalle: MatchDetalleItem[] = [];
    let n = 0;
    const vistos = new Set<string>();

    for (const r of ROWS_SIRE) {
      const k = this.clave(r.tipo, r.serie, r.numero);
      if (vistos.has(k)) continue;
      vistos.add(k);
      const sire = aLado(r);
      const empRow = empresaMap.get(k) || null;

      if (!empRow) {
        detalle.push(this.filaDetalle(++n, 'SoloSire', 'Sire', sire, null, aConsolidado(r), null));
        continue;
      }
      const emp = aLado(empRow);
      const difBi = Number((emp.biGravada - sire.biGravada).toFixed(2));
      const difIgv = Number((emp.igvIpm - sire.igvIpm).toFixed(2));
      const difTotal = Number((emp.totalCp - sire.totalCp).toFixed(2));
      if (Math.abs(difBi) <= TOLERANCIA && Math.abs(difIgv) <= TOLERANCIA && Math.abs(difTotal) <= TOLERANCIA) {
        detalle.push(this.filaDetalle(++n, 'Coincidente', 'Ambos', sire, emp, aConsolidado(r), null, difBi, difIgv, difTotal));
      } else {
        const campos = [
          Math.abs(difBi) > TOLERANCIA ? 'bi_gravada' : null,
          Math.abs(difIgv) > TOLERANCIA ? 'igv_ipm' : null,
          Math.abs(difTotal) > TOLERANCIA ? 'total' : null
        ].filter(c => c).join(',');
        detalle.push(this.filaDetalle(++n, 'Conflicto', 'Ambos', sire, emp, aConsolidado(r), campos, difBi, difIgv, difTotal));
      }
    }
    for (const r of ROWS_EMPRESA) {
      const k = this.clave(r.tipo, r.serie, r.numero);
      if (vistos.has(k)) continue;
      vistos.add(k);
      detalle.push(this.filaDetalle(++n, 'SoloEmpresa', 'Empresa', null, aLado(r), aConsolidado(r), null));
    }

    const idMatch = `mock-match-${periodo}`;
    this.indiceMatches.set(idMatch, periodo);
    est.match = { idMatch, fechaEjecucion: fecha, detalle };
    return this.calcularResumen(est.match, periodo);
  }

  private filaDetalle(
    n: number, resultado: ResultadoMatch, origen: OrigenMatch,
    sire: LadoMatch | null, empresa: LadoMatch | null,
    consolidado: ConsolidadoMatch, camposConflicto: string | null,
    difBi: number | null = null, difIgv: number | null = null, difTotal: number | null = null
  ): MatchDetalleItem {
    return { idDetalle: `det-${n}`, resultado, origen, sire, empresa, consolidado, camposConflicto, difBi, difIgv, difTotal };
  }

  private calcularResumen(match: { idMatch: string; fechaEjecucion: string; detalle: MatchDetalleItem[] }, periodo: string): MatchResumen {
    const detalle = match.detalle;
    const suma = (lado: 'sire' | 'empresa', campo: 'biGravada' | 'igvIpm' | 'totalCp') =>
      detalle.reduce((acc, d) => acc + ((d[lado]?.[campo] as number) ?? 0), 0);

    const contar = (r: ResultadoMatch) => detalle.filter(d => d.resultado === r).length;
    const sumaBiSire = suma('sire', 'biGravada');
    const sumaIgvSire = suma('sire', 'igvIpm');
    const sumaTotalSire = suma('sire', 'totalCp');
    const sumaBiEmpresa = suma('empresa', 'biGravada');
    const sumaIgvEmpresa = suma('empresa', 'igvIpm');
    const sumaTotalEmpresa = suma('empresa', 'totalCp');

    return {
      idMatch: match.idMatch, periodo, fechaEjecucion: match.fechaEjecucion, ejecutadoPor: 'Usuario Demo',
      totalSire: contar('Coincidente') + contar('Conflicto') + contar('SoloSire'),
      totalEmpresa: contar('Coincidente') + contar('Conflicto') + contar('SoloEmpresa'),
      totalCoincidentes: contar('Coincidente'), totalConflictos: contar('Conflicto'),
      totalSoloSire: contar('SoloSire'), totalSoloEmpresa: contar('SoloEmpresa'),
      sumaBiSire, sumaIgvSire, sumaTotalSire, sumaBiEmpresa, sumaIgvEmpresa, sumaTotalEmpresa,
      difBi: Number((sumaBiEmpresa - sumaBiSire).toFixed(2)),
      difIgv: Number((sumaIgvEmpresa - sumaIgvSire).toFixed(2)),
      difTotal: Number((sumaTotalEmpresa - sumaTotalSire).toFixed(2))
    };
  }

  private clave(tipo: string, serie: string, numero: string): string {
    return `${tipo}|${serie.trim().toUpperCase()}|${numero.trim().replace(/^0+/, '') || '0'}`;
  }

  private estadoPorCarga(idCargaEmpresa: string): EstadoPeriodo | undefined {
    const periodo = this.indiceCargas.get(idCargaEmpresa);
    return periodo ? this.estado.get(periodo) : undefined;
  }

  private estadoPorMatch(idMatch: string): EstadoPeriodo | undefined {
    const periodo = this.indiceMatches.get(idMatch);
    return periodo ? this.estado.get(periodo) : undefined;
  }

  private crearVentasEmpresa(idCarga: string, periodo: string, rows: RowDef[]): VentaEmpresaItem[] {
    const anio = periodo.substring(0, 4);
    const mes = periodo.substring(4, 6);
    return rows.map((r, i) => ({
      idVentaEmpresa: `${idCarga}-v${i + 1}`,
      numeroLinea: i + 1,
      codigoTipoCp: r.tipo, serie: r.serie, numero: r.numero,
      fechaEmision: `${anio}-${mes}-${r.dia.toString().padStart(2, '0')}`,
      codigoTipoDocIdentidad: r.docTipo, nroDocIdentidad: r.doc, razonSocial: r.razon,
      biGravada: r.bi, igvIpm: Number(r.igv.toFixed(2)), totalCp: Number((r.bi + r.igv).toFixed(2)),
      codigoMoneda: 'PEN'
    }));
  }

  private crearObservaciones(): ObservacionEmpresaItem[] {
    return [
      {
        numeroLinea: 10, tipoError: 'Formato', campoError: 'num_doc_identidad',
        valorLectura: '09456782', severidad: 'Advertencia',
        mensaje: 'El DNI del cliente tiene 8 dígitos: verificar que corresponda a un documento vigente.'
      },
      {
        numeroLinea: 4, tipoError: 'Negocio', campoError: 'total',
        valorLectura: '2301.00', severidad: 'Advertencia',
        mensaje: 'El total no equivale a Base Imponible + IGV declarado en SIRE para el mismo comprobante.'
      }
    ];
  }

  private fechaMock(periodo: string): string {
    const anio = Number(periodo.substring(0, 4));
    const mes = Number(periodo.substring(4, 6));
    return new Date(anio, mes, 1, 10, 30).toISOString();
  }
}
