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
  VentaMatchItem
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
  selector: 'app-match-resultado',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalObservacionesComponent],
  templateUrl: './match-resultado.component.html',
  styleUrl: './match-resultado.component.css'
})
export class MatchResultadoComponent implements OnInit {
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
  ventasMatch: VentaMatchItem[] = [];
  erroresMatch: ArchivoCargaErrorItem[] = [];
  mostrarErrores: boolean = false;

  cargando: boolean = true;
  cargandoDatos: boolean = false;
  mensajeError: string | null = null;

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

  menuFiltroDocClienteAbierto: boolean = false;
  docsClienteSeleccionados: string[] = [];
  filtroTextoDocClienteMenu: string = '';

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
  totalBaseImponible: number = 0;
  totalIgv: number = 0;
  totalGeneral: number = 0;

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
      ventas: this.operacionesService.listarVentasMatch(this.idMatch),
      errores: this.operacionesService.obtenerErroresCarga(this.idMatch)
    }).subscribe({
      next: ({ carga, ventas, errores }) => {
        this.cargando = false;
        this.cargandoDatos = false;
        this.cargaMatch = carga;
        this.ventasMatch = (ventas || []).map(v => ({
          ...v,
          fechaEmision: this.formatearFechaInput(v.fechaEmision),
          fechaVencimiento: v.fechaVencimiento ? this.formatearFechaInput(v.fechaVencimiento) : ''
        }));
        this.erroresMatch = errores || [];
        this.recalcularTotales();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.cargandoDatos = false;
        this.mensajeError = extraerMensajeError(err, 'No se pudo recuperar el detalle del proceso de match.');
        this.cdr.detectChanges();
      }
    });
  }

  // --- FILTRADO Y ORDENAMIENTO ---
  get ventasFiltradas(): VentaMatchItem[] {
    let list = this.ventasMatch;

    if (this.fechasEmisionSeleccionadas.length > 0) {
      list = list.filter(v => {
        if (!v.fechaEmision) return false;
        const iso = typeof v.fechaEmision === 'string' ? v.fechaEmision.substring(0, 10) : new Date(v.fechaEmision).toISOString().substring(0, 10);
        return this.fechasEmisionSeleccionadas.includes(iso);
      });
    }

    if (this.tiposCpSeleccionados.length > 0) {
      list = list.filter(v => {
        const nombre = this.obtenerNombreTipoCp(v.codigoTipoCp) || 'DESCONOCIDO';
        return this.tiposCpSeleccionados.includes(nombre);
      });
    }

    if (this.seriesSeleccionadas.length > 0) {
      list = list.filter(v => {
        const s = (v.serie || '').trim().toUpperCase();
        return this.seriesSeleccionadas.includes(s);
      });
    }

    if (this.numerosSeleccionados.length > 0) {
      list = list.filter(v => {
        const n = (v.numero || '').trim();
        return this.numerosSeleccionados.includes(n);
      });
    }

    if (this.tiposDocSeleccionados.length > 0) {
      list = list.filter(v => {
        const nombre = this.obtenerNombreTipoDocIdentidad(v.codigoTipoDocIdentidad || '6') || 'DESCONOCIDO';
        return this.tiposDocSeleccionados.includes(nombre);
      });
    }

    if (this.docsClienteSeleccionados.length > 0) {
      list = list.filter(v => {
        const doc = (v.nroDocIdentidad || '').trim();
        return this.docsClienteSeleccionados.includes(doc);
      });
    }

    if (this.razonesSocialesSeleccionadas.length > 0) {
      list = list.filter(v => {
        const rs = (v.razonSocial || '').trim();
        return this.razonesSocialesSeleccionadas.includes(rs);
      });
    }

    if (this.monedasSeleccionadas.length > 0) {
      list = list.filter(v => {
        const m = (v.codigoMoneda || 'PEN').trim().toUpperCase();
        return this.monedasSeleccionadas.includes(m);
      });
    }

    if (this.origenesSeleccionados.length > 0) {
      list = list.filter(v => {
        const orig = (v.origenDato || '').trim().toUpperCase();
        return this.origenesSeleccionados.includes(orig);
      });
    }

    if (this.estadosMatchSeleccionados.length > 0) {
      list = list.filter(v => {
        const est = this.obtenerEtiquetaEstadoMatch(v);
        return this.estadosMatchSeleccionados.includes(est);
      });
    }

    if (this.filtroTexto) {
      const txt = this.filtroTexto.toLowerCase().trim();
      list = list.filter(
        v =>
          (v.nroDocIdentidad && v.nroDocIdentidad.toLowerCase().includes(txt)) ||
          (v.razonSocial && v.razonSocial.toLowerCase().includes(txt)) ||
          `${v.serie}-${v.numero}`.toLowerCase().includes(txt) ||
          (v.codigoTipoCp && (v.codigoTipoCp.toLowerCase().includes(txt) || this.obtenerNombreTipoCp(v.codigoTipoCp).toLowerCase().includes(txt))) ||
          (v.codigoTipoDocIdentidad && (v.codigoTipoDocIdentidad.toLowerCase().includes(txt) || this.obtenerNombreTipoDocIdentidad(v.codigoTipoDocIdentidad).toLowerCase().includes(txt))) ||
          (v.origenDato && v.origenDato.toLowerCase().includes(txt)) ||
          this.obtenerEtiquetaEstadoMatch(v).toLowerCase().includes(txt)
      );
    }

    if (this.criteriosOrden.length > 0) {
      list = list.slice().sort((a, b) => {
        for (const c of this.criteriosOrden) {
          let valA: any = (a as any)[c.columna];
          let valB: any = (b as any)[c.columna];

          if (['biGravada', 'igvIpm', 'totalCp', 'tipoCambio', 'valorFacturadoExportacion', 'descuentoBi', 'descuentoIgv', 'montoExonerado', 'montoInafecto', 'montoIsc', 'montoIvap', 'montoIcbper', 'montoOtrosTributos'].includes(c.columna)) {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
          } else {
            valA = (valA ?? '').toString().toLowerCase();
            valB = (valB ?? '').toString().toLowerCase();
          }

          if (valA < valB) return c.ascendente ? -1 : 1;
          if (valA > valB) return c.ascendente ? 1 : -1;
        }
        return 0;
      });
    }

    return list;
  }

  recalcularTotales(): void {
    const lista = this.ventasFiltradas;
    this.totalBaseImponible = lista.reduce((acc, v) => acc + (Number(v.biGravada) || 0), 0);
    this.totalIgv = lista.reduce((acc, v) => acc + (Number(v.igvIpm) || 0), 0);
    this.totalGeneral = lista.reduce((acc, v) => acc + (Number(v.totalCp) || 0), 0);
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
    for (const v of this.ventasMatch) {
      if (v.fechaEmision) {
        const iso = typeof v.fechaEmision === 'string' ? v.fechaEmision.substring(0, 10) : new Date(v.fechaEmision).toISOString().substring(0, 10);
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
    for (const v of this.ventasMatch) {
      const nombre = this.obtenerNombreTipoCp(v.codigoTipoCp) || 'DESCONOCIDO';
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
    for (const v of this.ventasMatch) {
      const nombre = (v.serie || '').trim().toUpperCase();
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
    for (const v of this.ventasMatch) {
      const nombre = (v.numero || '').trim();
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
    for (const v of this.ventasMatch) {
      const nombre = this.obtenerNombreTipoDocIdentidad(v.codigoTipoDocIdentidad || '6') || 'DESCONOCIDO';
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

  // Doc Cliente
  get opcionesDocClienteDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventasMatch) {
      const doc = (v.nroDocIdentidad || '').trim();
      if (doc) mapa.set(doc, (mapa.get(doc) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesDocClienteFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoDocClienteMenu.trim()) return this.opcionesDocClienteDisponibles;
    const txt = this.filtroTextoDocClienteMenu.toLowerCase().trim();
    return this.opcionesDocClienteDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroDocCliente(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('docCliente');
    this.menuFiltroDocClienteAbierto = !this.menuFiltroDocClienteAbierto;
    if (this.menuFiltroDocClienteAbierto) this.filtroTextoDocClienteMenu = '';
  }

  toggleSeleccionDocCliente(nombre: string): void {
    const idx = this.docsClienteSeleccionados.indexOf(nombre);
    if (idx >= 0) this.docsClienteSeleccionados.splice(idx, 1);
    else this.docsClienteSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaDocClienteSeleccionado(nombre: string): boolean {
    return this.docsClienteSeleccionados.includes(nombre);
  }

  seleccionarTodosDocsCliente(): void {
    this.docsClienteSeleccionados = this.opcionesDocClienteDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroDocsCliente(): void {
    this.docsClienteSeleccionados = [];
    this.recalcularTotales();
  }

  // Razón Social
  get opcionesRazonSocialDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventasMatch) {
      const rs = (v.razonSocial || '').trim();
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
    for (const v of this.ventasMatch) {
      const m = (v.codigoMoneda || 'PEN').trim().toUpperCase();
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
    for (const v of this.ventasMatch) {
      const orig = (v.origenDato || '').trim().toUpperCase();
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
    for (const v of this.ventasMatch) {
      const est = this.obtenerEtiquetaEstadoMatch(v);
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
    if (excepto !== 'docCliente') this.menuFiltroDocClienteAbierto = false;
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

  obtenerEtiquetaEstadoMatch(v: VentaMatchItem): string {
    if (v.esCoincidenciaExacta) return 'COINCIDENTE';
    if (v.esDiferencia) return 'DIFERENCIA';
    if (v.esSoloUnOrigen) return 'SOLO UN ORIGEN';
    return 'SIN ESTADO';
  }

  obtenerBadgeClaseEstadoMatch(v: VentaMatchItem): string {
    if (v.esCoincidenciaExacta) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (v.esDiferencia) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (v.esSoloUnOrigen) return 'bg-rose-50 text-rose-700 border-rose-200';
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

  insertarFilaVisual(referenciaVentaOIndice: VentaMatchItem | number, event?: Event): void {
    if (event) event.stopPropagation();

    // Limpiar ordenamiento activo para mantener la fila en la posición exacta donde se insertó
    if (this.criteriosOrden.length > 0) {
      this.criteriosOrden = [];
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fechaDefecto = typeof referenciaVentaOIndice === 'object' && referenciaVentaOIndice?.fechaEmision
      ? this.formatearFechaInput(referenciaVentaOIndice.fechaEmision)
      : this.obtenerFechaDefecto();

    const serieDefecto = typeof referenciaVentaOIndice === 'object' && referenciaVentaOIndice?.serie
      ? referenciaVentaOIndice.serie
      : 'F001';

    const nuevaFila: VentaMatchItem = {
      idVentaMatch: tempId,
      idCarga: this.idMatch,
      empresaRuc: this.ruc,
      periodo: this.cargaMatch?.periodo || '',
      numeroLinea: this.ventasMatch.length + 1,
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
      biGravada: 0,
      igvIpm: 0,
      totalCp: 0,
      codigoMoneda: 'PEN',
      tipoCambio: 1.0,
      codigoEstadoComprobante: '1',
      esNuevo: true
    };

    if (typeof referenciaVentaOIndice === 'number') {
      if (referenciaVentaOIndice <= 0) {
        this.ventasMatch.unshift(nuevaFila);
      } else if (referenciaVentaOIndice >= this.ventasMatch.length) {
        this.ventasMatch.push(nuevaFila);
      } else {
        this.ventasMatch.splice(referenciaVentaOIndice, 0, nuevaFila);
      }
    } else {
      const idx = this.ventasMatch.indexOf(referenciaVentaOIndice);
      if (idx >= 0) {
        this.ventasMatch.splice(idx, 0, nuevaFila);
      } else {
        this.ventasMatch.unshift(nuevaFila);
      }
    }

    this.recalcularTotales();
    this.cdr.detectChanges();
  }

  trackByVentaMatch(index: number, item: VentaMatchItem): string {
    return item.idVentaMatch || `item_${index}`;
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

  iniciarEdicionFila(venta: VentaMatchItem, event?: Event): void {
    if (event) event.stopPropagation();

    this.ventasMatch.forEach(v => {
      if (v !== venta && v.editando) {
        v.editando = false;
      }
    });

    if (venta.fechaEmision) {
      venta.fechaEmision = this.formatearFechaInput(venta.fechaEmision);
    }

    if (!(venta as any)._original) {
      (venta as any)._original = {
        fechaEmision: venta.fechaEmision,
        codigoTipoCp: venta.codigoTipoCp,
        serie: venta.serie,
        numero: venta.numero,
        codigoTipoDocIdentidad: venta.codigoTipoDocIdentidad,
        nroDocIdentidad: venta.nroDocIdentidad,
        razonSocial: venta.razonSocial,
        biGravada: Number(venta.biGravada) || 0,
        igvIpm: Number(venta.igvIpm) || 0,
        totalCp: Number(venta.totalCp) || 0,
        codigoEstadoComprobante: venta.codigoEstadoComprobante,
        origenDato: venta.origenDato
      };
    }

    venta.editando = true;
    this.cdr.detectChanges();
  }

  verificarYMarcarModificacion(venta: VentaMatchItem): void {
    if (venta.esNuevo) return;

    const orig = (venta as any)._original;
    if (!orig) return;

    const cambioFecha = (venta.fechaEmision || '') !== (orig.fechaEmision || '');
    const cambioTipoCp = (venta.codigoTipoCp || '') !== (orig.codigoTipoCp || '');
    const cambioSerie = (venta.serie || '').trim().toUpperCase() !== (orig.serie || '').trim().toUpperCase();
    const cambioNumero = (venta.numero || '').trim() !== (orig.numero || '').trim();
    const cambioTipoDoc = (venta.codigoTipoDocIdentidad || '') !== (orig.codigoTipoDocIdentidad || '');
    const cambioNroDoc = (venta.nroDocIdentidad || '').trim() !== (orig.nroDocIdentidad || '').trim();
    const cambioRazon = (venta.razonSocial || '').trim().toUpperCase() !== (orig.razonSocial || '').trim().toUpperCase();
    const cambioBi = (Number(venta.biGravada) || 0) !== (Number(orig.biGravada) || 0);
    const cambioIgv = (Number(venta.igvIpm) || 0) !== (Number(orig.igvIpm) || 0);
    const cambioTotal = (Number(venta.totalCp) || 0) !== (Number(orig.totalCp) || 0);
    const cambioEstado = (venta.codigoEstadoComprobante || '') !== (orig.codigoEstadoComprobante || '');
    const cambioOrigen = (venta.origenDato || '') !== (orig.origenDato || '');

    const haCambiado = cambioFecha || cambioTipoCp || cambioSerie || cambioNumero ||
                       cambioTipoDoc || cambioNroDoc || cambioRazon ||
                       cambioBi || cambioIgv || cambioTotal || cambioEstado || cambioOrigen;

    venta.modificado = haCambiado;
  }

  marcarFilaModificada(venta: VentaMatchItem): void {
    this.verificarYMarcarModificacion(venta);
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

  onTipoDocIdentidadCambio(venta: VentaMatchItem): void {
    this.sanitizarNroDocIdentidad(venta);
    this.verificarYMarcarModificacion(venta);
  }

  onNroDocIdentidadInput(venta: VentaMatchItem): void {
    this.sanitizarNroDocIdentidad(venta);
    this.verificarYMarcarModificacion(venta);
  }

  sanitizarNroDocIdentidad(venta: VentaMatchItem): void {
    if (!venta.nroDocIdentidad) return;

    let valor = venta.nroDocIdentidad.toString();
    valor = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    valor = valor.replace(/\s+/g, '');

    const tipo = (venta.codigoTipoDocIdentidad || '').trim();

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

    venta.nroDocIdentidad = valor;
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

  esDocIdentidadInvalido(venta: VentaMatchItem): boolean {
    if (!venta.nroDocIdentidad && !venta.esNuevo && !venta.editando) return false;
    return !this.validarDocIdentidad(venta.codigoTipoDocIdentidad, venta.nroDocIdentidad).valido;
  }

  finalizarEdicionFila(venta: VentaMatchItem): void {
    this.sanitizarNroDocIdentidad(venta);
    this.verificarYMarcarModificacion(venta);
    venta.editando = false;
    this.cdr.detectChanges();
  }

  onBiGravadaCambio(venta: any): void {
    this.verificarYMarcarModificacion(venta);
    this.recalcularTotales();
  }

  onIgvCambio(venta: any): void {
    this.verificarYMarcarModificacion(venta);
    this.recalcularTotales();
  }

  get filasNuevas(): (VentaMatchItem & { esNuevo?: boolean })[] {
    return (this.ventasMatch as any[]).filter(v => v.esNuevo === true || (v.idVentaMatch && v.idVentaMatch.startsWith('temp_')));
  }

  get filasModificadas(): VentaMatchItem[] {
    return (this.ventasMatch as any[]).filter(v => !v.esNuevo && (!v.idVentaMatch || !v.idVentaMatch.startsWith('temp_')) && v.modificado === true);
  }

  get totalCambiosPendientes(): number {
    return this.idsParaEliminar.length + this.filasNuevas.length + this.filasModificadas.length;
  }

  async eliminarFilaVisual(venta: VentaMatchItem, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const esNueva = venta.esNuevo || (venta.idVentaMatch && venta.idVentaMatch.startsWith('temp_'));

    if (esNueva) {
      this.ventasMatch = this.ventasMatch.filter(v => v !== venta && v.idVentaMatch !== venta.idVentaMatch);
      this.recalcularTotales();
      this.cdr.detectChanges();
      return;
    }

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Registro de Match de Ventas',
      message: `¿Está seguro de quitar el comprobante ${venta.serie}-${venta.numero} (${venta.razonSocial || 'Sin Razón Social'}) de la lista? Este cambio se aplicará definitivamente al presionar "Guardar Cambios".`,
      confirmText: 'Sí, quitar',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    if (venta.idVentaMatch) {
      if (!this.idsParaEliminar.includes(venta.idVentaMatch)) {
        this.idsParaEliminar.push(venta.idVentaMatch);
      }
    }

    this.ventasMatch = this.ventasMatch.filter(v => v !== venta && v.idVentaMatch !== venta.idVentaMatch);
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
          message: `En la nueva fila #${numFila}, ingrese el Número de Documento del cliente.`
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
          message: `En la nueva fila #${numFila}, ingrese la Razón Social o Nombre del cliente.`
        });
        return;
      }
    }

    // 1.1 Validar campos obligatorios de comprobantes modificados
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
          message: `El comprobante modificado ${m.serie}-${m.numero} requiere Documento y Razón Social del cliente.`
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

    // 2. Armar resumen de mensaje de confirmación
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

    // 3. Preparar payload de nuevos registros
    const nuevosPayload = nuevas.map(n => ({
      codigoTipoCp: n.codigoTipoCp,
      serie: n.serie?.trim().toUpperCase(),
      numero: n.numero?.trim(),
      fechaEmision: n.fechaEmision,
      codigoTipoDocIdentidad: n.codigoTipoDocIdentidad || '6',
      nroDocIdentidad: n.nroDocIdentidad?.trim(),
      razonSocial: n.razonSocial?.trim().toUpperCase(),
      biGravada: Number(n.biGravada) || 0,
      igvIpm: Number(n.igvIpm) || 0,
      totalCp: Number(n.totalCp) || 0,
      codigoMoneda: n.codigoMoneda || 'PEN',
      tipoCambio: Number(n.tipoCambio) || 1.0,
      codigoEstadoComprobante: n.codigoEstadoComprobante || '1',
      carSunat: n.carSunat,
      origenDato: n.origenDato || 'SIRE'
    }));

    // 3.1 Preparar payload de modificados
    const modificadosPayload = modificadas.map(m => ({
      idVentaMatch: m.idVentaMatch,
      codigoTipoCp: m.codigoTipoCp,
      serie: m.serie?.trim().toUpperCase(),
      numero: m.numero?.trim(),
      fechaEmision: m.fechaEmision,
      codigoTipoDocIdentidad: m.codigoTipoDocIdentidad || '6',
      nroDocIdentidad: m.nroDocIdentidad?.trim(),
      razonSocial: m.razonSocial?.trim().toUpperCase(),
      biGravada: Number(m.biGravada) || 0,
      igvIpm: Number(m.igvIpm) || 0,
      totalCp: Number(m.totalCp) || 0,
      codigoMoneda: m.codigoMoneda || 'PEN',
      tipoCambio: Number(m.tipoCambio) || 1.0,
      codigoEstadoComprobante: m.codigoEstadoComprobante || '1',
      carSunat: m.carSunat,
      origenDato: m.origenDato
    }));

    this.operacionesService.actualizarVentasMatch(this.idMatch, eliminados, nuevosPayload, modificadosPayload).subscribe({
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
          message: res?.mensaje || 'Registros de match actualizados y revalidados correctamente.',
          confirmText: 'Aceptar'
        });
      },
      error: async (err) => {
        this.guardandoCambios = false;
        this.loadingService.hide();
        console.error('Error al guardar cambios de ventas match:', err);
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

  obtenerClaseFilaMatch(v: VentaMatchItem): string {
    // Si la fila está en estado nuevo, modificado o en edición activa
    if (v.esNuevo || (v.idVentaMatch && v.idVentaMatch.startsWith('temp_'))) {
      return 'fila-nueva';
    }
    if (v.editando) {
      return 'fila-editando';
    }
    if (v.modificado) {
      return 'fila-modificada';
    }

    // ÚNICAMENTE colorear fondo en estos dos estados del match
    if (v.esDiferencia) {
      return 'fila-match-diferencia';
    }
    if (v.esSoloUnOrigen) {
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

  // --------------------------------------------------------------------------
  // Exportación para SUNAT SIRE (RVIE Anexo 2)
  // --------------------------------------------------------------------------
  async exportarParaSire(): Promise<void> {
    if (!this.ventasMatch || this.ventasMatch.length === 0) {
      await this.modalService.open({
        type: 'alert',
        title: 'Sin Datos',
        message: 'No hay comprobantes disponibles en este match para exportar.'
      });
      return;
    }

    // Si existen observaciones uno o más, pedir confirmación previa
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

    // 1. Obtener Metadatos Emisor y Periodo
    const rucEmisor = (this.ruc || this.empresa?.ruc || '').trim();
    if (!rucEmisor || rucEmisor.length !== 11) {
      await this.modalService.open({
        type: 'alert',
        title: 'RUC Inválido',
        message: 'No se pudo determinar el RUC del emisor (debe contener 11 dígitos numéricos).'
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

    // 2. Formatear cada línea con exactamente 29 campos delimitados por pipes (|)
    const lineas: string[] = [];

    for (const v of this.ventasMatch) {
      // Col 1: RUC Emisor (11 dígitos numéricos)
      const col1 = rucEmisor;

      // Col 2: Razón Social Emisor (hasta 150 caracteres, mayúsculas, sin pipes)
      const col2 = razonSocialEmisor;

      // Col 3: Periodo Tributario (AAAAMM)
      const col3 = periodo;

      // Col 4: Código CAR SUNAT (Vacío en este flujo)
      const col4 = '';

      // Col 5: Fecha de Emisión (DD/MM/AAAA con ceros a la izquierda)
      const col5 = this.formatearFechaDdMmYyyy(v.fechaEmision);

      // Col 6: Fecha de Vencimiento (DD/MM/AAAA o vacío)
      const col6 = v.fechaVencimiento ? this.formatearFechaDdMmYyyy(v.fechaVencimiento) : '';

      // Col 7: Tipo de Comprobante (Fijo 2 caracteres: 01, 03, 07, 08)
      const col7 = (v.codigoTipoCp || '01').trim().padStart(2, '0');

      // Col 8: Serie del Comprobante (Fijo hasta 4 caracteres, mayúsculas)
      const col8 = (v.serie || '').trim().toUpperCase();

      // Col 9: Número de Comprobante (Hasta 12 caracteres, entero positivo sin ceros innecesarios a la izquierda)
      const col9 = this.normalizarNumeroSunat(v.numero);

      // Col 10: Número Final / Rango (Vacío en este flujo)
      const col10 = '';

      // Col 11: Tipo de Doc. Cliente (1 dígito: 6=RUC, 1=DNI, 4=CE, 0=Otros)
      const col11 = (v.codigoTipoDocIdentidad || '6').trim();

      // Col 12: Número Doc. Cliente (Hasta 15 caracteres alfanumérico, sin espacios ni guiones)
      const col12 = (v.nroDocIdentidad || '').trim().replace(/[^a-zA-Z0-9]/g, '');

      // Col 13: Razón Social Cliente (Hasta 150 caracteres, sin pipes)
      const col13 = (v.razonSocial || '-').trim().toUpperCase().replace(/\|/g, '');

      // Col 14: Valor Facturado Exp. (Decimal 2 decimales)
      const col14 = this.formatearMonto(v.valorFacturadoExportacion);

      // Col 15: Base Imponible Gravada (Decimal 2 decimales)
      const col15 = this.formatearMonto(v.biGravada);

      // Col 16: Descuento Base Imp. (Decimal 2 decimales)
      const col16 = this.formatearMonto(v.descuentoBi);

      // Col 17: Impuesto Gral. Ventas (IGV) (Decimal 2 decimales)
      const col17 = this.formatearMonto(v.igvIpm);

      // Col 18: Descuento del IGV (Decimal 2 decimales)
      const col18 = this.formatearMonto(v.descuentoIgv);

      // Col 19: Importe Op. Exonerada (Decimal 2 decimales)
      const col19 = this.formatearMonto(v.montoExonerado);

      // Col 20: Importe Op. Inafecta (Decimal 2 decimales)
      const col20 = this.formatearMonto(v.montoInafecto);

      // Col 21: Impuesto Selectivo (ISC) (Decimal 2 decimales)
      const col21 = this.formatearMonto(v.montoIsc);

      // Col 22: Base Imp. Arroz Pilado (Decimal 2 decimales)
      const col22 = this.formatearMonto(v.biGravadaIvap);

      // Col 23: Impuesto IVAP (Decimal 2 decimales)
      const col23 = this.formatearMonto(v.montoIvap);

      // Col 24: Impuesto ICBPER (Decimal 2 decimales)
      const col24 = this.formatearMonto(v.montoIcbper);

      // Col 25: Otros Conceptos / Tributos (Decimal 2 decimales)
      const col25 = this.formatearMonto(v.montoOtrosTributos);

      // Col 26: Importe Total (Decimal 2 decimales)
      const col26 = this.formatearMonto(v.totalCp);

      // Col 27: Código de Moneda (Fijo 3 caracteres: PEN, USD)
      const moneda = (v.codigoMoneda || 'PEN').trim().toUpperCase();
      const col27 = moneda;

      // Col 28: Tipo de Cambio (3 decimales si no es PEN; si es PEN, vacío)
      let col28 = '';
      if (moneda !== 'PEN') {
        const tc = Number(v.tipoCambio) || 1.0;
        col28 = tc.toFixed(3);
      }

      // Col 29: Campos de Cierre (Cadena fija |||||| al final según regla Anexo 2)
      const campos = [
        col1, col2, col3, col4, col5, col6, col7, col8, col9, col10,
        col11, col12, col13, col14, col15, col16, col17, col18, col19, col20,
        col21, col22, col23, col24, col25, col26, col27, col28
      ];

      // Cada registro termina con pipe y los 6 pipes de cierre del Anexo 2
      const linea = campos.join('|') + '|||||||';
      lineas.push(linea);
    }

    // Unir con \r\n (estándar Windows/SUNAT) sin salto de línea al final del archivo (EOF limpio)
    const contenidoPlano = lineas.join('\r\n');

    // 3. Nomenclatura del Archivo Plano (exactamente 35 caracteres)
    // LE[RUC][AÑO][MES]00140400021112.txt
    const nombreBase = `LE${rucEmisor}${anio}${mes}00140400021112`;
    const nombreTxt = `${nombreBase}.txt`;
    const nombreZip = `${nombreBase}.zip`;

    // 4. Compresión DEFLATE en cliente con fflate
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
      console.error('Error al generar archivo ZIP SIRE:', err);
      this.modalService.open({
        type: 'alert',
        title: 'Error de Exportación',
        message: 'No se pudo generar el archivo ZIP de exportación para SIRE.'
      });
    }
  }

  // --------------------------------------------------------------------------
  // Descarga SUNAT (CDP-AAAA-MM.txt)
  // Formato: RUC|TIPO CP|SERIE|NUMERO|FECHA EMISION|TOTAL CP
  // --------------------------------------------------------------------------
  async descargarSunatCdp(): Promise<void> {
    if (!this.ventasMatch || this.ventasMatch.length === 0) {
      await this.modalService.open({
        type: 'alert',
        title: 'Sin Datos',
        message: 'No hay comprobantes disponibles en este match para descargar.'
      });
      return;
    }

    // Si existen observaciones uno o más, pedir confirmación previa
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

    // 1. Obtener Metadatos Emisor y Periodo
    const rucEmisor = (this.ruc || this.empresa?.ruc || '').trim();
    if (!rucEmisor || rucEmisor.length !== 11) {
      await this.modalService.open({
        type: 'alert',
        title: 'RUC Inválido',
        message: 'No se pudo determinar el RUC del emisor (debe contener 11 dígitos numéricos).'
      });
      return;
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

    // 2. Formatear cada línea con los 6 campos requeridos separados por pipe (|)
    // Ejemplo: 20524546206|01|F004|73835|22/07/2026|1180.00
    const lineas: string[] = [];

    for (const v of this.ventasMatch) {
      const col1 = rucEmisor;
      const col2 = (v.codigoTipoCp || '01').trim().padStart(2, '0');
      const col3 = (v.serie || '').trim().toUpperCase();
      const col4 = this.normalizarNumeroSunat(v.numero);
      const col5 = this.formatearFechaDdMmYyyy(v.fechaEmision);
      // Formateo de monto para consulta masiva SUNAT:
      // 1. Estrictamente positivo (Math.abs)
      // 2. Si el T.C. es diferente de 1 (moneda extranjera), convertir dividiendo entre el T.C. y redondeando a 2 decimales
      let montoCalculado = Math.abs(Number(v.totalCp) || 0);
      const tc = Number(v.tipoCambio) || 1.0;
      if (tc > 0 && Math.abs(tc - 1.0) > 0.0001) {
        montoCalculado = montoCalculado / tc;
      }
      const col6 = this.formatearMonto(montoCalculado);

      const linea = `${col1}|${col2}|${col3}|${col4}|${col5}|${col6}`;
      lineas.push(linea);
    }

    // 3. Empaquetar en archivo .ZIP con bloques de máximo 100 registros por archivo .TXT
    // Si total <= 100: CDP-{anio}-{mes}.txt
    // Si total > 100: CDP-{anio}-{mes}-1.txt, CDP-{anio}-{mes}-2.txt, ...
    const CHUNK_SIZE = 100;
    const totalRegistros = lineas.length;
    const zipEntries: { [filename: string]: Uint8Array } = {};

    if (totalRegistros <= CHUNK_SIZE) {
      const nombreTxt = `CDP-${anio}-${mes}.txt`;
      zipEntries[nombreTxt] = strToU8(lineas.join('\r\n'));
    } else {
      const totalArchivos = Math.ceil(totalRegistros / CHUNK_SIZE);
      for (let i = 0; i < totalArchivos; i++) {
        const inicio = i * CHUNK_SIZE;
        const fin = Math.min(inicio + CHUNK_SIZE, totalRegistros);
        const bloqueLineas = lineas.slice(inicio, fin);
        const nombreTxt = `CDP-${anio}-${mes}-${i + 1}.txt`;
        zipEntries[nombreTxt] = strToU8(bloqueLineas.join('\r\n'));
      }
    }

    const nombreZip = `CDP-${anio}-${mes}.zip`;

    // 4. Compresión DEFLATE en cliente con fflate y descarga directa
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
      console.error('Error al generar archivo ZIP CDP SUNAT:', err);
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
}
