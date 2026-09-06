import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import {
  OperacionesService,
  VentaEmpresaItem,
  CargaEmpresaItem,
  ObservacionEmpresaItem
} from '../../../services/operaciones.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';
import { ModalObservacionesComponent } from '../../../../../../shared/ui/modal-observaciones/modal-observaciones.component';

type FilaVenta = VentaEmpresaItem;

interface CriterioOrden {
  columna: string;
  ascendente: boolean;
}

interface CatalogoItem {
  codigo: string;
  nombre: string;
}

@Component({
  selector: 'app-datos-empresa-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalObservacionesComponent],
  templateUrl: './datos-empresa-detalle.component.html',
  styleUrl: './datos-empresa-detalle.component.css'
})
export class DatosEmpresaDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaContext = inject(EmpresaContextService);
  private operacionesService = inject(OperacionesService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  idEmpresa: string = '';
  idCargaEmpresa: string = '';

  carga: CargaEmpresaItem | null = null;
  ventas: FilaVenta[] = [];
  errores: ObservacionEmpresaItem[] = [];
  cargando: boolean = true;
  guardando: boolean = false;
  mensajeError: string | null = null;

  mostrarObservaciones: boolean = false;
  idsParaEliminar: string[] = [];

  // Catálogos SUNAT estáticos en memoria (prototipo)
  readonly tiposCp: CatalogoItem[] = [
    { codigo: '01', nombre: 'FACTURA' },
    { codigo: '03', nombre: 'BOLETA DE VENTA' },
    { codigo: '07', nombre: 'NOTA DE CREDITO' },
    { codigo: '08', nombre: 'NOTA DE DEBITO' },
    { codigo: '12', nombre: 'TICKET O CINTA EMITIDO POR MAQUINA REGISTRADORA' },
    { codigo: '14', nombre: 'RECIBO POR SERVICIOS PUBLICOS' }
  ];

  readonly tiposDocIdentidad: CatalogoItem[] = [
    { codigo: '6', nombre: 'RUC' },
    { codigo: '1', nombre: 'DNI' },
    { codigo: '4', nombre: 'CARNET EXT.' },
    { codigo: '7', nombre: 'PASAPORTE' },
    { codigo: '0', nombre: 'DOC.TRIB.NO.DOM.SIN.RUC' }
  ];

  // Búsqueda y Ordenamiento
  filtroTexto: string = '';
  criteriosOrden: CriterioOrden[] = [];

  // Filtro Multiselección para Fecha Emisión
  menuFiltroFechaEmisionAbierto: boolean = false;
  fechasEmisionSeleccionadas: string[] = [];
  filtroTextoFechaEmisionMenu: string = '';

  // Filtro Multiselección para Tipo CP
  menuFiltroTipoCpAbierto: boolean = false;
  tiposCpSeleccionados: string[] = [];
  filtroTextoTipoCpMenu: string = '';

  // Filtro Multiselección para Serie
  menuFiltroSerieAbierto: boolean = false;
  seriesSeleccionadas: string[] = [];
  filtroTextoSerieMenu: string = '';

  // Filtro Multiselección para Número
  menuFiltroNumeroAbierto: boolean = false;
  numerosSeleccionados: string[] = [];
  filtroTextoNumeroMenu: string = '';

  // Filtro Multiselección para Tipo Doc Identidad
  menuFiltroTipoDocAbierto: boolean = false;
  tiposDocSeleccionados: string[] = [];
  filtroTextoTipoDocMenu: string = '';

  // Filtro Multiselección para Doc Cliente
  menuFiltroDocClienteAbierto: boolean = false;
  docsClienteSeleccionados: string[] = [];
  filtroTextoDocClienteMenu: string = '';

  // Filtro Multiselección para Razón Social
  menuFiltroRazonSocialAbierto: boolean = false;
  razonesSocialesSeleccionadas: string[] = [];
  filtroTextoRazonSocialMenu: string = '';

  // Filtro Multiselección para Moneda
  menuFiltroMonedaAbierto: boolean = false;
  monedasSeleccionadas: string[] = [];
  filtroTextoMonedaMenu: string = '';

  private readonly meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      this.idCargaEmpresa = params.get('idCargaEmpresa') || '';
      if (this.idCargaEmpresa) {
        this.cargar();
      }
    });
  }

  cargar(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    this.operacionesService.obtenerCargaPorId(this.idCargaEmpresa).subscribe({
      next: (carga) => {
        this.carga = {
          idCargaEmpresa: carga.idCarga,
          periodo: carga.periodo,
          nombreOriginal: carga.nombreOriginal,
          numRegistros: carga.numRegistros,
          numObservaciones: carga.numRegistrosError,
          fechaCreacion: carga.fechaCreacion
        };

        this.operacionesService.listarVentasEmpresaPorCarga(this.idCargaEmpresa).subscribe({
          next: (ventas) => {
            this.ventas = (ventas || []).map(v => ({
              ...v,
              fechaEmision: v.fechaEmision ? v.fechaEmision.substring(0, 10) : ''
            }));
            this.operacionesService.obtenerErroresCarga(this.idCargaEmpresa).subscribe({
              next: (errores) => {
                this.errores = errores.map(e => ({
                  numeroLinea: e.numeroLinea,
                  tipoError: e.tipoError,
                  campoError: e.campoError || null,
                  valorLectura: e.valorLectura || null,
                  mensaje: e.mensaje,
                  severidad: e.severidad as 'Error' | 'Advertencia'
                }));
                this.cargando = false;
                this.idsParaEliminar = [];
                this.cdr.detectChanges();
              },
              error: () => this.errorCarga('No se pudieron cargar las observaciones.')
            });
          },
          error: () => this.errorCarga('No se pudieron cargar los registros de la empresa.')
        });
      },
      error: () => this.errorCarga('No se encontró el archivo de datos de la empresa.')
    });
  }

  private errorCarga(mensaje: string): void {
    this.cargando = false;
    this.mensajeError = mensaje;
    this.cdr.detectChanges();
  }

  // --------------------------------------------------------------------------
  // Presentación y Métricas
  // --------------------------------------------------------------------------

  get nombreEmpresa(): string {
    return this.empresaContext.empresa()?.razonSocial || this.idEmpresa;
  }

  get periodoLabel(): string {
    return this.formatearPeriodo(this.carga?.periodo);
  }

  get filasNuevas(): FilaVenta[] {
    return this.ventas.filter(v => v.esNuevo);
  }

  get filasModificadas(): FilaVenta[] {
    return this.ventas.filter(v => v.modificado && !v.esNuevo);
  }

  get totalCambiosPendientes(): number {
    return this.filasNuevas.length + this.filasModificadas.length + this.idsParaEliminar.length;
  }

  get totalBi(): number {
    return this.ventasFiltradas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.biGravada) || 0), 0);
  }

  get totalIgv(): number {
    return this.ventasFiltradas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.igvIpm) || 0), 0);
  }

  get totalExonerado(): number {
    return this.ventasFiltradas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.montoExonerado) || 0), 0);
  }

  get totalInafecto(): number {
    return this.ventasFiltradas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.montoInafecto) || 0), 0);
  }

  get totalExportacion(): number {
    return this.ventasFiltradas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.valorFacturadoExportacion) || 0), 0);
  }

  get totalGeneral(): number {
    return this.ventasFiltradas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.totalCp) || 0), 0);
  }

  formatearPeriodo(periodo: string | undefined): string {
    if (!periodo || periodo.length !== 6) return periodo || '-';
    const anio = periodo.substring(0, 4);
    const mes = this.meses[parseInt(periodo.substring(4, 6), 10) - 1] || periodo.substring(4, 6);
    return `${mes} ${anio}`;
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
    return encontrado ? encontrado.nombre : (clean === '6' ? 'RUC' : (clean === '1' ? 'DNI' : codigo));
  }

  // --------------------------------------------------------------------------
  // Ordenamiento y Filtrado
  // --------------------------------------------------------------------------

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

  cerrarOtrosMenus(menuActual: string): void {
    if (menuActual !== 'fechaEmision') this.menuFiltroFechaEmisionAbierto = false;
    if (menuActual !== 'tipoCp') this.menuFiltroTipoCpAbierto = false;
    if (menuActual !== 'serie') this.menuFiltroSerieAbierto = false;
    if (menuActual !== 'numero') this.menuFiltroNumeroAbierto = false;
    if (menuActual !== 'tipoDoc') this.menuFiltroTipoDocAbierto = false;
    if (menuActual !== 'docCliente') this.menuFiltroDocClienteAbierto = false;
    if (menuActual !== 'razonSocial') this.menuFiltroRazonSocialAbierto = false;
    if (menuActual !== 'moneda') this.menuFiltroMonedaAbierto = false;
  }

  // --- FECHA EMISION ---
  get opcionesFechaEmisionDisponibles(): { fechaIso: string; fechaFormato: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
      if (v.fechaEmision) {
        const iso = v.fechaEmision.substring(0, 10);
        mapa.set(iso, (mapa.get(iso) || 0) + 1);
      }
    }
    return Array.from(mapa.entries())
      .map(([fechaIso, cantidad]) => {
        const partes = fechaIso.split('-');
        const fechaFormato = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaIso;
        return { fechaIso, fechaFormato, cantidad };
      })
      .sort((a, b) => b.fechaIso.localeCompare(a.fechaIso));
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
  }

  estaFechaEmisionSeleccionada(fechaIso: string): boolean {
    return this.fechasEmisionSeleccionadas.includes(fechaIso);
  }

  seleccionarTodasFechasEmision(): void {
    this.fechasEmisionSeleccionadas = this.opcionesFechaEmisionDisponibles.map(o => o.fechaIso);
  }

  limpiarFiltroFechasEmision(): void {
    this.fechasEmisionSeleccionadas = [];
  }

  // --- TIPO CP ---
  get opcionesTipoCpDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
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
  }

  estaTipoCpSeleccionado(nombre: string): boolean {
    return this.tiposCpSeleccionados.includes(nombre);
  }

  seleccionarTodosTiposCp(): void {
    this.tiposCpSeleccionados = this.opcionesTipoCpDisponibles.map(o => o.nombre);
  }

  limpiarFiltroTiposCp(): void {
    this.tiposCpSeleccionados = [];
  }

  // --- SERIE ---
  get opcionesSerieDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
      const s = (v.serie || '').trim().toUpperCase();
      if (s) mapa.set(s, (mapa.get(s) || 0) + 1);
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
  }

  estaSerieSeleccionada(nombre: string): boolean {
    return this.seriesSeleccionadas.includes(nombre);
  }

  seleccionarTodasSeries(): void {
    this.seriesSeleccionadas = this.opcionesSerieDisponibles.map(o => o.nombre);
  }

  limpiarFiltroSeries(): void {
    this.seriesSeleccionadas = [];
  }

  // --- NÚMERO ---
  get opcionesNumeroDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
      const n = (v.numero || '').trim();
      if (n) mapa.set(n, (mapa.get(n) || 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
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
  }

  estaNumeroSeleccionado(nombre: string): boolean {
    return this.numerosSeleccionados.includes(nombre);
  }

  seleccionarTodosNumeros(): void {
    this.numerosSeleccionados = this.opcionesNumeroDisponibles.map(o => o.nombre);
  }

  limpiarFiltroNumeros(): void {
    this.numerosSeleccionados = [];
  }

  // --- TIPO DOC IDENTIDAD ---
  get opcionesTipoDocDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
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
  }

  estaTipoDocSeleccionado(nombre: string): boolean {
    return this.tiposDocSeleccionados.includes(nombre);
  }

  seleccionarTodosTiposDoc(): void {
    this.tiposDocSeleccionados = this.opcionesTipoDocDisponibles.map(o => o.nombre);
  }

  limpiarFiltroTiposDoc(): void {
    this.tiposDocSeleccionados = [];
  }

  // --- DOC CLIENTE ---
  get opcionesDocClienteDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
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
  }

  estaDocClienteSeleccionado(nombre: string): boolean {
    return this.docsClienteSeleccionados.includes(nombre);
  }

  seleccionarTodosDocsCliente(): void {
    this.docsClienteSeleccionados = this.opcionesDocClienteDisponibles.map(o => o.nombre);
  }

  limpiarFiltroDocsCliente(): void {
    this.docsClienteSeleccionados = [];
  }

  // --- RAZÓN SOCIAL ---
  get opcionesRazonSocialDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
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
  }

  estaRazonSocialSeleccionada(nombre: string): boolean {
    return this.razonesSocialesSeleccionadas.includes(nombre);
  }

  seleccionarTodasRazonesSociales(): void {
    this.razonesSocialesSeleccionadas = this.opcionesRazonSocialDisponibles.map(o => o.nombre);
  }

  limpiarFiltroRazonesSociales(): void {
    this.razonesSocialesSeleccionadas = [];
  }

  // --- MONEDA ---
  get opcionesMonedaDisponibles(): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, number>();
    for (const v of this.ventas) {
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
  }

  estaMonedaSeleccionada(nombre: string): boolean {
    return this.monedasSeleccionadas.includes(nombre);
  }

  seleccionarTodasMonedas(): void {
    this.monedasSeleccionadas = this.opcionesMonedaDisponibles.map(o => o.nombre);
  }

  limpiarFiltroMonedas(): void {
    this.monedasSeleccionadas = [];
  }

  // Getter principal con filtros y ordenamiento
  get ventasFiltradas(): FilaVenta[] {
    let list = this.ventas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa));

    if (this.fechasEmisionSeleccionadas.length > 0) {
      list = list.filter(v => v.fechaEmision && this.fechasEmisionSeleccionadas.includes(v.fechaEmision.substring(0, 10)));
    }
    if (this.tiposCpSeleccionados.length > 0) {
      list = list.filter(v => this.tiposCpSeleccionados.includes(this.obtenerNombreTipoCp(v.codigoTipoCp)));
    }
    if (this.seriesSeleccionadas.length > 0) {
      list = list.filter(v => this.seriesSeleccionadas.includes((v.serie || '').trim().toUpperCase()));
    }
    if (this.numerosSeleccionados.length > 0) {
      list = list.filter(v => this.numerosSeleccionados.includes((v.numero || '').trim()));
    }
    if (this.tiposDocSeleccionados.length > 0) {
      list = list.filter(v => this.tiposDocSeleccionados.includes(this.obtenerNombreTipoDocIdentidad(v.codigoTipoDocIdentidad || '6')));
    }
    if (this.docsClienteSeleccionados.length > 0) {
      list = list.filter(v => this.docsClienteSeleccionados.includes((v.nroDocIdentidad || '').trim()));
    }
    if (this.razonesSocialesSeleccionadas.length > 0) {
      list = list.filter(v => this.razonesSocialesSeleccionadas.includes((v.razonSocial || '').trim()));
    }
    if (this.monedasSeleccionadas.length > 0) {
      list = list.filter(v => this.monedasSeleccionadas.includes((v.codigoMoneda || 'PEN').trim().toUpperCase()));
    }

    if (this.filtroTexto) {
      const txt = this.filtroTexto.toLowerCase().trim();
      list = list.filter(v =>
        (v.nroDocIdentidad && v.nroDocIdentidad.toLowerCase().includes(txt)) ||
        (v.razonSocial && v.razonSocial.toLowerCase().includes(txt)) ||
        `${v.serie}-${v.numero}`.toLowerCase().includes(txt) ||
        (v.codigoTipoCp && (v.codigoTipoCp.toLowerCase().includes(txt) || this.obtenerNombreTipoCp(v.codigoTipoCp).toLowerCase().includes(txt)))
      );
    }

    if (this.criteriosOrden.length > 0) {
      list = list.slice().sort((a, b) => {
        for (const crit of this.criteriosOrden) {
          let valA = (a as any)[crit.columna];
          let valB = (b as any)[crit.columna];

          if (['biGravada', 'igvIpm', 'totalCp'].includes(crit.columna)) {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
          } else {
            valA = (valA ?? '').toString().toLowerCase();
            valB = (valB ?? '').toString().toLowerCase();
          }

          if (valA < valB) return crit.ascendente ? -1 : 1;
          if (valA > valB) return crit.ascendente ? 1 : -1;
        }
        return 0;
      });
    }

    return list;
  }

  // --------------------------------------------------------------------------
  // Edición de la grilla
  // --------------------------------------------------------------------------

  iniciarEdicion(fila: FilaVenta, event?: Event): void {
    if (event) event.stopPropagation();
    this.ventas.forEach(v => {
      if (v !== fila && v.editando) v.editando = false;
    });

    if (!(fila as any)._original) {
      (fila as any)._original = { ...fila };
    }
    fila.editando = true;
    this.cdr.detectChanges();
  }

  finalizarEdicion(fila: FilaVenta): void {
    fila.editando = false;
    this.verificarYMarcarModificacion(fila);
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Si el clic ocurrió dentro de un modal, popup o confirmación, ignorar
    if (target.closest('app-modal-observaciones') || target.closest('.modal-contenedor') || target.closest('.fixed') || target.closest('.swal2-container')) {
      return;
    }

    // Buscar filas existentes en edición (excluye filas recién insertadas temporales)
    const filasEditando = this.ventas.filter(v => v.editando && !v.esNuevo);
    if (filasEditando.length === 0) return;

    const trClickeado = target.closest('tr.fila-contenedor');

    filasEditando.forEach(v => {
      // Si el clic fue fuera de la fila que se está editando, finalizar y cerrar edición
      if (!trClickeado || trClickeado.getAttribute('data-id') !== v.idVentaEmpresa) {
        this.finalizarEdicion(v);
      }
    });
  }

  verificarYMarcarModificacion(fila: FilaVenta): void {
    if (fila.esNuevo) return;
    const orig = (fila as any)._original;
    if (!orig) return;

    const cambia = (campo: keyof VentaEmpresaItem) =>
      String(orig[campo] ?? '') !== String((fila as any)[campo] ?? '');

    if (
      cambia('codigoTipoCp') || cambia('serie') || cambia('numero') || cambia('numeroFinal') ||
      cambia('fechaEmision') || cambia('fechaVencimiento') || cambia('codigoTipoDocIdentidad') ||
      cambia('nroDocIdentidad') || cambia('razonSocial') || cambia('valorFacturadoExportacion') ||
      cambia('biGravada') || cambia('descuentoBi') || cambia('igvIpm') || cambia('descuentoIgv') ||
      cambia('montoExonerado') || cambia('montoInafecto') || cambia('montoIsc') ||
      cambia('biGravadaIvap') || cambia('montoIvap') || cambia('montoIcbper') ||
      cambia('montoOtrosTributos') || cambia('totalCp') || cambia('codigoMoneda') ||
      cambia('tipoCambio') || cambia('fechaEmisionDocModificado') || cambia('codigoTipoCpModificado') ||
      cambia('serieCpModificado') || cambia('numeroCpModificado') || cambia('codigoTipoNota')
    ) {
      fila.modificado = true;
    } else {
      fila.modificado = false;
    }
  }

  insertarFila(referenciaOIndice?: FilaVenta | number, event?: Event): void {
    if (event) event.stopPropagation();
    const periodo = this.carga?.periodo || '';
    const fechaBase = periodo.length === 6 ? `${periodo.substring(0, 4)}-${periodo.substring(4, 6)}-01` : '';
    
    const nuevaFila: FilaVenta = {
      idVentaEmpresa: 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      numeroLinea: 0,
      codigoTipoCp: '01',
      serie: 'F001',
      numero: '',
      numeroFinal: '',
      fechaEmision: fechaBase,
      fechaVencimiento: fechaBase,
      codigoTipoDocIdentidad: '6',
      nroDocIdentidad: '',
      razonSocial: '',
      valorFacturadoExportacion: 0,
      biGravada: 0,
      descuentoBi: 0,
      igvIpm: 0,
      descuentoIgv: 0,
      montoExonerado: 0,
      montoInafecto: 0,
      montoIsc: 0,
      biGravadaIvap: 0,
      montoIvap: 0,
      montoIcbper: 0,
      montoOtrosTributos: 0,
      totalCp: 0,
      codigoMoneda: 'PEN',
      tipoCambio: 1.0000,
      fechaEmisionDocModificado: '',
      codigoTipoCpModificado: '',
      serieCpModificado: '',
      numeroCpModificado: '',
      codigoEstadoComprobante: '1',
      codigoTipoNota: '',
      esNuevo: true,
      editando: true
    };

    if (referenciaOIndice !== undefined && typeof referenciaOIndice !== 'number') {
      const idx = this.ventas.indexOf(referenciaOIndice);
      if (idx >= 0) this.ventas.splice(idx, 0, nuevaFila);
      else this.ventas.unshift(nuevaFila);
    } else {
      this.ventas.unshift(nuevaFila);
    }
    this.cdr.detectChanges();
  }

  async eliminarFila(fila: FilaVenta, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    if (fila.esNuevo) {
      this.ventas = this.ventas.filter(v => v.idVentaEmpresa !== fila.idVentaEmpresa);
      this.cdr.detectChanges();
      return;
    }

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Registro',
      message: `¿Eliminar el comprobante ${fila.codigoTipoCp} ${fila.serie}-${fila.numero}? El cambio se aplicará al guardar.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.idsParaEliminar.push(fila.idVentaEmpresa);
    this.ventas = this.ventas.filter(v => v.idVentaEmpresa !== fila.idVentaEmpresa);
    this.cdr.detectChanges();
  }

  // --------------------------------------------------------------------------
  // Guardar cambios
  // --------------------------------------------------------------------------

  async guardarCambios(): Promise<void> {
    if (this.totalCambiosPendientes === 0) return;

    const revisar = [...this.filasNuevas, ...this.filasModificadas];
    for (const fila of revisar) {
      if (!fila.serie?.trim() || !fila.numero?.trim()) {
        await this.modalService.open({
          type: 'warning',
          title: 'Datos Incompletos',
          message: `La fila con serie "${fila.serie || '(vacía)'}" debe tener Serie y Número completos.`
        });
        return;
      }
      if (isNaN(Number(fila.totalCp))) {
        await this.modalService.open({
          type: 'warning',
          title: 'Montos Inválidos',
          message: `El comprobante ${fila.serie}-${fila.numero} tiene un importe Total CP inválido.`
        });
        return;
      }
    }

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Guardar Cambios',
      message: `Se aplicarán: ${this.filasNuevas.length} nuevos, ${this.filasModificadas.length} modificados y ${this.idsParaEliminar.length} eliminados. Los datos se revalidarán y el match del periodo quedará invalidado.`,
      confirmText: 'Sí, guardar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.guardando = true;
    this.loadingService.show();
    this.cdr.detectChanges();

    const nuevos = this.filasNuevas.map(v => ({ ...v, esNuevo: undefined, editando: undefined, modificado: undefined }) as VentaEmpresaItem);
    const modificados = this.filasModificadas.map(v => ({ ...v, esNuevo: undefined, editando: undefined, modificado: undefined }) as VentaEmpresaItem);

    this.operacionesService.actualizarVentasEmpresa(this.idCargaEmpresa, this.idsParaEliminar, nuevos, modificados).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.loadingService.hide();
        this.cargar();
        await this.modalService.open({
          type: 'info',
          title: 'Cambios Guardados',
          message: res.mensaje,
          confirmText: 'Aceptar'
        });
      },
      error: async (err) => {
        this.guardando = false;
        this.loadingService.hide();
        this.cdr.detectChanges();
        await this.modalService.open({
          type: 'error',
          title: 'Error al Guardar',
          message: err?.error?.message || err?.message || 'No se pudieron guardar los cambios.',
          confirmText: 'Volver'
        });
      }
    });
  }

  async eliminarCarga(): Promise<void> {
    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Archivo de Empresa',
      message: `¿Estás seguro de eliminar el archivo de ventas de la empresa "${this.carga?.nombreOriginal || ''}" y todos sus registros? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.loadingService.show();
    this.operacionesService.eliminarCarga(this.idCargaEmpresa).subscribe({
      next: async () => {
        this.loadingService.hide();
        await this.modalService.open({
          type: 'info',
          title: 'Archivo Eliminado',
          message: 'El archivo y sus registros fueron eliminados exitosamente.',
          confirmText: 'Aceptar'
        });
        this.volver();
      },
      error: async (err) => {
        this.loadingService.hide();
        await this.modalService.open({
          type: 'error',
          title: 'Error al Eliminar',
          message: err?.error?.message || err?.message || 'No se pudo eliminar el archivo.',
          confirmText: 'Aceptar'
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas'], { queryParams: { tab: 'empresa' } });
  }
}


