import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { zipSync, strToU8 } from 'fflate';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import {
  OperacionesService,
  ArchivoCargaItem,
  ArchivoCargaErrorItem,
  CompraMatchItem
} from '../../../services/operaciones.service';
import {
  CatalogoSunatService,
  TipoCpCatalogo,
  TipoDocIdentidadCatalogo,
  EstadoComprobanteCatalogo
} from '../../../services/catalogo-sunat.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalObservacionesComponent, ObservacionItem } from '../../../../../../shared/ui/modal-observaciones/modal-observaciones.component';
import { extraerMensajeError } from '../../../../../../core/utils/error-handler.util';

@Component({
  selector: 'app-match-resultado-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalObservacionesComponent],
  templateUrl: './match-resultado.component.html',
  styleUrl: './match-resultado.component.css'
})
export class MatchResultadoComprasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private empresaContext = inject(EmpresaContextService);
  private operacionesService = inject(OperacionesService);
  private catalogoSunatService = inject(CatalogoSunatService);
  private modalService = inject(ModalService);
  private loadingService = inject(LoadingService);
  private cdr = inject(ChangeDetectorRef);

  // Catálogos SUNAT
  tiposCp: TipoCpCatalogo[] = [];
  tiposDocIdentidad: TipoDocIdentidadCatalogo[] = [];
  estadosComprobante: EstadoComprobanteCatalogo[] = [];

  idEmpresa: string = '';
  idMatch: string = '';
  ruc: string = '';

  empresa: Empresa | null = null;
  cargaMatch: ArchivoCargaItem | null = null;
  comprasMatch: CompraMatchItem[] = [];
  erroresMatch: ArchivoCargaErrorItem[] = [];
  mostrarErrores: boolean = false;

  cargando: boolean = true;
  cargandoDatos: boolean = false;
  mensajeError: string | null = null;

  // Filtro Rápido por Pestaña de Estado
  filtroEstadoSeleccionado: 'Todos' | 'Coincidente' | 'Diferencia' | 'SoloSire' | 'SoloEmpresa' = 'Todos';

  // Filtros internos tipo Excel con soporte Multi-Columna
  filtroTexto: string = '';
  criteriosOrden: { columna: string; ascendente: boolean }[] = [];

  // Filtros Dropdown por columna
  menuFiltroFechaEmisionAbierto: boolean = false;
  fechasEmisionSeleccionadas: string[] = [];
  filtroTextoFechaEmisionMenu: string = '';

  menuFiltroTipoCpAbierto: boolean = false;
  tiposCpSeleccionados: string[] = [];
  filtroTextoTipoCpMenu: string = '';

  menuFiltroSerieAbierto: boolean = false;
  seriesSeleccionadas: string[] = [];
  filtroTextoSerieMenu: string = '';

  menuFiltroNumeroAbierto: boolean = false;
  numerosSeleccionados: string[] = [];
  filtroTextoNumeroMenu: string = '';

  menuFiltroTipoDocAbierto: boolean = false;
  tiposDocSeleccionados: string[] = [];
  filtroTextoTipoDocMenu: string = '';

  menuFiltroDocProveedorAbierto: boolean = false;
  docsProveedorSeleccionados: string[] = [];
  filtroTextoDocProveedorMenu: string = '';

  menuFiltroRazonSocialAbierto: boolean = false;
  razonesSocialesSeleccionadas: string[] = [];
  filtroTextoRazonSocialMenu: string = '';

  menuFiltroMonedaAbierto: boolean = false;
  monedasSeleccionadas: string[] = [];
  filtroTextoMonedaMenu: string = '';

  menuFiltroOrigenAbierto: boolean = false;
  origenesSeleccionados: string[] = [];
  filtroTextoOrigenMenu: string = '';

  menuFiltroEstadoMatchAbierto: boolean = false;
  estadosMatchSeleccionados: string[] = [];
  filtroTextoEstadoMatchMenu: string = '';

  // Métricas
  totalBaseImponibleDg: number = 0;
  totalIgvDg: number = 0;
  totalGeneral: number = 0;

  get totalBaseImponible(): number {
    return this.totalBaseImponibleDg;
  }

  get totalIgv(): number {
    return this.totalIgvDg;
  }

  // KPIs de Match
  totalCoincidentes: number = 0;
  totalDiferencias: number = 0;
  totalSoloSire: number = 0;
  totalSoloEmpresa: number = 0;

  ngOnInit(): void {
    this.cargarCatalogosSunat();
    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      this.idMatch = params.get('idMatch') || '';
      if (this.idEmpresa) {
        this.cargarDatosEmpresa();
      }
      if (this.idMatch) {
        this.cargarDetalleMatch();
      }
    });
  }

  cargarCatalogosSunat(): void {
    this.catalogoSunatService.obtenerTiposCp().subscribe({
      next: (tipos) => {
        this.tiposCp = tipos || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar catálogo tipo_cp:', err)
    });

    this.catalogoSunatService.obtenerTiposDocIdentidad().subscribe({
      next: (docs) => {
        this.tiposDocIdentidad = docs || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar catálogo tipo_doc_identidad:', err)
    });

    this.catalogoSunatService.obtenerEstadosComprobante().subscribe({
      next: (estados) => {
        this.estadosComprobante = estados || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar catálogo estado_comprobante:', err)
    });
  }

  cargarDatosEmpresa(): void {
    const delContexto = this.empresaContext.empresa();
    if (delContexto && delContexto.idEmpresa === this.idEmpresa) {
      this.empresa = delContexto;
      this.ruc = delContexto.ruc || '';
    }

    this.empresaService.obtenerPorId(this.idEmpresa).subscribe({
      next: (empresa) => {
        this.empresa = empresa;
        this.ruc = empresa?.ruc || '';
        this.cdr.detectChanges();
      }
    });
  }

  cargarDetalleMatch(): void {
    this.cargando = true;
    this.cargandoDatos = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    forkJoin({
      carga: this.operacionesService.obtenerCargaPorId(this.idMatch),
      compras: this.operacionesService.listarComprasMatch(this.idMatch),
      errores: this.operacionesService.obtenerErroresCarga(this.idMatch)
    }).subscribe({
      next: ({ carga, compras, errores }) => {
        this.cargando = false;
        this.cargandoDatos = false;
        this.cargaMatch = carga;
        this.comprasMatch = (compras || []).map(c => ({
          ...c,
          fechaEmision: this.formatearFechaInput(c.fechaEmision),
          fechaVencimiento: c.fechaVencimiento ? this.formatearFechaInput(c.fechaVencimiento) : ''
        }));
        this.erroresMatch = errores || [];
        this.recalcularTotales();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.cargandoDatos = false;
        this.mensajeError = extraerMensajeError(err, 'No se pudo recuperar el detalle del match de compras.');
        this.cdr.detectChanges();
      }
    });
  }

  // --- FILTRADO Y ORDENAMIENTO ---
  get comprasFiltradas(): CompraMatchItem[] {
    let list = this.comprasMatch;

    // Filtro rápido por Estado
    if (this.filtroEstadoSeleccionado === 'Coincidente') {
      list = list.filter(c => c.esCoincidenciaExacta);
    } else if (this.filtroEstadoSeleccionado === 'Diferencia') {
      list = list.filter(c => c.esDiferencia);
    } else if (this.filtroEstadoSeleccionado === 'SoloSire') {
      list = list.filter(c => c.esSoloUnOrigen && (c.origenDato || '').toUpperCase() === 'SIRE');
    } else if (this.filtroEstadoSeleccionado === 'SoloEmpresa') {
      list = list.filter(c => c.esSoloUnOrigen && (c.origenDato || '').toUpperCase() === 'EMPRESA');
    }

    if (this.fechasEmisionSeleccionadas.length > 0) {
      list = list.filter(c => {
        if (!c.fechaEmision) return false;
        const iso = typeof c.fechaEmision === 'string' ? c.fechaEmision.substring(0, 10) : new Date(c.fechaEmision).toISOString().substring(0, 10);
        return this.fechasEmisionSeleccionadas.includes(iso);
      });
    }

    if (this.tiposCpSeleccionados.length > 0) {
      list = list.filter(c => {
        const nombre = this.obtenerNombreTipoCp(c.codigoTipoCp) || 'DESCONOCIDO';
        return this.tiposCpSeleccionados.includes(nombre);
      });
    }

    if (this.seriesSeleccionadas.length > 0) {
      list = list.filter(c => {
        const s = (c.serie || '').trim().toUpperCase();
        return this.seriesSeleccionadas.includes(s);
      });
    }

    if (this.numerosSeleccionados.length > 0) {
      list = list.filter(c => {
        const n = (c.numero || '').trim();
        return this.numerosSeleccionados.includes(n);
      });
    }

    if (this.tiposDocSeleccionados.length > 0) {
      list = list.filter(c => {
        const nombre = this.obtenerNombreTipoDocIdentidad(c.codigoTipoDocIdentidad || '6') || 'DESCONOCIDO';
        return this.tiposDocSeleccionados.includes(nombre);
      });
    }

    if (this.docsProveedorSeleccionados.length > 0) {
      list = list.filter(c => {
        const doc = (c.nroDocIdentidad || '').trim();
        return this.docsProveedorSeleccionados.includes(doc);
      });
    }

    if (this.razonesSocialesSeleccionadas.length > 0) {
      list = list.filter(c => {
        const rs = (c.razonSocial || '').trim();
        return this.razonesSocialesSeleccionadas.includes(rs);
      });
    }

    if (this.monedasSeleccionadas.length > 0) {
      list = list.filter(c => {
        const m = (c.codigoMoneda || 'PEN').trim().toUpperCase();
        return this.monedasSeleccionadas.includes(m);
      });
    }

    if (this.origenesSeleccionados.length > 0) {
      list = list.filter(c => {
        const orig = (c.origenDato || '').trim().toUpperCase();
        return this.origenesSeleccionados.includes(orig);
      });
    }

    if (this.estadosMatchSeleccionados.length > 0) {
      list = list.filter(c => {
        const est = this.obtenerEtiquetaEstadoMatch(c);
        return this.estadosMatchSeleccionados.includes(est);
      });
    }

    if (this.filtroTexto) {
      const txt = this.filtroTexto.toLowerCase().trim();
      list = list.filter(
        c =>
          (c.nroDocIdentidad && c.nroDocIdentidad.toLowerCase().includes(txt)) ||
          (c.razonSocial && c.razonSocial.toLowerCase().includes(txt)) ||
          `${c.serie}-${c.numero}`.toLowerCase().includes(txt) ||
          (c.codigoTipoCp && (c.codigoTipoCp.toLowerCase().includes(txt) || this.obtenerNombreTipoCp(c.codigoTipoCp).toLowerCase().includes(txt))) ||
          (c.codigoTipoDocIdentidad && (c.codigoTipoDocIdentidad.toLowerCase().includes(txt) || this.obtenerNombreTipoDocIdentidad(c.codigoTipoDocIdentidad).toLowerCase().includes(txt))) ||
          (c.origenDato && c.origenDato.toLowerCase().includes(txt)) ||
          this.obtenerEtiquetaEstadoMatch(c).toLowerCase().includes(txt)
      );
    }

    if (this.criteriosOrden.length > 0) {
      list = list.slice().sort((a, b) => {
        for (const cr of this.criteriosOrden) {
          let valA: any = (a as any)[cr.columna];
          let valB: any = (b as any)[cr.columna];

          if (['biGravadoDg', 'igvIpmDg', 'totalCp', 'tipoCambio', 'biGravadoDgng', 'igvIpmDgng', 'biGravadoDng', 'igvIpmDng', 'valorAdqNg', 'montoIsc', 'montoIcbper', 'montoOtrosTributos'].includes(cr.columna)) {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
          } else {
            valA = (valA ?? '').toString().toLowerCase();
            valB = (valB ?? '').toString().toLowerCase();
          }

          if (valA < valB) return cr.ascendente ? -1 : 1;
          if (valA > valB) return cr.ascendente ? 1 : -1;
        }
        return 0;
      });
    }

    return list;
  }

  recalcularTotales(): void {
    const todos = this.comprasMatch;
    this.totalCoincidentes = todos.filter(c => c.esCoincidenciaExacta).length;
    this.totalDiferencias = todos.filter(c => c.esDiferencia).length;
    this.totalSoloSire = todos.filter(c => c.esSoloUnOrigen && (c.origenDato || '').toUpperCase() === 'SIRE').length;
    this.totalSoloEmpresa = todos.filter(c => c.esSoloUnOrigen && (c.origenDato || '').toUpperCase() === 'EMPRESA').length;

    const lista = this.comprasFiltradas;
    this.totalBaseImponibleDg = lista.reduce((acc, c) => acc + (Number(c.biGravadoDg) || 0), 0);
    this.totalIgvDg = lista.reduce((acc, c) => acc + (Number(c.igvIpmDg) || 0), 0);
    this.totalGeneral = lista.reduce((acc, c) => acc + (Number(c.totalCp) || 0), 0);
    this.cdr.detectChanges();
  }

  ordenarPor(columna: string): void {
    const index = this.criteriosOrden.findIndex(c => c.columna === columna);

    if (index >= 0) {
      if (this.criteriosOrden[index].ascendente) {
        this.criteriosOrden[index].ascendente = false;
      } else {
        this.criteriosOrden.splice(index, 1);
      }
    } else {
      this.criteriosOrden.push({ columna, ascendente: true });
    }
    this.recalcularTotales();
  }

  obtenerEstadoOrden(columna: string): { activo: boolean; ascendente: boolean; ordenIndice: number } {
    const idx = this.criteriosOrden.findIndex(c => c.columna === columna);
    if (idx >= 0) {
      return {
        activo: true,
        ascendente: this.criteriosOrden[idx].ascendente,
        ordenIndice: this.criteriosOrden.length > 1 ? idx + 1 : 0
      };
    }
    return { activo: false, ascendente: true, ordenIndice: 0 };
  }

  // --- OPCIONES DINÁMICAS DE FILTROS ---
  // Fecha Emisión
  get opcionesFechaEmisionDisponibles(): { fechaIso: string; fechaFormato: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      if (c.fechaEmision) {
        const iso = typeof c.fechaEmision === 'string' ? c.fechaEmision.substring(0, 10) : new Date(c.fechaEmision).toISOString().substring(0, 10);
        mapa.set(iso, (mapa.get(iso) || 0) + 1);
      }
    }
    return Array.from(mapa.entries())
      .map(([fechaIso, cantidad]) => {
        const partes = fechaIso.split('-');
        const fechaFormato = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaIso;
        return { fechaIso, fechaFormato, cantidad };
      })
      .sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));
  }

  get opcionesFechaEmisionFiltradas(): { fechaIso: string; fechaFormato: string; cantidad: number }[] {
    if (!this.filtroTextoFechaEmisionMenu.trim()) return this.opcionesFechaEmisionDisponibles;
    const txt = this.filtroTextoFechaEmisionMenu.toLowerCase().trim();
    return this.opcionesFechaEmisionDisponibles.filter(op =>
      op.fechaFormato.toLowerCase().includes(txt) || op.fechaIso.toLowerCase().includes(txt)
    );
  }

  toggleMenuFiltroFechaEmision(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('fechaEmision');
    this.menuFiltroFechaEmisionAbierto = !this.menuFiltroFechaEmisionAbierto;
    if (this.menuFiltroFechaEmisionAbierto) this.filtroTextoFechaEmisionMenu = '';
  }

  toggleSeleccionFechaEmision(fechaIso: string): void {
    const idx = this.fechasEmisionSeleccionadas.indexOf(fechaIso);
    if (idx >= 0) this.fechasEmisionSeleccionadas.splice(idx, 1);
    else this.fechasEmisionSeleccionadas.push(fechaIso);
    this.recalcularTotales();
  }

  estaFechaEmisionSeleccionada(fechaIso: string): boolean {
    return this.fechasEmisionSeleccionadas.includes(fechaIso);
  }

  seleccionarTodasFechasEmision(): void {
    this.fechasEmisionSeleccionadas = this.opcionesFechaEmisionDisponibles.map(o => o.fechaIso);
    this.recalcularTotales();
  }

  limpiarFiltroFechasEmision(): void {
    this.fechasEmisionSeleccionadas = [];
    this.recalcularTotales();
  }

  // Tipo CP
  get opcionesTipoCpDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const nombre = this.obtenerNombreTipoCp(c.codigoTipoCp) || 'DESCONOCIDO';
      mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesTipoCpFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoTipoCpMenu.trim()) return this.opcionesTipoCpDisponibles;
    const txt = this.filtroTextoTipoCpMenu.toLowerCase().trim();
    return this.opcionesTipoCpDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroTipoCp(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('tipoCp');
    this.menuFiltroTipoCpAbierto = !this.menuFiltroTipoCpAbierto;
    if (this.menuFiltroTipoCpAbierto) this.filtroTextoTipoCpMenu = '';
  }

  toggleSeleccionTipoCp(nombre: string): void {
    const idx = this.tiposCpSeleccionados.indexOf(nombre);
    if (idx >= 0) this.tiposCpSeleccionados.splice(idx, 1);
    else this.tiposCpSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaTipoCpSeleccionado(nombre: string): boolean {
    return this.tiposCpSeleccionados.includes(nombre);
  }

  seleccionarTodosTiposCp(): void {
    this.tiposCpSeleccionados = this.opcionesTipoCpDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroTiposCp(): void {
    this.tiposCpSeleccionados = [];
    this.recalcularTotales();
  }

  // Serie
  get opcionesSerieDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const nombre = (c.serie || '').trim().toUpperCase();
      if (nombre) mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesSerieFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoSerieMenu.trim()) return this.opcionesSerieDisponibles;
    const txt = this.filtroTextoSerieMenu.toLowerCase().trim();
    return this.opcionesSerieDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroSerie(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('serie');
    this.menuFiltroSerieAbierto = !this.menuFiltroSerieAbierto;
    if (this.menuFiltroSerieAbierto) this.filtroTextoSerieMenu = '';
  }

  toggleSeleccionSerie(nombre: string): void {
    const idx = this.seriesSeleccionadas.indexOf(nombre);
    if (idx >= 0) this.seriesSeleccionadas.splice(idx, 1);
    else this.seriesSeleccionadas.push(nombre);
    this.recalcularTotales();
  }

  estaSerieSeleccionada(nombre: string): boolean {
    return this.seriesSeleccionadas.includes(nombre);
  }

  seleccionarTodasSeries(): void {
    this.seriesSeleccionadas = this.opcionesSerieDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroSeries(): void {
    this.seriesSeleccionadas = [];
    this.recalcularTotales();
  }

  // Número
  get opcionesNumeroDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const nombre = (c.numero || '').trim();
      if (nombre) mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => {
        const numA = parseInt(a.nombre, 10);
        const numB = parseInt(b.nombre, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.nombre.localeCompare(b.nombre);
      });
  }

  get opcionesNumeroFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoNumeroMenu.trim()) return this.opcionesNumeroDisponibles;
    const txt = this.filtroTextoNumeroMenu.toLowerCase().trim();
    return this.opcionesNumeroDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroNumero(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('numero');
    this.menuFiltroNumeroAbierto = !this.menuFiltroNumeroAbierto;
    if (this.menuFiltroNumeroAbierto) this.filtroTextoNumeroMenu = '';
  }

  toggleSeleccionNumero(nombre: string): void {
    const idx = this.numerosSeleccionados.indexOf(nombre);
    if (idx >= 0) this.numerosSeleccionados.splice(idx, 1);
    else this.numerosSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaNumeroSeleccionado(nombre: string): boolean {
    return this.numerosSeleccionados.includes(nombre);
  }

  seleccionarTodosNumeros(): void {
    this.numerosSeleccionados = this.opcionesNumeroDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroNumeros(): void {
    this.numerosSeleccionados = [];
    this.recalcularTotales();
  }

  // Tipo Doc Identidad
  get opcionesTipoDocDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const nombre = this.obtenerNombreTipoDocIdentidad(c.codigoTipoDocIdentidad || '6') || 'DESCONOCIDO';
      mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesTipoDocFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoTipoDocMenu.trim()) return this.opcionesTipoDocDisponibles;
    const txt = this.filtroTextoTipoDocMenu.toLowerCase().trim();
    return this.opcionesTipoDocDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroTipoDoc(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('tipoDoc');
    this.menuFiltroTipoDocAbierto = !this.menuFiltroTipoDocAbierto;
    if (this.menuFiltroTipoDocAbierto) this.filtroTextoTipoDocMenu = '';
  }

  toggleSeleccionTipoDoc(nombre: string): void {
    const idx = this.tiposDocSeleccionados.indexOf(nombre);
    if (idx >= 0) this.tiposDocSeleccionados.splice(idx, 1);
    else this.tiposDocSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaTipoDocSeleccionado(nombre: string): boolean {
    return this.tiposDocSeleccionados.includes(nombre);
  }

  seleccionarTodosTiposDoc(): void {
    this.tiposDocSeleccionados = this.opcionesTipoDocDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroTiposDoc(): void {
    this.tiposDocSeleccionados = [];
    this.recalcularTotales();
  }

  // Doc Proveedor (RUC / DNI)
  get opcionesDocProveedorDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const doc = (c.nroDocIdentidad || '').trim();
      if (doc) mapa.set(doc, (mapa.get(doc) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesDocProveedorFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoDocProveedorMenu.trim()) return this.opcionesDocProveedorDisponibles;
    const txt = this.filtroTextoDocProveedorMenu.toLowerCase().trim();
    return this.opcionesDocProveedorDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroDocProveedor(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('docProveedor');
    this.menuFiltroDocProveedorAbierto = !this.menuFiltroDocProveedorAbierto;
    if (this.menuFiltroDocProveedorAbierto) this.filtroTextoDocProveedorMenu = '';
  }

  toggleSeleccionDocProveedor(nombre: string): void {
    const idx = this.docsProveedorSeleccionados.indexOf(nombre);
    if (idx >= 0) this.docsProveedorSeleccionados.splice(idx, 1);
    else this.docsProveedorSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaDocProveedorSeleccionado(nombre: string): boolean {
    return this.docsProveedorSeleccionados.includes(nombre);
  }

  seleccionarTodosDocsProveedor(): void {
    this.docsProveedorSeleccionados = this.opcionesDocProveedorDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroDocsProveedor(): void {
    this.docsProveedorSeleccionados = [];
    this.recalcularTotales();
  }

  // Razón Social Proveedor
  get opcionesRazonSocialDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const rs = (c.razonSocial || '').trim();
      if (rs) mapa.set(rs, (mapa.get(rs) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesRazonSocialFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoRazonSocialMenu.trim()) return this.opcionesRazonSocialDisponibles;
    const txt = this.filtroTextoRazonSocialMenu.toLowerCase().trim();
    return this.opcionesRazonSocialDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroRazonSocial(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('razonSocial');
    this.menuFiltroRazonSocialAbierto = !this.menuFiltroRazonSocialAbierto;
    if (this.menuFiltroRazonSocialAbierto) this.filtroTextoRazonSocialMenu = '';
  }

  toggleSeleccionRazonSocial(nombre: string): void {
    const idx = this.razonesSocialesSeleccionadas.indexOf(nombre);
    if (idx >= 0) this.razonesSocialesSeleccionadas.splice(idx, 1);
    else this.razonesSocialesSeleccionadas.push(nombre);
    this.recalcularTotales();
  }

  estaRazonSocialSeleccionada(nombre: string): boolean {
    return this.razonesSocialesSeleccionadas.includes(nombre);
  }

  seleccionarTodasRazonesSociales(): void {
    this.razonesSocialesSeleccionadas = this.opcionesRazonSocialDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroRazonesSociales(): void {
    this.razonesSocialesSeleccionadas = [];
    this.recalcularTotales();
  }

  // Moneda
  get opcionesMonedaDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const m = (c.codigoMoneda || 'PEN').trim().toUpperCase();
      mapa.set(m, (mapa.get(m) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesMonedaFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoMonedaMenu.trim()) return this.opcionesMonedaDisponibles;
    const txt = this.filtroTextoMonedaMenu.toLowerCase().trim();
    return this.opcionesMonedaDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroMoneda(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('moneda');
    this.menuFiltroMonedaAbierto = !this.menuFiltroMonedaAbierto;
    if (this.menuFiltroMonedaAbierto) this.filtroTextoMonedaMenu = '';
  }

  toggleSeleccionMoneda(nombre: string): void {
    const idx = this.monedasSeleccionadas.indexOf(nombre);
    if (idx >= 0) this.monedasSeleccionadas.splice(idx, 1);
    else this.monedasSeleccionadas.push(nombre);
    this.recalcularTotales();
  }

  estaMonedaSeleccionada(nombre: string): boolean {
    return this.monedasSeleccionadas.includes(nombre);
  }

  seleccionarTodasMonedas(): void {
    this.monedasSeleccionadas = this.opcionesMonedaDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroMonedas(): void {
    this.monedasSeleccionadas = [];
    this.recalcularTotales();
  }

  // Origen de Dato (SIRE / EMPRESA)
  get opcionesOrigenDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const orig = (c.origenDato || '').trim().toUpperCase();
      if (orig) mapa.set(orig, (mapa.get(orig) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesOrigenFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoOrigenMenu.trim()) return this.opcionesOrigenDisponibles;
    const txt = this.filtroTextoOrigenMenu.toLowerCase().trim();
    return this.opcionesOrigenDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroOrigen(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('origen');
    this.menuFiltroOrigenAbierto = !this.menuFiltroOrigenAbierto;
    if (this.menuFiltroOrigenAbierto) this.filtroTextoOrigenMenu = '';
  }

  toggleSeleccionOrigen(nombre: string): void {
    const idx = this.origenesSeleccionados.indexOf(nombre);
    if (idx >= 0) this.origenesSeleccionados.splice(idx, 1);
    else this.origenesSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaOrigenSeleccionado(nombre: string): boolean {
    return this.origenesSeleccionados.includes(nombre);
  }

  seleccionarTodosOrigenes(): void {
    this.origenesSeleccionados = this.opcionesOrigenDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroOrigenes(): void {
    this.origenesSeleccionados = [];
    this.recalcularTotales();
  }

  // Estado del Match (COINCIDENTE / DIFERENCIA / SOLO UN ORIGEN)
  get opcionesEstadoMatchDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const c of this.comprasMatch) {
      const est = this.obtenerEtiquetaEstadoMatch(c);
      mapa.set(est, (mapa.get(est) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesEstadoMatchFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoEstadoMatchMenu.trim()) return this.opcionesEstadoMatchDisponibles;
    const txt = this.filtroTextoEstadoMatchMenu.toLowerCase().trim();
    return this.opcionesEstadoMatchDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroEstadoMatch(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('estadoMatch');
    this.menuFiltroEstadoMatchAbierto = !this.menuFiltroEstadoMatchAbierto;
    if (this.menuFiltroEstadoMatchAbierto) this.filtroTextoEstadoMatchMenu = '';
  }

  toggleSeleccionEstadoMatch(nombre: string): void {
    const idx = this.estadosMatchSeleccionados.indexOf(nombre);
    if (idx >= 0) this.estadosMatchSeleccionados.splice(idx, 1);
    else this.estadosMatchSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaEstadoMatchSeleccionado(nombre: string): boolean {
    return this.estadosMatchSeleccionados.includes(nombre);
  }

  seleccionarTodosEstadosMatch(): void {
    this.estadosMatchSeleccionados = this.opcionesEstadoMatchDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroEstadosMatch(): void {
    this.estadosMatchSeleccionados = [];
    this.recalcularTotales();
  }

  cerrarOtrosMenus(excepto: string): void {
    if (excepto !== 'fechaEmision') this.menuFiltroFechaEmisionAbierto = false;
    if (excepto !== 'tipoCp') this.menuFiltroTipoCpAbierto = false;
    if (excepto !== 'serie') this.menuFiltroSerieAbierto = false;
    if (excepto !== 'numero') this.menuFiltroNumeroAbierto = false;
    if (excepto !== 'tipoDoc') this.menuFiltroTipoDocAbierto = false;
    if (excepto !== 'docProveedor') this.menuFiltroDocProveedorAbierto = false;
    if (excepto !== 'razonSocial') this.menuFiltroRazonSocialAbierto = false;
    if (excepto !== 'moneda') this.menuFiltroMonedaAbierto = false;
    if (excepto !== 'origen') this.menuFiltroOrigenAbierto = false;
    if (excepto !== 'estadoMatch') this.menuFiltroEstadoMatchAbierto = false;
  }

  // --- MÉTODOS DE BÚSQUEDA Y AYUDA DE CATÁLOGO ---
  obtenerNombreTipoCp(codigo: string | null | undefined): string {
    if (!codigo) return '-';
    const clean = codigo.toString().trim().padStart(2, '0');
    const encontrado = this.tiposCp.find(t => t.codigo.trim().padStart(2, '0') === clean);
    return encontrado ? encontrado.nombre : codigo;
  }

  obtenerNombreTipoDocIdentidad(codigo: string | null | undefined): string {
    if (!codigo) return '-';
    const clean = codigo.toString().trim();
    const encontrado = this.tiposDocIdentidad.find(d => d.codigo.trim() === clean);
    return encontrado ? encontrado.nombre : codigo;
  }

  obtenerNombreEstadoComprobante(codigo: string | null | undefined): string {
    if (!codigo) return '-';
    const clean = codigo.toString().trim();
    const encontrado = this.estadosComprobante.find(e => e.codigo.trim() === clean);
    return encontrado ? encontrado.nombre : codigo;
  }

  obtenerEtiquetaEstadoMatch(c: CompraMatchItem): string {
    if (c.esCoincidenciaExacta) return 'COINCIDENTE';
    if (c.esDiferencia) return 'DIFERENCIA';
    if (c.esSoloUnOrigen) return 'SOLO UN ORIGEN';
    return 'SIN ESTADO';
  }

  obtenerBadgeClaseEstadoMatch(c: CompraMatchItem): string {
    if (c.esCoincidenciaExacta) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (c.esDiferencia) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (c.esSoloUnOrigen) return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }

  obtenerBadgeClaseOrigen(origen: string | null | undefined): string {
    const orig = (origen || '').toUpperCase();
    if (orig === 'SIRE') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (orig === 'EMPRESA') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

  // Registros marcados para eliminación y nuevos registros editables (FrontEnd)
  idsParaEliminar: string[] = [];
  guardandoCambios: boolean = false;

  obtenerFechaDefecto(): string {
    const periodo = this.cargaMatch?.periodo || '';
    if (periodo.length === 6) {
      const a = periodo.substring(0, 4);
      const m = periodo.substring(4, 6);
      return `${a}-${m}-01`;
    }
    const d = new Date();
    return d.toISOString().substring(0, 10);
  }

  insertarFilaVisual(referenciaCompraOIndice: CompraMatchItem | number, event?: Event): void {
    if (event) event.stopPropagation();

    if (this.criteriosOrden.length > 0) {
      this.criteriosOrden = [];
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fechaDefecto = typeof referenciaCompraOIndice === 'object' && referenciaCompraOIndice?.fechaEmision
      ? this.formatearFechaInput(referenciaCompraOIndice.fechaEmision)
      : this.obtenerFechaDefecto();

    const serieDefecto = typeof referenciaCompraOIndice === 'object' && referenciaCompraOIndice?.serie
      ? referenciaCompraOIndice.serie
      : 'F001';

    const nuevaFila: CompraMatchItem = {
      idCompraMatch: tempId,
      idCarga: this.idMatch,
      empresaRuc: this.ruc,
      periodo: this.cargaMatch?.periodo || '',
      numeroLinea: this.comprasMatch.length + 1,
      origenDato: 'SIRE',
      esCoincidenciaExacta: true,
      esDiferencia: false,
      esSoloUnOrigen: false,
      carSunat: '',
      codigoTipoCp: '01',
      serie: serieDefecto,
      numero: '',
      fechaEmision: fechaDefecto,
      codigoTipoDocIdentidad: '6',
      nroDocIdentidad: '',
      razonSocial: '',
      biGravadoDg: 0,
      igvIpmDg: 0,
      biGravadoDgng: 0,
      igvIpmDgng: 0,
      biGravadoDng: 0,
      igvIpmDng: 0,
      valorAdqNg: 0,
      montoIsc: 0,
      montoIcbper: 0,
      montoOtrosTributos: 0,
      totalCp: 0,
      codigoMoneda: 'PEN',
      tipoCambio: 1.0,
      codigoEstadoComprobante: '1',
      esNuevo: true
    };

    if (typeof referenciaCompraOIndice === 'number') {
      if (referenciaCompraOIndice <= 0) {
        this.comprasMatch.unshift(nuevaFila);
      } else if (referenciaCompraOIndice >= this.comprasMatch.length) {
        this.comprasMatch.push(nuevaFila);
      } else {
        this.comprasMatch.splice(referenciaCompraOIndice, 0, nuevaFila);
      }
    } else {
      const idx = this.comprasMatch.indexOf(referenciaCompraOIndice);
      if (idx >= 0) {
        this.comprasMatch.splice(idx, 0, nuevaFila);
      } else {
        this.comprasMatch.unshift(nuevaFila);
      }
    }

    this.recalcularTotales();
    this.cdr.detectChanges();
  }

  trackByCompraMatch(index: number, item: CompraMatchItem): string {
    return item.idCompraMatch || `item_${index}`;
  }

  formatearFechaInput(fechaStr: string | null | undefined): string {
    if (!fechaStr) return this.obtenerFechaDefecto();
    if (fechaStr.includes('T')) {
      return fechaStr.split('T')[0];
    }
    if (fechaStr.length >= 10 && fechaStr.includes('-')) {
      return fechaStr.substring(0, 10);
    }
    if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const anio = partes[2];
        return `${anio}-${mes}-${dia}`;
      }
    }
    return fechaStr;
  }

  iniciarEdicionFila(compra: CompraMatchItem, event?: Event): void {
    if (event) event.stopPropagation();

    this.comprasMatch.forEach(c => {
      if (c !== compra && c.editando) {
        c.editando = false;
      }
    });

    if (compra.fechaEmision) {
      compra.fechaEmision = this.formatearFechaInput(compra.fechaEmision);
    }

    if (!(compra as any)._original) {
      (compra as any)._original = {
        fechaEmision: compra.fechaEmision,
        codigoTipoCp: compra.codigoTipoCp,
        serie: compra.serie,
        numero: compra.numero,
        codigoTipoDocIdentidad: compra.codigoTipoDocIdentidad,
        nroDocIdentidad: compra.nroDocIdentidad,
        razonSocial: compra.razonSocial,
        biGravadoDg: Number(compra.biGravadoDg) || 0,
        igvIpmDg: Number(compra.igvIpmDg) || 0,
        totalCp: Number(compra.totalCp) || 0,
        codigoEstadoComprobante: compra.codigoEstadoComprobante,
        origenDato: compra.origenDato
      };
    }

    compra.editando = true;
    this.cdr.detectChanges();
  }

  verificarYMarcarModificacion(compra: CompraMatchItem): void {
    if (compra.esNuevo) return;

    const orig = (compra as any)._original;
    if (!orig) return;

    const cambioFecha = (compra.fechaEmision || '') !== (orig.fechaEmision || '');
    const cambioTipoCp = (compra.codigoTipoCp || '') !== (orig.codigoTipoCp || '');
    const cambioSerie = (compra.serie || '').trim().toUpperCase() !== (orig.serie || '').trim().toUpperCase();
    const cambioNumero = (compra.numero || '').trim() !== (orig.numero || '').trim();
    const cambioTipoDoc = (compra.codigoTipoDocIdentidad || '') !== (orig.codigoTipoDocIdentidad || '');
    const cambioNroDoc = (compra.nroDocIdentidad || '').trim() !== (orig.nroDocIdentidad || '').trim();
    const cambioRazon = (compra.razonSocial || '').trim().toUpperCase() !== (orig.razonSocial || '').trim().toUpperCase();
    const cambioBi = (Number(compra.biGravadoDg) || 0) !== (Number(orig.biGravadoDg) || 0);
    const cambioIgv = (Number(compra.igvIpmDg) || 0) !== (Number(orig.igvIpmDg) || 0);
    const cambioTotal = (Number(compra.totalCp) || 0) !== (Number(orig.totalCp) || 0);
    const cambioEstado = (compra.codigoEstadoComprobante || '') !== (orig.codigoEstadoComprobante || '');
    const cambioOrigen = (compra.origenDato || '') !== (orig.origenDato || '');

    const haCambiado = cambioFecha || cambioTipoCp || cambioSerie || cambioNumero ||
                       cambioTipoDoc || cambioNroDoc || cambioRazon ||
                       cambioBi || cambioIgv || cambioTotal || cambioEstado || cambioOrigen;

    compra.modificado = haCambiado;
  }

  marcarFilaModificada(compra: CompraMatchItem): void {
    this.verificarYMarcarModificacion(compra);
  }

  obtenerLongitudMaxDocIdentidad(tipoDoc: string | null | undefined): number {
    const t = (tipoDoc || '').trim();
    if (t === '1') return 8;   // DNI
    if (t === '6') return 11;  // RUC
    return 15;                // Otros
  }

  obtenerPlaceholderDocIdentidad(tipoDoc: string | null | undefined): string {
    const t = (tipoDoc || '').trim();
    if (t === '1') return 'DNI (8 dígitos)';
    if (t === '6') return 'RUC (20/10...)';
    return 'Nro Documento';
  }

  onTipoDocIdentidadCambio(compra: CompraMatchItem): void {
    this.sanitizarNroDocIdentidad(compra);
    this.verificarYMarcarModificacion(compra);
  }

  onNroDocIdentidadInput(compra: CompraMatchItem): void {
    this.sanitizarNroDocIdentidad(compra);
    this.verificarYMarcarModificacion(compra);
  }

  sanitizarNroDocIdentidad(compra: CompraMatchItem): void {
    if (!compra.nroDocIdentidad) return;

    let valor = compra.nroDocIdentidad.toString();
    valor = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    valor = valor.replace(/\s+/g, '');

    const tipo = (compra.codigoTipoDocIdentidad || '').trim();

    if (tipo === '1' || tipo === '6') {
      valor = valor.replace(/\D/g, '');
      const maxLen = tipo === '1' ? 8 : 11;
      if (valor.length > maxLen) {
        valor = valor.substring(0, maxLen);
      }
    } else {
      valor = valor.replace(/[^a-zA-Z0-9]/g, '');
      if (valor.length > 15) {
        valor = valor.substring(0, 15);
      }
    }

    compra.nroDocIdentidad = valor;
  }

  validarDocIdentidad(tipoDoc: string | null | undefined, nroDoc: string | null | undefined): { valido: boolean; mensaje?: string } {
    const tipo = (tipoDoc || '').trim();
    const doc = (nroDoc || '').trim();

    if (!doc) {
      return { valido: false, mensaje: 'El número de documento es obligatorio.' };
    }

    if (tipo === '1') {
      if (!/^\d{8}$/.test(doc)) {
        return { valido: false, mensaje: `El DNI '${doc}' debe tener exactamente 8 dígitos numéricos.` };
      }
    } else if (tipo === '6') {
      if (!/^\d{11}$/.test(doc)) {
        return { valido: false, mensaje: `El RUC '${doc}' debe tener exactamente 11 dígitos numéricos.` };
      }
      const prefijo = doc.substring(0, 2);
      if (!['10', '20', '15', '17'].includes(prefijo)) {
        return { valido: false, mensaje: `El RUC '${doc}' es inválido. Debe iniciar con 10, 20, 15 o 17.` };
      }
    } else {
      if (!/^[a-zA-Z0-9]{1,15}$/.test(doc)) {
        return { valido: false, mensaje: `El documento '${doc}' contiene caracteres no permitidos (máx. 15 alfanuméricos).` };
      }
    }

    return { valido: true };
  }

  esDocIdentidadInvalido(compra: CompraMatchItem): boolean {
    if (!compra.nroDocIdentidad && !compra.esNuevo && !compra.editando) return false;
    return !this.validarDocIdentidad(compra.codigoTipoDocIdentidad, compra.nroDocIdentidad).valido;
  }

  finalizarEdicionFila(compra: CompraMatchItem): void {
    this.sanitizarNroDocIdentidad(compra);
    this.verificarYMarcarModificacion(compra);
    compra.editando = false;
    this.cdr.detectChanges();
  }

  onBiGravadaCambio(compra: any): void {
    this.verificarYMarcarModificacion(compra);
    this.recalcularTotales();
  }

  onIgvCambio(compra: any): void {
    this.verificarYMarcarModificacion(compra);
    this.recalcularTotales();
  }

  get filasNuevas(): (CompraMatchItem & { esNuevo?: boolean })[] {
    return (this.comprasMatch as any[]).filter(c => c.esNuevo === true || (c.idCompraMatch && c.idCompraMatch.startsWith('temp_')));
  }

  get filasModificadas(): CompraMatchItem[] {
    return (this.comprasMatch as any[]).filter(c => !c.esNuevo && (!c.idCompraMatch || !c.idCompraMatch.startsWith('temp_')) && c.modificado === true);
  }

  get totalCambiosPendientes(): number {
    return this.idsParaEliminar.length + this.filasNuevas.length + this.filasModificadas.length;
  }

  async eliminarFilaVisual(compra: CompraMatchItem, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const esNueva = compra.esNuevo || (compra.idCompraMatch && compra.idCompraMatch.startsWith('temp_'));

    if (esNueva) {
      this.comprasMatch = this.comprasMatch.filter(c => c !== compra && c.idCompraMatch !== compra.idCompraMatch);
      this.recalcularTotales();
      this.cdr.detectChanges();
      return;
    }

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Registro de Match de Compras',
      message: `¿Está seguro de quitar el comprobante ${compra.serie}-${compra.numero} (${compra.razonSocial || 'Sin Razón Social'}) de la lista? Este cambio se aplicará definitivamente al presionar "Guardar Cambios".`,
      confirmText: 'Sí, quitar',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    if (compra.idCompraMatch) {
      if (!this.idsParaEliminar.includes(compra.idCompraMatch)) {
        this.idsParaEliminar.push(compra.idCompraMatch);
      }
    }

    this.comprasMatch = this.comprasMatch.filter(c => c !== compra && c.idCompraMatch !== compra.idCompraMatch);
    this.recalcularTotales();
    this.cdr.detectChanges();
  }

  async guardarCambios(): Promise<void> {
    if (!this.idMatch) return;

    const nuevas = this.filasNuevas;
    const modificadas = this.filasModificadas;
    const eliminados = this.idsParaEliminar;

    if (nuevas.length === 0 && modificadas.length === 0 && eliminados.length === 0) {
      return;
    }

    // 1. Validar campos obligatorios de cada fila nueva
    for (let i = 0; i < nuevas.length; i++) {
      const f = nuevas[i];
      const numFila = i + 1;
      if (!f.fechaEmision) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `En la nueva fila #${numFila}, la Fecha de Emisión es obligatoria.`
        });
        return;
      }
      if (!f.codigoTipoCp) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `En la nueva fila #${numFila}, seleccione el Tipo de Comprobante.`
        });
        return;
      }
      if (!f.serie || !f.serie.trim()) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `En la nueva fila #${numFila}, ingrese la Serie del comprobante.`
        });
        return;
      }
      if (!f.numero || !f.numero.trim()) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `En la nueva fila #${numFila}, ingrese el Número del comprobante.`
        });
        return;
      }
      if (!f.codigoTipoDocIdentidad) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `En la nueva fila #${numFila}, seleccione el Tipo de Documento de Identidad.`
        });
        return;
      }
      if (!f.nroDocIdentidad || !f.nroDocIdentidad.trim()) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `En la nueva fila #${numFila}, ingrese el Número de Documento del proveedor.`
        });
        return;
      }

      const resValDoc = this.validarDocIdentidad(f.codigoTipoDocIdentidad, f.nroDocIdentidad);
      if (!resValDoc.valido) {
        await this.modalService.open({
          type: 'alert',
          title: 'Documento Inválido',
          message: `En la nueva fila #${numFila}: ${resValDoc.mensaje}`
        });
        return;
      }

      if (!f.razonSocial || !f.razonSocial.trim()) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `En la nueva fila #${numFila}, ingrese la Razón Social o Nombre del proveedor.`
        });
        return;
      }
    }

    // 1.1 Validar modificadas
    for (let i = 0; i < modificadas.length; i++) {
      const m = modificadas[i];
      if (!m.fechaEmision) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `El comprobante modificado ${m.serie}-${m.numero} requiere Fecha de Emisión.`
        });
        return;
      }
      if (!m.serie || !m.serie.trim() || !m.numero || !m.numero.trim()) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `El comprobante modificado requiere Serie y Número válidos.`
        });
        return;
      }
      if (!m.nroDocIdentidad || !m.nroDocIdentidad.trim() || !m.razonSocial || !m.razonSocial.trim()) {
        await this.modalService.open({
          type: 'alert',
          title: 'Dato Requerido',
          message: `El comprobante modificado ${m.serie}-${m.numero} requiere Documento y Razón Social del proveedor.`
        });
        return;
      }

      const resValDocMod = this.validarDocIdentidad(m.codigoTipoDocIdentidad, m.nroDocIdentidad);
      if (!resValDocMod.valido) {
        await this.modalService.open({
          type: 'alert',
          title: 'Documento Inválido',
          message: `En el comprobante ${m.serie}-${m.numero}: ${resValDocMod.mensaje}`
        });
        return;
      }
    }

    // 2. Resumen confirmación
    const partesDetalle: string[] = [];
    if (eliminados.length > 0) partesDetalle.push(`eliminar ${eliminados.length} comprobante(s)`);
    if (nuevas.length > 0) partesDetalle.push(`insertar ${nuevas.length} nuevo(s) registro(s)`);
    if (modificadas.length > 0) partesDetalle.push(`actualizar ${modificadas.length} registro(s) editado(s)`);

    const detalleAcciones = `Se procederá a ${partesDetalle.join(', ')} en la base de datos de match.`;

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Confirmar Guardado de Cambios en Match',
      message: `${detalleAcciones} Se revalidarán automáticamente las discrepancias y observaciones de negocio. ¿Desea continuar?`,
      confirmText: 'Guardar',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    this.guardandoCambios = true;
    this.loadingService.show();
    this.cdr.detectChanges();

    // 3. Payload nuevos
    const nuevosPayload = nuevas.map(n => ({
      codigoTipoCp: n.codigoTipoCp,
      serie: n.serie?.trim().toUpperCase(),
      numero: n.numero?.trim(),
      fechaEmision: n.fechaEmision,
      codigoTipoDocIdentidad: n.codigoTipoDocIdentidad || '6',
      nroDocIdentidad: n.nroDocIdentidad?.trim(),
      razonSocial: n.razonSocial?.trim().toUpperCase(),
      biGravadoDg: Number(n.biGravadoDg) || 0,
      igvIpmDg: Number(n.igvIpmDg) || 0,
      biGravadoDgng: Number(n.biGravadoDgng) || 0,
      igvIpmDgng: Number(n.igvIpmDgng) || 0,
      biGravadoDng: Number(n.biGravadoDng) || 0,
      igvIpmDng: Number(n.igvIpmDng) || 0,
      valorAdqNg: Number(n.valorAdqNg) || 0,
      montoIsc: Number(n.montoIsc) || 0,
      montoIcbper: Number(n.montoIcbper) || 0,
      montoOtrosTributos: Number(n.montoOtrosTributos) || 0,
      totalCp: Number(n.totalCp) || 0,
      codigoMoneda: n.codigoMoneda || 'PEN',
      tipoCambio: Number(n.tipoCambio) || 1.0,
      codigoEstadoComprobante: n.codigoEstadoComprobante || '1',
      carSunat: n.carSunat,
      origenDato: n.origenDato || 'SIRE'
    }));

    // 3.1 Payload modificados
    const modificadosPayload = modificadas.map(m => ({
      idCompraMatch: m.idCompraMatch,
      codigoTipoCp: m.codigoTipoCp,
      serie: m.serie?.trim().toUpperCase(),
      numero: m.numero?.trim(),
      fechaEmision: m.fechaEmision,
      codigoTipoDocIdentidad: m.codigoTipoDocIdentidad || '6',
      nroDocIdentidad: m.nroDocIdentidad?.trim(),
      razonSocial: m.razonSocial?.trim().toUpperCase(),
      biGravadoDg: Number(m.biGravadoDg) || 0,
      igvIpmDg: Number(m.igvIpmDg) || 0,
      biGravadoDgng: Number(m.biGravadoDgng) || 0,
      igvIpmDgng: Number(m.igvIpmDgng) || 0,
      biGravadoDng: Number(m.biGravadoDng) || 0,
      igvIpmDng: Number(m.igvIpmDng) || 0,
      valorAdqNg: Number(m.valorAdqNg) || 0,
      montoIsc: Number(m.montoIsc) || 0,
      montoIcbper: Number(m.montoIcbper) || 0,
      montoOtrosTributos: Number(m.montoOtrosTributos) || 0,
      totalCp: Number(m.totalCp) || 0,
      codigoMoneda: m.codigoMoneda || 'PEN',
      tipoCambio: Number(m.tipoCambio) || 1.0,
      codigoEstadoComprobante: m.codigoEstadoComprobante || '1',
      carSunat: m.carSunat,
      origenDato: m.origenDato
    }));

    this.operacionesService.actualizarComprasMatch(this.idMatch, eliminados, nuevosPayload, modificadosPayload).subscribe({
      next: async (res) => {
        this.guardandoCambios = false;
        this.loadingService.hide();
        this.idsParaEliminar = [];

        if (this.idMatch) {
          this.cargarDetalleMatch();
        }
        this.cdr.detectChanges();

        await this.modalService.open({
          type: 'info',
          title: 'Operación Exitosa',
          message: res?.mensaje || 'Registros de match de compras actualizados y revalidados correctamente.',
          confirmText: 'Aceptar'
        });
      },
      error: async (err) => {
        this.guardandoCambios = false;
        this.loadingService.hide();
        console.error('Error al guardar cambios de compras match:', err);
        const errorMsg = err?.error?.message || err?.error?.Mensaje || 'Ocurrió un error al actualizar los comprobantes de match.';
        this.cdr.detectChanges();

        await this.modalService.open({
          type: 'error',
          title: 'Error al Guardar',
          message: errorMsg,
          confirmText: 'Aceptar'
        });
      }
    });
  }

  async reejecutar(): Promise<void> {
    if (!this.cargaMatch?.periodo) return;
    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Re-ejecutar Match de Compras',
      message: `Se volverán a cruzar los comprobantes SIRE vs Empresa del periodo ${this.formatearPeriodo(this.cargaMatch.periodo)}. ¿Continuar?`,
      confirmText: 'Sí, re-ejecutar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.loadingService.show();
    this.operacionesService.reejecutarMatchCompras(this.ruc, this.cargaMatch.periodo).subscribe({
      next: async (res) => {
        this.loadingService.hide();
        await this.modalService.open({
          type: 'info',
          title: 'Match Re-ejecutado con Éxito',
          message: `Se procesaron ${res.totalConsolidado} comprobantes consolidados: ${res.coincidenciasExactas} coincidencias exactas, ${res.diferencias} con diferencias y ${res.soloUnOrigen} en un solo origen. Observaciones detectadas: ${res.totalObservaciones}.`
        });
        this.idMatch = res.idCarga;
        this.cargarDetalleMatch();
      },
      error: async (err) => {
        this.loadingService.hide();
        const msg = extraerMensajeError(err, 'No se pudo re-ejecutar el match.');
        await this.modalService.open({
          type: 'error',
          title: 'Error',
          message: msg
        });
      }
    });
  }

  obtenerClaseFilaMatch(c: CompraMatchItem): string {
    if (c.esNuevo || (c.idCompraMatch && c.idCompraMatch.startsWith('temp_'))) {
      return 'fila-nueva';
    }
    if (c.editando) {
      return 'fila-editando';
    }
    if (c.modificado) {
      return 'fila-modificada';
    }
    if (c.esDiferencia) {
      return 'fila-match-diferencia';
    }
    if (c.esSoloUnOrigen) {
      return 'fila-match-solo-un-origen';
    }
    return '';
  }

  // --- OBSERVACIONES / ERRORES ---
  get totalObservaciones(): number {
    return this.erroresMatch.length;
  }

  get listaObservacionesModal(): ObservacionItem[] {
    return this.erroresMatch.map(e => ({
      numeroLinea: e.numeroLinea,
      tipoError: e.tipoError,
      campoError: e.campoError,
      valorLectura: e.valorLectura,
      mensaje: e.mensaje,
      severidad: e.severidad
    }));
  }

  formatearPeriodo(periodo?: string | number): string {
    if (!periodo) return '';
    const str = periodo.toString().trim();
    if (str.length === 6) {
      const anio = str.substring(0, 4);
      const mesNum = parseInt(str.substring(4, 6), 10);
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
      const nombreMes = meses[mesNum - 1] || str.substring(4, 6);
      return `${nombreMes} ${anio}`;
    }
    return str;
  }

  exportarCSV(): void {
    if (this.comprasMatch.length === 0) return;

    const encabezados = [
      'Estado Match',
      'Origen',
      'RUC Empresa',
      'Periodo',
      'Fecha Emisión',
      'Tipo CP',
      'Serie',
      'Número',
      'Tipo Doc Prov',
      'RUC/Doc Prov',
      'Razón Social Proveedor',
      'BI Gravado DG',
      'IGV/IPM DG',
      'Total CP',
      'Moneda',
      'Tipo Cambio',
      'Estado'
    ];

    const filas = this.comprasFiltradas.map(c => [
      `"${this.obtenerEtiquetaEstadoMatch(c)}"`,
      `"${c.origenDato || ''}"`,
      `"${c.empresaRuc || this.ruc || ''}"`,
      `"${c.periodo || ''}"`,
      `"${c.fechaEmision ? c.fechaEmision.substring(0, 10) : ''}"`,
      `"${c.codigoTipoCp || ''}"`,
      `"${c.serie || ''}"`,
      `"${c.numero || ''}"`,
      `"${c.codigoTipoDocIdentidad || ''}"`,
      `"${c.nroDocIdentidad || ''}"`,
      `"${(c.razonSocial || '').replace(/"/g, '""')}"`,
      c.biGravadoDg ?? 0,
      c.igvIpmDg ?? 0,
      c.totalCp ?? 0,
      `"${c.codigoMoneda || 'PEN'}"`,
      c.tipoCambio ?? 1,
      `"${c.codigoEstadoComprobante || 'Activo'}"`
    ]);

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Compras_Match_${this.ruc}_${this.cargaMatch?.periodo || 'Periodo'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------------------
  // Exportación para SUNAT SIRE (RCE Compras)
  // --------------------------------------------------------------------------
  async exportarParaSire(): Promise<void> {
    if (!this.comprasMatch || this.comprasMatch.length === 0) {
      await this.modalService.open({
        type: 'alert',
        title: 'Sin Datos',
        message: 'No hay comprobantes disponibles en este match para exportar.'
      });
      return;
    }

    // Si existen observaciones, pedir confirmación previa
    if (this.totalObservaciones > 0) {
      const confirmado = await this.modalService.open({
        type: 'confirm',
        title: 'Observaciones Pendientes',
        message: `El proceso de match contiene actualmente ${this.totalObservaciones} observación(es) pendiente(s) por corregir. ¿Desea continuar con la exportación y descarga para SIRE?`,
        confirmText: 'Continuar y Descargar',
        cancelText: 'Cancelar'
      });
      if (!confirmado) {
        return;
      }
    }

    const rucEmisor = (this.ruc || this.empresa?.ruc || '').trim();
    if (!rucEmisor || rucEmisor.length !== 11) {
      await this.modalService.open({
        type: 'alert',
        title: 'RUC Inválido',
        message: 'No se pudo determinar el RUC del contribuyente (debe contener 11 dígitos numéricos).'
      });
      return;
    }

    const razonSocialEmisor = (this.empresa?.razonSocial || '').trim().toUpperCase().replace(/\|/g, '');
    const periodoRaw = (this.cargaMatch?.periodo || '').trim();
    const periodo = periodoRaw.replace(/[^0-9]/g, '');
    if (periodo.length !== 6) {
      await this.modalService.open({
        type: 'alert',
        title: 'Periodo Inválido',
        message: 'El periodo tributario debe contener exactamente 6 dígitos (AAAAMM).'
      });
      return;
    }

    const anio = periodo.substring(0, 4);
    const mes = periodo.substring(4, 6);

    const lineas: string[] = [];

    for (const c of this.comprasMatch) {
      const col1 = rucEmisor;
      const col2 = razonSocialEmisor;
      const col3 = periodo;
      const col4 = c.carSunat || '';
      const col5 = this.formatearFechaDdMmYyyy(c.fechaEmision);
      const col6 = c.fechaVencimiento ? this.formatearFechaDdMmYyyy(c.fechaVencimiento) : '';
      const col7 = (c.codigoTipoCp || '01').trim().padStart(2, '0');
      const col8 = (c.serie || '').trim().toUpperCase();
      const col9 = (c.anioDocumento || '').trim();
      const col10 = this.normalizarNumeroSunat(c.numero);
      const col11 = (c.numeroFinal || '').trim();
      const col12 = (c.codigoTipoDocIdentidad || '6').trim();
      const col13 = (c.nroDocIdentidad || '').trim().replace(/[^a-zA-Z0-9]/g, '');
      const col14 = (c.razonSocial || '-').trim().toUpperCase().replace(/\|/g, '');
      const col15 = this.formatearMonto(c.biGravadoDg);
      const col16 = this.formatearMonto(c.igvIpmDg);
      const col17 = this.formatearMonto(c.biGravadoDgng);
      const col18 = this.formatearMonto(c.igvIpmDgng);
      const col19 = this.formatearMonto(c.biGravadoDng);
      const col20 = this.formatearMonto(c.igvIpmDng);
      const col21 = this.formatearMonto(c.valorAdqNg);
      const col22 = this.formatearMonto(c.montoIsc);
      const col23 = this.formatearMonto(c.montoIcbper);
      const col24 = this.formatearMonto(c.montoOtrosTributos);
      const col25 = this.formatearMonto(c.totalCp);
      const moneda = (c.codigoMoneda || 'PEN').trim().toUpperCase();
      const col26 = moneda;
      let col27 = '';
      if (moneda !== 'PEN') {
        const tc = Number(c.tipoCambio) || 1.0;
        col27 = tc.toFixed(3);
      }
      const col28 = c.fechaEmisionDocModificado ? this.formatearFechaDdMmYyyy(c.fechaEmisionDocModificado) : '';
      const col29 = (c.codigoTipoCpModificado || '').trim();
      const col30 = (c.serieCpModificado || '').trim();
      const col31 = (c.codDamDsi || '').trim();
      const col32 = (c.numeroCpModificado || '').trim();
      const col33 = (c.clasifBssSss || '').trim();
      const col34 = (c.idProyectoOp || '').trim();
      const col35 = c.porcPart ? this.formatearMonto(c.porcPart) : '';
      const col36 = c.imb ? this.formatearMonto(c.imb) : '';
      const col37 = (c.carOrigIndEI || '').trim();
      const col38 = (c.detraccion || '').trim();
      const col39 = (c.codigoTipoNota || '').trim();
      const col40 = (c.codigoEstadoComprobante || '1').trim();
      const col41 = (c.incal || '').trim();
      const col42 = '';
      const col43 = '';
      const col44 = '';
      const col45 = '';

      const campos = [
        col1, col2, col3, col4, col5, col6, col7, col8, col9, col10,
        col11, col12, col13, col14, col15, col16, col17, col18, col19, col20,
        col21, col22, col23, col24, col25, col26, col27, col28, col29, col30,
        col31, col32, col33, col34, col35, col36, col37, col38, col39, col40,
        col41, col42, col43, col44, col45
      ];

      const linea = campos.join('|') + '|';
      lineas.push(linea);
    }

    const contenidoPlano = lineas.join('\r\n');
    const nombreBase = `LE${rucEmisor}${anio}${mes}0008040002111200`;
    const nombreTxt = `${nombreBase}.txt`;
    const nombreZip = `${nombreBase}.zip`;

    try {
      const txtBytes = strToU8(contenidoPlano);
      const zipData = zipSync({
        [nombreTxt]: [txtBytes, { level: 6 }]
      });

      const blob = new Blob([zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreZip;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al generar archivo ZIP SIRE Compras:', err);
      this.modalService.open({
        type: 'alert',
        title: 'Error de Exportación',
        message: 'No se pudo generar el archivo ZIP de exportación para SIRE Compras.'
      });
    }
  }

  // --------------------------------------------------------------------------
  // Descarga SUNAT (CDP-AAAA-MM.txt)
  // Formato: RUC|TIPO CP|SERIE|NUMERO|FECHA EMISION|TOTAL CP
  // --------------------------------------------------------------------------
  async descargarSunatCdp(): Promise<void> {
    if (!this.comprasMatch || this.comprasMatch.length === 0) {
      await this.modalService.open({
        type: 'alert',
        title: 'Sin Datos',
        message: 'No hay comprobantes disponibles en este match para descargar.'
      });
      return;
    }

    if (this.totalObservaciones > 0) {
      const confirmado = await this.modalService.open({
        type: 'confirm',
        title: 'Observaciones Pendientes',
        message: `El proceso de match contiene actualmente ${this.totalObservaciones} observación(es) pendiente(s). ¿Desea continuar con la descarga para SUNAT?`,
        confirmText: 'Continuar y Descargar',
        cancelText: 'Cancelar'
      });
      if (!confirmado) {
        return;
      }
    }

    const periodoRaw = (this.cargaMatch?.periodo || '').trim();
    const periodo = periodoRaw.replace(/[^0-9]/g, '');
    if (periodo.length !== 6) {
      await this.modalService.open({
        type: 'alert',
        title: 'Periodo Inválido',
        message: 'El periodo tributario debe contener exactamente 6 dígitos (AAAAMM).'
      });
      return;
    }

    const anio = periodo.substring(0, 4);
    const mes = periodo.substring(4, 6);

    const lineas: string[] = [];

    for (const c of this.comprasMatch) {
      const col1 = (c.nroDocIdentidad || '').trim().replace(/[^a-zA-Z0-9]/g, '');
      const col2 = (c.codigoTipoCp || '01').trim().padStart(2, '0');
      const col3 = (c.serie || '').trim().toUpperCase();
      const col4 = this.normalizarNumeroSunat(c.numero);
      const col5 = this.formatearFechaDdMmYyyy(c.fechaEmision);
      let montoCalculado = Math.abs(Number(c.totalCp) || 0);
      const tc = Number(c.tipoCambio) || 1.0;
      if (tc > 0 && Math.abs(tc - 1.0) > 0.0001) {
        montoCalculado = montoCalculado / tc;
      }
      const col6 = this.formatearMonto(montoCalculado);

      const linea = `${col1}|${col2}|${col3}|${col4}|${col5}|${col6}`;
      lineas.push(linea);
    }

    const CHUNK_SIZE = 100;
    const totalRegistros = lineas.length;
    const zipEntries: { [filename: string]: Uint8Array } = {};

    if (totalRegistros <= CHUNK_SIZE) {
      const nombreTxt = `COMPRA-${anio}-${mes}.txt`;
      zipEntries[nombreTxt] = strToU8(lineas.join('\r\n'));
    } else {
      const totalPartes = Math.ceil(totalRegistros / CHUNK_SIZE);
      for (let parte = 1; parte <= totalPartes; parte++) {
        const inicio = (parte - 1) * CHUNK_SIZE;
        const fin = Math.min(inicio + CHUNK_SIZE, totalRegistros);
        const bloqueLineas = lineas.slice(inicio, fin);
        const nombreTxt = `COMPRA-${anio}-${mes}-${parte}.txt`;
        zipEntries[nombreTxt] = strToU8(bloqueLineas.join('\r\n'));
      }
    }

    const nombreZip = `COMPRA-${anio}-${mes}.zip`;

    try {
      const zipData = zipSync(zipEntries);
      const blob = new Blob([zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreZip;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al generar archivo ZIP SUNAT CDP:', err);
      await this.modalService.open({
        type: 'alert',
        title: 'Error de Descarga',
        message: 'No se pudo generar el archivo ZIP para SUNAT.'
      });
    }
  }

  private formatearFechaDdMmYyyy(fecha: any): string {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
      const partes = fecha.substring(0, 10).split('-');
      if (partes.length === 3) {
        return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
      }
      const partesSlash = fecha.split('/');
      if (partesSlash.length === 3) {
        return `${partesSlash[0].padStart(2, '0')}/${partesSlash[1].padStart(2, '0')}/${partesSlash[2]}`;
      }
    }
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  private normalizarNumeroSunat(numero: any): string {
    if (!numero) return '0';
    const str = String(numero).trim();
    if (/^\d+$/.test(str)) {
      const sinCeros = str.replace(/^0+/, '');
      return sinCeros === '' ? '0' : sinCeros;
    }
    return str.toUpperCase();
  }

  private formatearMonto(monto: any): string {
    const num = Number(monto);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  }

  volver(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'compras'], { queryParams: { tab: 'match' } });
  }
}
