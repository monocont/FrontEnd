import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import {
  OperacionesService,
  CargarArchivoSunatDTO,
  ArchivoCargaItem,
  ArchivoCargaErrorItem,
  CompraItem
} from '../../../services/operaciones.service';
import {
  CatalogoSunatService,
  TipoCpCatalogo,
  TipoDocIdentidadCatalogo,
  EstadoComprobanteCatalogo
} from '../../../services/catalogo-sunat.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';

@Component({
  selector: 'app-compras-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './compras-detalle.component.html',
  styleUrl: './compras-detalle.component.css'
})
export class ComprasDetalleComponent implements OnInit {
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
  ruc: string = '';
  idCarga: string | null = null;
  esNuevaCarga: boolean = false;
  periodoParam: string = '';

  empresa: Empresa | null = null;
  carga: ArchivoCargaItem | null = null;
  compras: CompraItem[] = [];
  errores: ArchivoCargaErrorItem[] = [];
  mostrarErrores: boolean = false;

  cargando: boolean = false;
  cargandoDatos: boolean = false;
  archivoSeleccionado: File | null = null;
  mensajeError: string | null = null;
  mensajeExito: string | null = null;
  resultadoCarga: CargarArchivoSunatDTO | null = null;

  // Selector de Periodo de Carga tipo Calendario (Popup Mes / Año)
  periodoSeleccionado: string = ''; // formato "YYYYMM"
  mostrarSelectorPeriodo: boolean = false;
  anioSelector: number = new Date().getFullYear();
  mesSeleccionado: number | null = null;
  anioSeleccionado: number | null = null;

  listaMeses = [
    { value: 1, nombre: 'Ene', nombreCompleto: 'Enero' },
    { value: 2, nombre: 'Feb', nombreCompleto: 'Febrero' },
    { value: 3, nombre: 'Mar', nombreCompleto: 'Marzo' },
    { value: 4, nombre: 'Abr', nombreCompleto: 'Abril' },
    { value: 5, nombre: 'May', nombreCompleto: 'Mayo' },
    { value: 6, nombre: 'Jun', nombreCompleto: 'Junio' },
    { value: 7, nombre: 'Jul', nombreCompleto: 'Julio' },
    { value: 8, nombre: 'Ago', nombreCompleto: 'Agosto' },
    { value: 9, nombre: 'Set', nombreCompleto: 'Setiembre' },
    { value: 10, nombre: 'Oct', nombreCompleto: 'Octubre' },
    { value: 11, nombre: 'Nov', nombreCompleto: 'Noviembre' },
    { value: 12, nombre: 'Dic', nombreCompleto: 'Diciembre' },
  ];

  // Filtros internos tipo Excel con soporte Multi-Columna
  filtroTexto: string = '';
  criteriosOrden: { columna: string; ascendente: boolean }[] = [
    { columna: 'fechaEmision', ascendente: true }
  ];

  // Filtro Multiselección Tipo Excel para Tipo CP
  menuFiltroTipoCpAbierto: boolean = false;
  tiposCpSeleccionados: string[] = [];
  filtroTextoTipoCpMenu: string = '';

  // Filtro Multiselección para Tipo Doc Identidad
  menuFiltroTipoDocAbierto: boolean = false;
  tiposDocSeleccionados: string[] = [];
  filtroTextoTipoDocMenu: string = '';

  // Filtro Multiselección para Moneda
  menuFiltroMonedaAbierto: boolean = false;
  monedasSeleccionadas: string[] = [];
  filtroTextoMonedaMenu: string = '';

  // Filtro Multiselección para Estado Comprobante
  menuFiltroEstadoAbierto: boolean = false;
  estadosSeleccionados: string[] = [];
  filtroTextoEstadoMenu: string = '';

  // --- TIPO CP ---
  get opcionesTipoCpDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
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

  // --- TIPO DOC IDENTIDAD ---
  get opcionesTipoDocDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
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

  // --- MONEDA ---
  get opcionesMonedaDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
      const nombre = (v.codigoMoneda || 'PEN').trim().toUpperCase();
      mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
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

  // --- ESTADO COMPROBANTE ---
  get opcionesEstadoDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
      const nombre = this.obtenerNombreEstadoComprobante(v.codigoEstadoComprobante) || 'DESCONOCIDO';
      mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesEstadoFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoEstadoMenu.trim()) return this.opcionesEstadoDisponibles;
    const txt = this.filtroTextoEstadoMenu.toLowerCase().trim();
    return this.opcionesEstadoDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroEstado(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('estado');
    this.menuFiltroEstadoAbierto = !this.menuFiltroEstadoAbierto;
    if (this.menuFiltroEstadoAbierto) this.filtroTextoEstadoMenu = '';
  }

  toggleSeleccionEstado(nombre: string): void {
    const idx = this.estadosSeleccionados.indexOf(nombre);
    if (idx >= 0) this.estadosSeleccionados.splice(idx, 1);
    else this.estadosSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaEstadoSeleccionado(nombre: string): boolean {
    return this.estadosSeleccionados.includes(nombre);
  }

  seleccionarTodosEstados(): void {
    this.estadosSeleccionados = this.opcionesEstadoDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroEstados(): void {
    this.estadosSeleccionados = [];
    this.recalcularTotales();
  }

  // --- SERIE ---
  menuFiltroSerieAbierto: boolean = false;
  seriesSeleccionadas: string[] = [];
  filtroTextoSerieMenu: string = '';

  get opcionesSerieDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
      const nombre = (v.serie || '').trim().toUpperCase();
      if (nombre) {
        mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
      }
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

  // --- NÚMERO ---
  menuFiltroNumeroAbierto: boolean = false;
  numerosSeleccionados: string[] = [];
  filtroTextoNumeroMenu: string = '';

  get opcionesNumeroDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
      const nombre = (v.numero || '').trim();
      if (nombre) {
        mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
      }
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

  // --- FECHA DE EMISIÓN ---
  menuFiltroFechaEmisionAbierto: boolean = false;
  fechasEmisionSeleccionadas: string[] = []; // Strings formato 'YYYY-MM-DD'
  filtroTextoFechaEmisionMenu: string = '';

  get opcionesFechaEmisionDisponibles(): { fechaIso: string; fechaFormato: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
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

  // --- RUC / DOC CLIENTE ---
  menuFiltroDocClienteAbierto: boolean = false;
  docsClienteSeleccionados: string[] = [];
  filtroTextoDocClienteMenu: string = '';

  get opcionesDocClienteDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
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

  // --- RAZÓN SOCIAL / CLIENTE ---
  menuFiltroRazonSocialAbierto: boolean = false;
  razonesSocialesSeleccionadas: string[] = [];
  filtroTextoRazonSocialMenu: string = '';

  get opcionesRazonSocialDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
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

  // --- CAR SUNAT ---
  menuFiltroCarSunatAbierto: boolean = false;
  carSunatsSeleccionados: string[] = [];
  filtroTextoCarSunatMenu: string = '';

  get opcionesCarSunatDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.compras) {
      const car = (v.carSunat || '').trim();
      if (car) mapa.set(car, (mapa.get(car) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get opcionesCarSunatFiltradas(): { nombre: string; cantidad: number }[] {
    if (!this.filtroTextoCarSunatMenu.trim()) return this.opcionesCarSunatDisponibles;
    const txt = this.filtroTextoCarSunatMenu.toLowerCase().trim();
    return this.opcionesCarSunatDisponibles.filter(op => op.nombre.toLowerCase().includes(txt));
  }

  toggleMenuFiltroCarSunat(event: Event): void {
    event.stopPropagation();
    this.cerrarOtrosMenus('carSunat');
    this.menuFiltroCarSunatAbierto = !this.menuFiltroCarSunatAbierto;
    if (this.menuFiltroCarSunatAbierto) this.filtroTextoCarSunatMenu = '';
  }

  toggleSeleccionCarSunat(nombre: string): void {
    const idx = this.carSunatsSeleccionados.indexOf(nombre);
    if (idx >= 0) this.carSunatsSeleccionados.splice(idx, 1);
    else this.carSunatsSeleccionados.push(nombre);
    this.recalcularTotales();
  }

  estaCarSunatSeleccionado(nombre: string): boolean {
    return this.carSunatsSeleccionados.includes(nombre);
  }

  seleccionarTodosCarSunats(): void {
    this.carSunatsSeleccionados = this.opcionesCarSunatDisponibles.map(o => o.nombre);
    this.recalcularTotales();
  }

  limpiarFiltroCarSunats(): void {
    this.carSunatsSeleccionados = [];
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
    if (excepto !== 'carSunat') this.menuFiltroCarSunatAbierto = false;
    if (excepto !== 'estado') this.menuFiltroEstadoAbierto = false;
  }

  cerrarTodosMenus(): void {
    this.menuFiltroFechaEmisionAbierto = false;
    this.menuFiltroTipoCpAbierto = false;
    this.menuFiltroSerieAbierto = false;
    this.menuFiltroNumeroAbierto = false;
    this.menuFiltroTipoDocAbierto = false;
    this.menuFiltroDocClienteAbierto = false;
    this.menuFiltroRazonSocialAbierto = false;
    this.menuFiltroMonedaAbierto = false;
    this.menuFiltroCarSunatAbierto = false;
    this.menuFiltroEstadoAbierto = false;
  }


  // Métricas
  totalBaseImponible: number = 0;
  totalIgv: number = 0;
  totalGeneral: number = 0;

  get comprasFiltradas(): CompraItem[] {
    let list = this.compras;

    // 0. Filtro Multiselección por Fecha de Emisión
    if (this.fechasEmisionSeleccionadas.length > 0) {
      list = list.filter(v => {
        if (!v.fechaEmision) return false;
        const iso = typeof v.fechaEmision === 'string' ? v.fechaEmision.substring(0, 10) : new Date(v.fechaEmision).toISOString().substring(0, 10);
        return this.fechasEmisionSeleccionadas.includes(iso);
      });
    }

    // 1. Filtro Multiselección por Tipo CP
    if (this.tiposCpSeleccionados.length > 0) {
      list = list.filter(v => {
        const nombre = this.obtenerNombreTipoCp(v.codigoTipoCp) || 'DESCONOCIDO';
        return this.tiposCpSeleccionados.includes(nombre);
      });
    }

    // 2. Filtro Multiselección por Serie
    if (this.seriesSeleccionadas.length > 0) {
      list = list.filter(v => {
        const s = (v.serie || '').trim().toUpperCase();
        return this.seriesSeleccionadas.includes(s);
      });
    }

    // 3. Filtro Multiselección por Número
    if (this.numerosSeleccionados.length > 0) {
      list = list.filter(v => {
        const n = (v.numero || '').trim();
        return this.numerosSeleccionados.includes(n);
      });
    }

    // 4. Filtro Multiselección por Tipo Doc Identidad
    if (this.tiposDocSeleccionados.length > 0) {
      list = list.filter(v => {
        const nombre = this.obtenerNombreTipoDocIdentidad(v.codigoTipoDocIdentidad || '6') || 'DESCONOCIDO';
        return this.tiposDocSeleccionados.includes(nombre);
      });
    }

    // 5. Filtro Multiselección por RUC / Doc Cliente
    if (this.docsClienteSeleccionados.length > 0) {
      list = list.filter(v => {
        const doc = (v.nroDocIdentidad || '').trim();
        return this.docsClienteSeleccionados.includes(doc);
      });
    }

    // 6. Filtro Multiselección por Razón Social
    if (this.razonesSocialesSeleccionadas.length > 0) {
      list = list.filter(v => {
        const rs = (v.razonSocial || '').trim();
        return this.razonesSocialesSeleccionadas.includes(rs);
      });
    }

    // 7. Filtro Multiselección por Moneda
    if (this.monedasSeleccionadas.length > 0) {
      list = list.filter(v => {
        const nombre = (v.codigoMoneda || 'PEN').trim().toUpperCase();
        return this.monedasSeleccionadas.includes(nombre);
      });
    }

    // 8. Filtro Multiselección por CAR SUNAT
    if (this.carSunatsSeleccionados.length > 0) {
      list = list.filter(v => {
        const car = (v.carSunat || '').trim();
        return this.carSunatsSeleccionados.includes(car);
      });
    }

    // 9. Filtro Multiselección por Estado Comprobante
    if (this.estadosSeleccionados.length > 0) {
      list = list.filter(v => {
        const nombre = this.obtenerNombreEstadoComprobante(v.codigoEstadoComprobante) || 'DESCONOCIDO';
        return this.estadosSeleccionados.includes(nombre);
      });
    }

    // 5. Filtro de búsqueda general de texto
    if (this.filtroTexto) {
      const txt = this.filtroTexto.toLowerCase().trim();
      list = list.filter(
        v =>
          (v.empresaRuc && v.empresaRuc.toLowerCase().includes(txt)) ||
          (v.nroDocIdentidad && v.nroDocIdentidad.toLowerCase().includes(txt)) ||
          (v.razonSocial && v.razonSocial.toLowerCase().includes(txt)) ||
          `${v.serie}-${v.numero}`.toLowerCase().includes(txt) ||
          (v.codigoTipoCp && (v.codigoTipoCp.toLowerCase().includes(txt) || this.obtenerNombreTipoCp(v.codigoTipoCp).toLowerCase().includes(txt))) ||
          (v.codigoTipoDocIdentidad && (v.codigoTipoDocIdentidad.toLowerCase().includes(txt) || this.obtenerNombreTipoDocIdentidad(v.codigoTipoDocIdentidad).toLowerCase().includes(txt))) ||
          (v.codigoEstadoComprobante && (v.codigoEstadoComprobante.toLowerCase().includes(txt) || this.obtenerNombreEstadoComprobante(v.codigoEstadoComprobante).toLowerCase().includes(txt))) ||
          (v.carSunat && v.carSunat.toLowerCase().includes(txt))
      );
    }

    if (this.criteriosOrden.length === 0) {
      return list;
    }

    // Ordenar respetando el orden natural/insertado de las filas
    return list;
  }

  get erroresOrdenados(): ArchivoCargaErrorItem[] {
    return this.errores.slice().sort((a, b) => {
      const tipoA = (a.tipoError || '').toLowerCase();
      const tipoB = (b.tipoError || '').toLowerCase();
      const cmpTipo = tipoA.localeCompare(tipoB);
      if (cmpTipo !== 0) return cmpTipo;

      const campoA = (a.campoError || '').toLowerCase();
      const campoB = (b.campoError || '').toLowerCase();
      const cmpCampo = campoA.localeCompare(campoB);
      if (cmpCampo !== 0) return cmpCampo;

      return a.numeroLinea - b.numeroLinea;
    });
  }

  ngOnInit(): void {
    this.cargarCatalogosSunat();
    const max = this.obtenerMesAnterior();
    this.anioSelector = max.anio;

    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      this.idCarga = params.get('idCarga');
      this.esNuevaCarga = this.route.snapshot.url.some(segment => segment.path === 'nueva');

      this.route.queryParamMap.subscribe(q => {
        this.periodoParam = q.get('periodo') || '';
        if (this.periodoParam && this.periodoParam.length === 6) {
          this.setPeriodoDesdeParam(this.periodoParam);
        }
      });

      if (this.idEmpresa) {
        this.cargarDatosEmpresa();
        if (this.idCarga && !this.esNuevaCarga) {
          this.cargarDetalleExistente(this.idCarga);
        }
      }
    });
  }

  obtenerMesAnterior(): { anio: number; mes: number } {
    const ahora = new Date();
    let anio = ahora.getFullYear();
    let mes = ahora.getMonth();
    if (mes === 0) {
      mes = 12;
      anio -= 1;
    }
    return { anio, mes };
  }

  setPeriodoDesdeParam(p: string): void {
    this.periodoSeleccionado = p;
    this.anioSeleccionado = parseInt(p.substring(0, 4), 10);
    this.mesSeleccionado = parseInt(p.substring(4, 6), 10);
    this.anioSelector = this.anioSeleccionado;
  }

  toggleSelectorPeriodo(): void {
    if (!this.mostrarSelectorPeriodo) {
      const max = this.obtenerMesAnterior();
      this.anioSelector = this.anioSeleccionado || max.anio;
    }
    this.mostrarSelectorPeriodo = !this.mostrarSelectorPeriodo;
  }

  cerrarSelectorPeriodo(): void {
    this.mostrarSelectorPeriodo = false;
  }

  navegarAnioPeriodo(delta: number): void {
    const anioMin = 2000;
    const max = this.obtenerMesAnterior();
    const nuevoAnio = this.anioSelector + delta;
    if (nuevoAnio >= anioMin && nuevoAnio <= max.anio) {
      this.anioSelector = nuevoAnio;
    }
  }

  seleccionarMesPeriodo(mes: number): void {
    if (this.mesPeriodoBloqueado(mes)) return;

    this.mesSeleccionado = mes;
    this.anioSeleccionado = this.anioSelector;
    const mesStr = mes.toString().padStart(2, '0');
    this.periodoSeleccionado = `${this.anioSeleccionado}${mesStr}`;
    this.mostrarSelectorPeriodo = false;
    this.cdr.detectChanges();
  }

  mesPeriodoBloqueado(valor: number): boolean {
    const max = this.obtenerMesAnterior();
    return (
      this.anioSelector > max.anio ||
      (this.anioSelector === max.anio && valor > max.mes)
    );
  }

  anioPeriodoAnteriorHabilitado(): boolean {
    return this.anioSelector > 2000;
  }

  anioPeriodoSiguienteHabilitado(): boolean {
    const max = this.obtenerMesAnterior();
    return this.anioSelector < max.anio;
  }

  get etiquetaBotonPeriodoCarga(): string {
    if (!this.periodoSeleccionado || !this.mesSeleccionado || !this.anioSeleccionado) {
      return 'Seleccione periodo de carga';
    }
    const mesObj = this.listaMeses.find(m => m.value === this.mesSeleccionado);
    return `${mesObj?.nombreCompleto || ''} ${this.anioSeleccionado} (${this.periodoSeleccionado})`;
  }

  cargarCatalogosSunat(): void {
    // 1. Catálogo Tipo Comprobante de Pago (catalogo.tipo_cp)
    this.catalogoSunatService.obtenerTiposCp().subscribe({
      next: (tipos) => {
        this.tiposCp = tipos || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar catálogo tipo_cp:', err);
      }
    });

    // 2. Catálogo Tipo Documento de Identidad (catalogo.tipo_doc_identidad)
    this.catalogoSunatService.obtenerTiposDocIdentidad().subscribe({
      next: (docs) => {
        this.tiposDocIdentidad = docs || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar catálogo tipo_doc_identidad:', err);
      }
    });

    // 3. Catálogo Estado de Comprobante (catalogo.estado_comprobante)
    this.catalogoSunatService.obtenerEstadosComprobante().subscribe({
      next: (estados) => {
        this.estadosComprobante = estados || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar catálogo estado_comprobante:', err);
      }
    });
  }

  cargarDatosEmpresa(): void {
    // Empresa ya validada por el guard: disponible sin espera (breadcrumb correcto al instante)
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

  cargarDetalleExistente(idCarga: string): void {
    this.cargandoDatos = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    this.operacionesService.obtenerCargaPorId(idCarga).subscribe({
      next: (c: ArchivoCargaItem) => {
        this.carga = c;
        this.cdr.detectChanges();
      }
    });

    this.operacionesService.obtenerErroresCarga(idCarga).subscribe({
      next: (errs: ArchivoCargaErrorItem[]) => {
        this.errores = errs || [];
        this.cdr.detectChanges();
      }
    });

    this.operacionesService.listarComprasPorCarga(idCarga).subscribe({
      next: (c: CompraItem[]) => {
        this.cargandoDatos = false;
        this.compras = c || [];
        this.calcularTotales(this.compras);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoDatos = false;
        this.mensajeError = 'No se pudieron recuperar los comprobantes de compras.';
        this.cdr.detectChanges();
      }
    });
  }

  ordenarPor(columna: string): void {
    const index = this.criteriosOrden.findIndex(c => c.columna === columna);

    if (index >= 0) {
      if (this.criteriosOrden[index].ascendente) {
        // 2do clic en esta columna: pasa a descendente
        this.criteriosOrden[index].ascendente = false;
      } else {
        // 3er clic en esta columna: se quita del ordenamiento
        this.criteriosOrden.splice(index, 1);
      }
    } else {
      // 1er clic en esta columna: se agrega con orden ascendente conservando las demás
      this.criteriosOrden.push({ columna, ascendente: true });
    }
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

  obtenerDescripcionEstadoComprobante(codigo: string | null | undefined): string {
    if (!codigo) return '';
    const clean = codigo.toString().trim();
    const encontrado = this.estadosComprobante.find(e => e.codigo.trim() === clean);
    return encontrado ? encontrado.descripcion : `Estado ${codigo}`;
  }

  obtenerClaseFilaPorEstado(codigo: string | null | undefined): string {
    if (!codigo) return '';
    const clean = codigo.toString().trim();
    switch (clean) {
      case '0':
        // OMITIDO (Alerta/Atención - Ámbar / Naranja suave)
        return 'fila-omitido';
      case '2':
        // ANULADO (Baja/Anulación - Rojo / Rosa suave)
        return 'fila-anulado';
      case '8':
        // OMITIDO ANTERIOR (Periodo anterior omitido - Púrpura / Violeta suave)
        return 'fila-omitido-anterior';
      case '9':
        // RECTIFICADO ANTERIOR (Rectificación / Modificación anterior - Azul / Celeste suave)
        return 'fila-rectificado-anterior';
      default:
        // 1 (VÁLIDO) o cualquier otro: sin color especial
        return '';
    }
  }


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'txt' && ext !== 'csv') {
        this.mensajeError = 'Formato no soportado. Seleccione un archivo .txt o .csv';
        this.modalService.open({
          type: 'warning',
          title: 'Formato no válido',
          message: 'El archivo seleccionado no es válido. Solo se admiten archivos estructurados SUNAT RCE en formato .txt o .csv.'
        });
        this.archivoSeleccionado = null;
        input.value = '';
        return;
      }
      this.archivoSeleccionado = file;
      this.mensajeError = null;
    }
  }

  removerArchivoSeleccionado(): void {
    this.archivoSeleccionado = null;
    const input = document.getElementById('fileCompra') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  ejecutarCarga(): void {
    if (!this.archivoSeleccionado) {
      this.modalService.open({
        type: 'warning',
        title: 'Archivo Requerido',
        message: 'Por favor seleccione un archivo oficial SUNAT RCE (.txt o .csv) para iniciar la carga.'
      });
      return;
    }

    const periodo = this.periodoSeleccionado || this.periodoParam || (this.carga ? this.carga.periodo : '');
    if (!periodo) {
      this.modalService.open({
        type: 'warning',
        title: 'Periodo No Seleccionado',
        message: 'Por favor seleccione el periodo contable (Año y Mes) para la carga.'
      });
      return;
    }

    this.cargando = true;
    this.mensajeError = null;
    this.mensajeExito = null;
    this.loadingService.show();
    this.cdr.detectChanges();

    this.operacionesService.cargarCompras(this.ruc, periodo, this.archivoSeleccionado).subscribe({
      next: (res: CargarArchivoSunatDTO) => {
        this.cargando = false;
        this.loadingService.hide();
        this.resultadoCarga = res;
        if (res.estado === 'Duplicado') {
          this.mensajeError = `El archivo ya fue cargado anteriormente (${res.observaciones || ''}).`;
          this.modalService.open({
            type: 'alert',
            title: 'Archivo Duplicado',
            message: `El archivo ya fue registrado anteriormente (${res.observaciones || ''}).`
          });
        } else {
          this.mensajeExito = `Carga exitosa: ${res.numRegistrosValidos} válidos de ${res.numRegistros} registros leídos.`;
          this.modalService.open({
            type: 'info',
            title: 'Carga Completada con Éxito',
            message: `Se procesaron correctamente ${res.numRegistrosValidos} de ${res.numRegistros} comprobantes de compras para el periodo ${periodo}.`
          });
        }
        this.archivoSeleccionado = null;
        if (res.idCarga) {
          this.idCarga = res.idCarga;
          this.esNuevaCarga = false;
          this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'compras', res.idCarga]);
          this.cargarDetalleExistente(res.idCarga);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.cargando = false;
        this.loadingService.hide();

        let msg = '';
        const errors = err.error?.errors || err.error?.Errors;
        if (Array.isArray(errors) && errors.length > 0) {
          msg = errors.join('\n');
        } else if (typeof errors === 'string') {
          msg = errors;
        } else {
          msg = err.error?.message || err.error?.detail || err.error?.title || (typeof err.error === 'string' ? err.error : err.message) || 'Error en el servidor al procesar la carga.';
        }

        this.modalService.open({
          type: 'error',
          title: 'Error en la Carga',
          message: msg
        });
        this.cdr.detectChanges();
      }
    });
  }

  exportarCSV(): void {
    if (this.compras.length === 0) return;

    const encabezados = [
      'RUC Empresa',
      'CAR SUNAT',
      'Fecha Emisión',
      'Tipo CP',
      'Serie',
      'Número',
      'Tipo Doc',
      'RUC Proveedor',
      'Razón Social',
      'Base Imponible DG',
      'IGV DG',
      'Total CP',
      'Moneda',
      'Tipo Cambio',
      'Estado'
    ];

    const filas = this.comprasFiltradas.map(c => [
      `"${c.empresaRuc || this.ruc || ''}"`,
      `"${c.carSunat || ''}"`,
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
    a.download = `Compras_${this.ruc}_${this.carga?.periodo || this.periodoParam || 'Periodo'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  // ===== Edición manual de comprobantes (alta/baja/modificación hasta "Guardar Cambios") =====
  idsParaEliminar: string[] = [];
  guardandoCambios: boolean = false;

  get filasNuevas(): (CompraItem & { esNuevo?: boolean })[] {
    return (this.compras as any[]).filter(c => c.esNuevo === true || (c.idCompra && c.idCompra.startsWith('temp_')));
  }

  get filasModificadas(): CompraItem[] {
    return (this.compras as any[]).filter(c => !c.esNuevo && (!c.idCompra || !c.idCompra.startsWith('temp_')) && c.modificado === true);
  }

  get totalCambiosPendientes(): number {
    return this.idsParaEliminar.length + this.filasNuevas.length + this.filasModificadas.length;
  }

  obtenerFechaDefecto(): string {
    const periodo = this.periodoParam || this.carga?.periodo || '';
    if (periodo.length === 6) {
      const a = periodo.substring(0, 4);
      const m = periodo.substring(4, 6);
      return `${a}-${m}-01`;
    }
    const d = new Date();
    return d.toISOString().substring(0, 10);
  }

  formatearFechaInput(fechaStr: string | null | undefined): string {
    if (!fechaStr) return this.obtenerFechaDefecto();
    if (fechaStr.includes('T')) return fechaStr.split('T')[0];
    if (fechaStr.length >= 10 && fechaStr.includes('-')) return fechaStr.substring(0, 10);
    if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    }
    return fechaStr;
  }

  insertarFilaVisual(referenciaCompraOIndice: CompraItem | number, event?: Event): void {
    if (event) event.stopPropagation();

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fechaDefecto = this.obtenerFechaDefecto();

    const nuevaFila: CompraItem & { esNuevo?: boolean } = {
      idCompra: tempId,
      empresaRuc: this.ruc,
      carSunat: '',
      codigoTipoCp: '01',
      serie: 'F001',
      numero: '',
      fechaEmision: fechaDefecto,
      codigoTipoDocIdentidad: '6',
      nroDocIdentidad: '',
      razonSocial: '',
      biGravadoDg: 0,
      igvIpmDg: 0,
      totalCp: 0,
      codigoMoneda: 'PEN',
      tipoCambio: 1.0,
      codigoEstadoComprobante: '1',
      esNuevo: true
    };

    if (typeof referenciaCompraOIndice === 'number') {
      if (referenciaCompraOIndice <= 0) {
        this.compras.unshift(nuevaFila);
      } else if (referenciaCompraOIndice >= this.compras.length) {
        this.compras.push(nuevaFila);
      } else {
        this.compras.splice(referenciaCompraOIndice, 0, nuevaFila);
      }
    } else {
      const idx = this.compras.indexOf(referenciaCompraOIndice);
      if (idx >= 0) {
        this.compras.splice(idx, 0, nuevaFila);
      } else {
        this.compras.unshift(nuevaFila);
      }
    }

    this.recalcularTotales();
    this.cdr.detectChanges();
  }

  iniciarEdicionFila(compra: CompraItem, event?: Event): void {
    if (event) event.stopPropagation();

    this.compras.forEach(c => {
      if (c !== compra && c.editando) {
        c.editando = false;
      }
    });

    if (compra.fechaEmision) {
      compra.fechaEmision = this.formatearFechaInput(compra.fechaEmision);
    }

    if (!(compra as any)._original) {
      (compra as any)._original = {
        empresaRuc: compra.empresaRuc,
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
        detraccion: compra.detraccion
      };
    }

    compra.editando = true;
    this.cdr.detectChanges();
  }

  verificarYMarcarModificacion(compra: CompraItem): void {
    if (compra.esNuevo) return;

    const orig = (compra as any)._original;
    if (!orig) return;

    const haCambiado =
      (compra.empresaRuc || '').trim() !== (orig.empresaRuc || '').trim() ||
      (compra.fechaEmision || '') !== (orig.fechaEmision || '') ||
      (compra.codigoTipoCp || '') !== (orig.codigoTipoCp || '') ||
      (compra.serie || '').trim().toUpperCase() !== (orig.serie || '').trim().toUpperCase() ||
      (compra.numero || '').trim() !== (orig.numero || '').trim() ||
      (compra.codigoTipoDocIdentidad || '') !== (orig.codigoTipoDocIdentidad || '') ||
      (compra.nroDocIdentidad || '').trim() !== (orig.nroDocIdentidad || '').trim() ||
      (compra.razonSocial || '').trim().toUpperCase() !== (orig.razonSocial || '').trim().toUpperCase() ||
      (Number(compra.biGravadoDg) || 0) !== (Number(orig.biGravadoDg) || 0) ||
      (Number(compra.igvIpmDg) || 0) !== (Number(orig.igvIpmDg) || 0) ||
      (Number(compra.totalCp) || 0) !== (Number(orig.totalCp) || 0) ||
      (compra.codigoEstadoComprobante || '') !== (orig.codigoEstadoComprobante || '') ||
      (compra.detraccion || '') !== (orig.detraccion || '');

    compra.modificado = haCambiado;
  }

  marcarFilaModificada(compra: CompraItem): void {
    this.verificarYMarcarModificacion(compra);
  }

  obtenerLongitudMaxDocIdentidad(tipoDoc: string | null | undefined): number {
    const t = (tipoDoc || '').trim();
    if (t === '1') return 8;   // DNI
    if (t === '6') return 11;  // RUC
    return 15;                 // Otros
  }

  obtenerPlaceholderDocIdentidad(tipoDoc: string | null | undefined): string {
    const t = (tipoDoc || '').trim();
    if (t === '1') return 'DNI (8 dígitos)';
    if (t === '6') return 'RUC (20/10...)';
    return 'Nro Documento';
  }

  sanitizarNroDocIdentidad(compra: CompraItem): void {
    if (!compra.nroDocIdentidad) return;

    let valor = compra.nroDocIdentidad.toString();
    valor = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    valor = valor.replace(/\s+/g, '');

    const tipo = (compra.codigoTipoDocIdentidad || '').trim();

    if (tipo === '1' || tipo === '6') {
      valor = valor.replace(/\D/g, '');
      const maxLen = tipo === '1' ? 8 : 11;
      if (valor.length > maxLen) valor = valor.substring(0, maxLen);
    } else {
      valor = valor.replace(/[^a-zA-Z0-9]/g, '');
      if (valor.length > 15) valor = valor.substring(0, 15);
    }

    compra.nroDocIdentidad = valor;
  }

  onTipoDocIdentidadCambio(compra: CompraItem): void {
    this.sanitizarNroDocIdentidad(compra);
    this.verificarYMarcarModificacion(compra);
  }

  onNroDocIdentidadInput(compra: CompraItem): void {
    this.sanitizarNroDocIdentidad(compra);
    this.verificarYMarcarModificacion(compra);
  }

  validarDocIdentidad(tipoDoc: string | null | undefined, nroDoc: string | null | undefined): { valido: boolean; mensaje?: string } {
    const tipo = (tipoDoc || '').trim();
    const doc = (nroDoc || '').trim();

    if (!doc) {
      return { valido: false, mensaje: 'El número de documento del proveedor es obligatorio.' };
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

  esDocIdentidadInvalido(compra: CompraItem): boolean {
    if (!compra.nroDocIdentidad && !compra.esNuevo && !compra.editando) return false;
    return !this.validarDocIdentidad(compra.codigoTipoDocIdentidad, compra.nroDocIdentidad).valido;
  }

  onMontoCambio(compra: any): void {
    this.verificarYMarcarModificacion(compra);
    this.recalcularTotales();
  }

  finalizarEdicionFila(compra: CompraItem): void {
    this.sanitizarNroDocIdentidad(compra);
    this.verificarYMarcarModificacion(compra);
    compra.editando = false;
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Si el clic ocurrió dentro de un modal, popup de periodo o menú desplegable, ignorar
    if (target.closest('.modal-contenedor') || target.closest('.fixed') || target.closest('.animate-fade-in')) {
      return;
    }

    // Buscar filas existentes en edición (excluye filas recién insertadas temporales)
    const filasEditando = this.compras.filter(c => c.editando && !c.esNuevo);
    if (filasEditando.length === 0) return;

    const trClickeado = target.closest('tr.fila-contenedor');

    filasEditando.forEach(c => {
      // Si el clic fue fuera de la fila que se está editando, finalizar y cerrar edición
      if (!trClickeado || trClickeado.getAttribute('data-id') !== c.idCompra) {
        this.finalizarEdicionFila(c);
      }
    });
  }

  async eliminarFilaVisual(compra: CompraItem & { esNuevo?: boolean }, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const esNueva = compra.esNuevo || (compra.idCompra && compra.idCompra.startsWith('temp_'));

    if (esNueva) {
      this.compras = this.compras.filter(c => c !== compra && c.idCompra !== compra.idCompra);
      this.recalcularTotales();
      this.cdr.detectChanges();
      return;
    }

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Registro de Compra',
      message: `¿Está seguro de quitar el comprobante ${compra.serie}-${compra.numero} (${compra.razonSocial || 'Sin Razón Social'}) de la lista? Este cambio se aplicará definitivamente al presionar "Guardar Cambios".`,
      confirmText: 'Sí, quitar',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    if (compra.idCompra) {
      if (!this.idsParaEliminar.includes(compra.idCompra)) {
        this.idsParaEliminar.push(compra.idCompra);
      }
    }

    this.compras = this.compras.filter(c => c !== compra && c.idCompra !== compra.idCompra);
    this.recalcularTotales();
    this.cdr.detectChanges();
  }

  async guardarCambios(): Promise<void> {
    if (!this.idCarga || this.esNuevaCarga) return;

    const nuevas = this.filasNuevas;
    const modificadas = this.filasModificadas;
    const eliminados = this.idsParaEliminar;

    if (nuevas.length === 0 && modificadas.length === 0 && eliminados.length === 0) {
      return;
    }

    // 1. Validar campos obligatorios de filas nuevas
    for (let i = 0; i < nuevas.length; i++) {
      const f = nuevas[i];
      const numFila = i + 1;
      if (!f.fechaEmision) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `En la nueva fila #${numFila}, la Fecha de Emisión es obligatoria.` });
        return;
      }
      if (!f.codigoTipoCp) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `En la nueva fila #${numFila}, seleccione el Tipo de Comprobante.` });
        return;
      }
      if (!f.serie || !f.serie.trim()) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `En la nueva fila #${numFila}, ingrese la Serie del comprobante.` });
        return;
      }
      if (!f.numero || !f.numero.trim()) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `En la nueva fila #${numFila}, ingrese el Número del comprobante.` });
        return;
      }
      if (!f.codigoTipoDocIdentidad) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `En la nueva fila #${numFila}, seleccione el Tipo de Documento de Identidad.` });
        return;
      }
      if (!f.nroDocIdentidad || !f.nroDocIdentidad.trim()) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `En la nueva fila #${numFila}, ingrese el Número de Documento del proveedor.` });
        return;
      }

      const resValDoc = this.validarDocIdentidad(f.codigoTipoDocIdentidad, f.nroDocIdentidad);
      if (!resValDoc.valido) {
        await this.modalService.open({ type: 'alert', title: 'Documento Inválido', message: `En la nueva fila #${numFila}: ${resValDoc.mensaje}` });
        return;
      }

      if (!f.razonSocial || !f.razonSocial.trim()) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `En la nueva fila #${numFila}, ingrese la Razón Social o Nombre del proveedor.` });
        return;
      }
    }

    // 1.1 Validar filas modificadas
    for (const m of modificadas) {
      if (!m.fechaEmision) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `El comprobante modificado ${m.serie}-${m.numero} requiere Fecha de Emisión.` });
        return;
      }
      if (!m.serie || !m.serie.trim() || !m.numero || !m.numero.trim()) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: 'El comprobante modificado requiere Serie y Número válidos.' });
        return;
      }
      if (!m.nroDocIdentidad || !m.nroDocIdentidad.trim() || !m.razonSocial || !m.razonSocial.trim()) {
        await this.modalService.open({ type: 'alert', title: 'Dato Requerido', message: `El comprobante modificado ${m.serie}-${m.numero} requiere Documento y Razón Social del proveedor.` });
        return;
      }

      const resValDocMod = this.validarDocIdentidad(m.codigoTipoDocIdentidad, m.nroDocIdentidad);
      if (!resValDocMod.valido) {
        await this.modalService.open({ type: 'alert', title: 'Documento Inválido', message: `En el comprobante ${m.serie}-${m.numero}: ${resValDocMod.mensaje}` });
        return;
      }
    }

    // 2. Resumen de confirmación
    const partesDetalle: string[] = [];
    if (eliminados.length > 0) partesDetalle.push(`eliminar ${eliminados.length} comprobante(s)`);
    if (nuevas.length > 0) partesDetalle.push(`insertar ${nuevas.length} nuevo(s) registro(s)`);
    if (modificadas.length > 0) partesDetalle.push(`actualizar ${modificadas.length} registro(s) editado(s)`);

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Confirmar Guardado de Cambios',
      message: `Se procederá a ${partesDetalle.join(', ')} en la base de datos. Se revalidarán automáticamente las observaciones. ¿Desea continuar?`,
      confirmText: 'Guardar',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    this.guardandoCambios = true;
    this.loadingService.show();
    this.cdr.detectChanges();

    // 3. Payloads
    const nuevosPayload = nuevas.map(n => ({
      empresaRuc: n.empresaRuc?.trim() || this.ruc,
      codigoTipoCp: n.codigoTipoCp,
      serie: n.serie?.trim().toUpperCase(),
      numero: n.numero?.trim(),
      fechaEmision: n.fechaEmision,
      codigoTipoDocIdentidad: n.codigoTipoDocIdentidad || '6',
      nroDocIdentidad: n.nroDocIdentidad?.trim(),
      razonSocial: n.razonSocial?.trim().toUpperCase(),
      biGravadoDg: Number(n.biGravadoDg) || 0,
      igvIpmDg: Number(n.igvIpmDg) || 0,
      totalCp: Number(n.totalCp) || 0,
      codigoMoneda: n.codigoMoneda || 'PEN',
      tipoCambio: Number(n.tipoCambio) || 1.0,
      codigoEstadoComprobante: n.codigoEstadoComprobante || '1',
      detraccion: n.detraccion || null,
      carSunat: n.carSunat
    }));

    const modificadosPayload = modificadas.map(m => ({
      idCompra: m.idCompra,
      empresaRuc: m.empresaRuc?.trim() || this.ruc,
      codigoTipoCp: m.codigoTipoCp,
      serie: m.serie?.trim().toUpperCase(),
      numero: m.numero?.trim(),
      fechaEmision: m.fechaEmision,
      codigoTipoDocIdentidad: m.codigoTipoDocIdentidad || '6',
      nroDocIdentidad: m.nroDocIdentidad?.trim(),
      razonSocial: m.razonSocial?.trim().toUpperCase(),
      biGravadoDg: Number(m.biGravadoDg) || 0,
      igvIpmDg: Number(m.igvIpmDg) || 0,
      totalCp: Number(m.totalCp) || 0,
      codigoMoneda: m.codigoMoneda || 'PEN',
      tipoCambio: Number(m.tipoCambio) || 1.0,
      codigoEstadoComprobante: m.codigoEstadoComprobante || '1',
      detraccion: m.detraccion || null,
      carSunat: m.carSunat
    }));

    this.operacionesService.actualizarCompras(this.idCarga, eliminados, nuevosPayload, modificadosPayload).subscribe({
      next: async (res) => {
        this.guardandoCambios = false;
        this.loadingService.hide();
        this.idsParaEliminar = [];

        if (this.idCarga) {
          this.cargarDetalleExistente(this.idCarga);
        }
        this.cdr.detectChanges();

        await this.modalService.open({
          type: 'info',
          title: 'Operación Exitosa',
          message: res?.mensaje || 'Registros actualizados y comprobantes revalidados correctamente.',
          confirmText: 'Aceptar'
        });
      },
      error: async (err) => {
        this.guardandoCambios = false;
        this.loadingService.hide();
        console.error('Error al guardar cambios de compras:', err);
        const errorMsg = err?.error?.message || err?.error?.Mensaje || 'Ocurrió un error al actualizar los comprobantes de compra.';
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

  recalcularTotales(): void {
    const lista = this.comprasFiltradas;
    this.totalBaseImponible = lista.reduce((acc, c) => acc + (Number(c.biGravadoDg) || 0), 0);
    this.totalIgv = lista.reduce((acc, c) => acc + (Number(c.igvIpmDg) || 0), 0);
    this.totalGeneral = lista.reduce((acc, c) => acc + (Number(c.totalCp) || 0), 0);
    this.cdr.detectChanges();
  }

  private calcularTotales(compras: CompraItem[]): void {
    this.totalBaseImponible = compras.reduce((acc, c) => acc + (c.biGravadoDg || 0), 0);
    this.totalIgv = compras.reduce((acc, c) => acc + (c.igvIpmDg || 0), 0);
    this.totalGeneral = compras.reduce((acc, c) => acc + (c.totalCp || 0), 0);
  }
}
