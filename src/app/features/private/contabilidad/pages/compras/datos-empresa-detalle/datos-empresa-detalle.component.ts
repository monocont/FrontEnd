import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import {
  ComprasWorkspaceService,
  CargaEmpresaComprasItem,
  CompraEmpresaItem,
  ObservacionEmpresaItem
} from '../../../services/compras-workspace.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';

type FilaCompra = CompraEmpresaItem & { esNuevo?: boolean; editando?: boolean; modificado?: boolean };

interface CriterioOrden {
  columna: string;
  ascendente: boolean;
}

interface CatalogoItem {
  codigo: string;
  nombre: string;
}

@Component({
  selector: 'app-datos-empresa-detalle-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './datos-empresa-detalle.component.html',
  styleUrl: './datos-empresa-detalle.component.css'
})
export class DatosEmpresaDetalleComprasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaContext = inject(EmpresaContextService);
  private workspaceService = inject(ComprasWorkspaceService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  idEmpresa: string = '';
  idCargaEmpresa: string = '';

  carga: CargaEmpresaComprasItem | null = null;
  compras: FilaCompra[] = [];
  errores: ObservacionEmpresaItem[] = [];
  cargando: boolean = true;
  guardando: boolean = false;
  mensajeError: string | null = null;

  mostrarObservaciones: boolean = false;
  idsParaEliminar: string[] = [];

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

  filtroTexto: string = '';
  criteriosOrden: CriterioOrden[] = [];

  // Menús de filtro tipo Excel
  menuFiltroFechaAbierto = false;
  fechasSeleccionadas: string[] = [];
  filtroTextoFechaMenu = '';

  menuFiltroTipoCpAbierto = false;
  tiposCpSeleccionados: string[] = [];
  filtroTextoTipoCpMenu = '';

  menuFiltroSerieAbierto = false;
  seriesSeleccionadas: string[] = [];
  filtroTextoSerieMenu = '';

  menuFiltroNumeroAbierto = false;
  numerosSeleccionados: string[] = [];
  filtroTextoNumeroMenu = '';

  menuFiltroTipoDocAbierto = false;
  tiposDocSeleccionados: string[] = [];
  filtroTextoTipoDocMenu = '';

  menuFiltroDocClienteAbierto = false;
  docsClienteSeleccionados: string[] = [];
  filtroTextoDocClienteMenu = '';

  menuFiltroRazonSocialAbierto = false;
  razonesSocialesSeleccionadas: string[] = [];
  filtroTextoRazonSocialMenu = '';

  menuFiltroMonedaAbierto = false;
  monedasSeleccionadas: string[] = [];
  filtroTextoMonedaMenu = '';

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

    this.workspaceService.obtenerCargaEmpresa(this.idCargaEmpresa).subscribe({
      next: (datos) => {
        this.carga = datos.carga;
        this.compras = datos.compras.map(c => ({ ...c, esNuevo: false, editando: false, modificado: false }));
        this.errores = datos.errores || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err?.message || 'No se pudo cargar el archivo de compras de la empresa.';
        this.cdr.detectChanges();
      }
    });
  }

  get nombreEmpresa(): string {
    return this.empresaContext.empresa()?.razonSocial || 'Empresa';
  }

  get periodoLabel(): string {
    if (!this.carga?.periodo || this.carga.periodo.length < 6) return this.carga?.periodo || '';
    const anio = this.carga.periodo.substring(0, 4);
    const mesNum = parseInt(this.carga.periodo.substring(4, 6), 10);
    const mesNom = this.meses[mesNum - 1] || '';
    return `${mesNom} ${anio}`;
  }

  get totalRegistros(): number {
    return this.compras.length;
  }

  get sumaBiGravada(): number {
    return this.comprasFiltradas.reduce((acc, c) => acc + (Number(c.biGravada) || 0), 0);
  }

  get sumaIgvIpm(): number {
    return this.comprasFiltradas.reduce((acc, c) => acc + (Number(c.igvIpm) || 0), 0);
  }

  get sumaTotal(): number {
    return this.comprasFiltradas.reduce((acc, c) => acc + (Number(c.totalCp) || 0), 0);
  }

  get totalCambiosPendientes(): number {
    const nuevos = this.compras.filter(c => c.esNuevo).length;
    const modificados = this.compras.filter(c => !c.esNuevo && c.modificado).length;
    const eliminados = this.idsParaEliminar.length;
    return nuevos + modificados + eliminados;
  }

  get comprasFiltradas(): FilaCompra[] {
    let res = [...this.compras];

    if (this.filtroTexto.trim()) {
      const q = this.filtroTexto.trim().toLowerCase();
      res = res.filter(c =>
        (c.serie || '').toLowerCase().includes(q) ||
        (c.numero || '').toLowerCase().includes(q) ||
        (c.nroDocIdentidad || '').toLowerCase().includes(q) ||
        (c.razonSocial || '').toLowerCase().includes(q)
      );
    }

    if (this.fechasSeleccionadas.length > 0) {
      const setF = new Set(this.fechasSeleccionadas);
      res = res.filter(c => setF.has(c.fechaEmision || ''));
    }
    if (this.tiposCpSeleccionados.length > 0) {
      const setT = new Set(this.tiposCpSeleccionados);
      res = res.filter(c => setT.has(this.obtenerNombreTipoCp(c.codigoTipoCp)));
    }
    if (this.seriesSeleccionadas.length > 0) {
      const setS = new Set(this.seriesSeleccionadas);
      res = res.filter(c => setS.has(c.serie || ''));
    }
    if (this.numerosSeleccionados.length > 0) {
      const setN = new Set(this.numerosSeleccionados);
      res = res.filter(c => setN.has(c.numero || ''));
    }
    if (this.tiposDocSeleccionados.length > 0) {
      const setTd = new Set(this.tiposDocSeleccionados);
      res = res.filter(c => setTd.has(this.obtenerNombreTipoDoc(c.codigoTipoDocIdentidad)));
    }
    if (this.docsClienteSeleccionados.length > 0) {
      const setD = new Set(this.docsClienteSeleccionados);
      res = res.filter(c => setD.has(c.nroDocIdentidad || ''));
    }
    if (this.razonesSocialesSeleccionadas.length > 0) {
      const setR = new Set(this.razonesSocialesSeleccionadas);
      res = res.filter(c => setR.has(c.razonSocial || ''));
    }
    if (this.monedasSeleccionadas.length > 0) {
      const setM = new Set(this.monedasSeleccionadas);
      res = res.filter(c => setM.has(c.codigoMoneda || 'PEN'));
    }

    if (this.criteriosOrden.length > 0) {
      res.sort((a, b) => {
        for (const crit of this.criteriosOrden) {
          const comp = this.compararValores(a, b, crit.columna, crit.ascendente);
          if (comp !== 0) return comp;
        }
        return 0;
      });
    }

    return res;
  }

  obtenerNombreTipoCp(codigo: string): string {
    const item = this.tiposCp.find(t => t.codigo === codigo);
    return item ? item.nombre : codigo;
  }

  obtenerNombreTipoDoc(codigo: string): string {
    const item = this.tiposDocIdentidad.find(t => t.codigo === codigo);
    return item ? item.nombre : codigo;
  }

  ordenarPor(columna: string): void {
    const idx = this.criteriosOrden.findIndex(c => c.columna === columna);
    if (idx === -1) {
      this.criteriosOrden.push({ columna, ascendente: true });
    } else if (this.criteriosOrden[idx].ascendente) {
      this.criteriosOrden[idx].ascendente = false;
    } else {
      this.criteriosOrden.splice(idx, 1);
    }
    this.cdr.detectChanges();
  }

  obtenerEstadoOrden(columna: string): { activo: boolean; ascendente: boolean; ordenIndice: number } {
    const idx = this.criteriosOrden.findIndex(c => c.columna === columna);
    if (idx === -1) return { activo: false, ascendente: true, ordenIndice: 0 };
    return {
      activo: true,
      ascendente: this.criteriosOrden[idx].ascendente,
      ordenIndice: this.criteriosOrden.length > 1 ? idx + 1 : 0
    };
  }

  private compararValores(a: FilaCompra, b: FilaCompra, columna: string, asc: boolean): number {
    let valA: any = (a as any)[columna];
    let valB: any = (b as any)[columna];

    if (valA == null) valA = '';
    if (valB == null) valB = '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return asc ? valA - valB : valB - valA;
    }

    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  }

  // Opciones de filtro
  get opcionesFechaDisponibles(): { fecha: string; cantidad: number }[] {
    const mapF = new Map<string, number>();
    this.compras.forEach(c => {
      if (c.fechaEmision) mapF.set(c.fechaEmision, (mapF.get(c.fechaEmision) || 0) + 1);
    });
    return Array.from(mapF.entries()).map(([fecha, cantidad]) => ({ fecha, cantidad }));
  }

  get opcionesFechaFiltradas(): { fecha: string; cantidad: number }[] {
    const q = this.filtroTextoFechaMenu.toLowerCase();
    return this.opcionesFechaDisponibles.filter(o => o.fecha.toLowerCase().includes(q));
  }

  toggleMenuFiltroFecha(event: Event): void {
    event.stopPropagation();
    this.menuFiltroFechaAbierto = !this.menuFiltroFechaAbierto;
  }

  estaFechaSeleccionada(fecha: string): boolean {
    return this.fechasSeleccionadas.includes(fecha);
  }

  toggleSeleccionFecha(fecha: string): void {
    const idx = this.fechasSeleccionadas.indexOf(fecha);
    if (idx >= 0) this.fechasSeleccionadas.splice(idx, 1);
    else this.fechasSeleccionadas.push(fecha);
  }

  seleccionarTodasFechas(): void {
    this.fechasSeleccionadas = this.opcionesFechaDisponibles.map(o => o.fecha);
  }

  limpiarFiltroFechas(): void {
    this.fechasSeleccionadas = [];
  }

  get opcionesTipoCpDisponibles(): { nombre: string; cantidad: number }[] {
    const mapT = new Map<string, number>();
    this.compras.forEach(c => {
      const nom = this.obtenerNombreTipoCp(c.codigoTipoCp);
      mapT.set(nom, (mapT.get(nom) || 0) + 1);
    });
    return Array.from(mapT.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }

  get opcionesTipoCpFiltradas(): { nombre: string; cantidad: number }[] {
    const q = this.filtroTextoTipoCpMenu.toLowerCase();
    return this.opcionesTipoCpDisponibles.filter(o => o.nombre.toLowerCase().includes(q));
  }

  toggleMenuFiltroTipoCp(event: Event): void {
    event.stopPropagation();
    this.menuFiltroTipoCpAbierto = !this.menuFiltroTipoCpAbierto;
  }

  estaTipoCpSeleccionado(nombre: string): boolean {
    return this.tiposCpSeleccionados.includes(nombre);
  }

  toggleSeleccionTipoCp(nombre: string): void {
    const idx = this.tiposCpSeleccionados.indexOf(nombre);
    if (idx >= 0) this.tiposCpSeleccionados.splice(idx, 1);
    else this.tiposCpSeleccionados.push(nombre);
  }

  seleccionarTodosTiposCp(): void {
    this.tiposCpSeleccionados = this.opcionesTipoCpDisponibles.map(o => o.nombre);
  }

  limpiarFiltroTiposCp(): void {
    this.tiposCpSeleccionados = [];
  }

  get opcionesSerieDisponibles(): { serie: string; cantidad: number }[] {
    const mapS = new Map<string, number>();
    this.compras.forEach(c => {
      if (c.serie) mapS.set(c.serie, (mapS.get(c.serie) || 0) + 1);
    });
    return Array.from(mapS.entries()).map(([serie, cantidad]) => ({ serie, cantidad }));
  }

  get opcionesSerieFiltradas(): { serie: string; cantidad: number }[] {
    const q = this.filtroTextoSerieMenu.toLowerCase();
    return this.opcionesSerieDisponibles.filter(o => o.serie.toLowerCase().includes(q));
  }

  toggleMenuFiltroSerie(event: Event): void {
    event.stopPropagation();
    this.menuFiltroSerieAbierto = !this.menuFiltroSerieAbierto;
  }

  estaSerieSeleccionada(serie: string): boolean {
    return this.seriesSeleccionadas.includes(serie);
  }

  toggleSeleccionSerie(serie: string): void {
    const idx = this.seriesSeleccionadas.indexOf(serie);
    if (idx >= 0) this.seriesSeleccionadas.splice(idx, 1);
    else this.seriesSeleccionadas.push(serie);
  }

  seleccionarTodasSeries(): void {
    this.seriesSeleccionadas = this.opcionesSerieDisponibles.map(o => o.serie);
  }

  limpiarFiltroSeries(): void {
    this.seriesSeleccionadas = [];
  }

  get opcionesNumeroDisponibles(): { numero: string; cantidad: number }[] {
    const mapN = new Map<string, number>();
    this.compras.forEach(c => {
      if (c.numero) mapN.set(c.numero, (mapN.get(c.numero) || 0) + 1);
    });
    return Array.from(mapN.entries()).map(([numero, cantidad]) => ({ numero, cantidad }));
  }

  get opcionesNumeroFiltradas(): { numero: string; cantidad: number }[] {
    const q = this.filtroTextoNumeroMenu.toLowerCase();
    return this.opcionesNumeroDisponibles.filter(o => o.numero.toLowerCase().includes(q));
  }

  toggleMenuFiltroNumero(event: Event): void {
    event.stopPropagation();
    this.menuFiltroNumeroAbierto = !this.menuFiltroNumeroAbierto;
  }

  estaNumeroSeleccionado(numero: string): boolean {
    return this.numerosSeleccionados.includes(numero);
  }

  toggleSeleccionNumero(numero: string): void {
    const idx = this.numerosSeleccionados.indexOf(numero);
    if (idx >= 0) this.numerosSeleccionados.splice(idx, 1);
    else this.numerosSeleccionados.push(numero);
  }

  seleccionarTodosNumeros(): void {
    this.numerosSeleccionados = this.opcionesNumeroDisponibles.map(o => o.numero);
  }

  limpiarFiltroNumeros(): void {
    this.numerosSeleccionados = [];
  }

  get opcionesTipoDocDisponibles(): { nombre: string; cantidad: number }[] {
    const mapTd = new Map<string, number>();
    this.compras.forEach(c => {
      const nom = this.obtenerNombreTipoDoc(c.codigoTipoDocIdentidad);
      mapTd.set(nom, (mapTd.get(nom) || 0) + 1);
    });
    return Array.from(mapTd.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }

  get opcionesTipoDocFiltradas(): { nombre: string; cantidad: number }[] {
    const q = this.filtroTextoTipoDocMenu.toLowerCase();
    return this.opcionesTipoDocDisponibles.filter(o => o.nombre.toLowerCase().includes(q));
  }

  toggleMenuFiltroTipoDoc(event: Event): void {
    event.stopPropagation();
    this.menuFiltroTipoDocAbierto = !this.menuFiltroTipoDocAbierto;
  }

  estaTipoDocSeleccionado(nombre: string): boolean {
    return this.tiposDocSeleccionados.includes(nombre);
  }

  toggleSeleccionTipoDoc(nombre: string): void {
    const idx = this.tiposDocSeleccionados.indexOf(nombre);
    if (idx >= 0) this.tiposDocSeleccionados.splice(idx, 1);
    else this.tiposDocSeleccionados.push(nombre);
  }

  seleccionarTodosTiposDoc(): void {
    this.tiposDocSeleccionados = this.opcionesTipoDocDisponibles.map(o => o.nombre);
  }

  limpiarFiltroTiposDoc(): void {
    this.tiposDocSeleccionados = [];
  }

  get opcionesDocClienteDisponibles(): { doc: string; cantidad: number }[] {
    const mapD = new Map<string, number>();
    this.compras.forEach(c => {
      if (c.nroDocIdentidad) mapD.set(c.nroDocIdentidad, (mapD.get(c.nroDocIdentidad) || 0) + 1);
    });
    return Array.from(mapD.entries()).map(([doc, cantidad]) => ({ doc, cantidad }));
  }

  get opcionesDocClienteFiltradas(): { doc: string; cantidad: number }[] {
    const q = this.filtroTextoDocClienteMenu.toLowerCase();
    return this.opcionesDocClienteDisponibles.filter(o => o.doc.toLowerCase().includes(q));
  }

  toggleMenuFiltroDocCliente(event: Event): void {
    event.stopPropagation();
    this.menuFiltroDocClienteAbierto = !this.menuFiltroDocClienteAbierto;
  }

  estaDocClienteSeleccionado(doc: string): boolean {
    return this.docsClienteSeleccionados.includes(doc);
  }

  toggleSeleccionDocCliente(doc: string): void {
    const idx = this.docsClienteSeleccionados.indexOf(doc);
    if (idx >= 0) this.docsClienteSeleccionados.splice(idx, 1);
    else this.docsClienteSeleccionados.push(doc);
  }

  seleccionarTodosDocsCliente(): void {
    this.docsClienteSeleccionados = this.opcionesDocClienteDisponibles.map(o => o.doc);
  }

  limpiarFiltroDocsCliente(): void {
    this.docsClienteSeleccionados = [];
  }

  get opcionesRazonSocialDisponibles(): { razonSocial: string; cantidad: number }[] {
    const mapR = new Map<string, number>();
    this.compras.forEach(c => {
      if (c.razonSocial) mapR.set(c.razonSocial, (mapR.get(c.razonSocial) || 0) + 1);
    });
    return Array.from(mapR.entries()).map(([razonSocial, cantidad]) => ({ razonSocial, cantidad }));
  }

  get opcionesRazonSocialFiltradas(): { razonSocial: string; cantidad: number }[] {
    const q = this.filtroTextoRazonSocialMenu.toLowerCase();
    return this.opcionesRazonSocialDisponibles.filter(o => o.razonSocial.toLowerCase().includes(q));
  }

  toggleMenuFiltroRazonSocial(event: Event): void {
    event.stopPropagation();
    this.menuFiltroRazonSocialAbierto = !this.menuFiltroRazonSocialAbierto;
  }

  estaRazonSocialSeleccionada(razonSocial: string): boolean {
    return this.razonesSocialesSeleccionadas.includes(razonSocial);
  }

  toggleSeleccionRazonSocial(razonSocial: string): void {
    const idx = this.razonesSocialesSeleccionadas.indexOf(razonSocial);
    if (idx >= 0) this.razonesSocialesSeleccionadas.splice(idx, 1);
    else this.razonesSocialesSeleccionadas.push(razonSocial);
  }

  seleccionarTodasRazonesSociales(): void {
    this.razonesSocialesSeleccionadas = this.opcionesRazonSocialDisponibles.map(o => o.razonSocial);
  }

  limpiarFiltroRazonesSociales(): void {
    this.razonesSocialesSeleccionadas = [];
  }

  get opcionesMonedaDisponibles(): { moneda: string; cantidad: number }[] {
    const mapM = new Map<string, number>();
    this.compras.forEach(c => {
      const mon = c.codigoMoneda || 'PEN';
      mapM.set(mon, (mapM.get(mon) || 0) + 1);
    });
    return Array.from(mapM.entries()).map(([moneda, cantidad]) => ({ moneda, cantidad }));
  }

  get opcionesMonedaFiltradas(): { moneda: string; cantidad: number }[] {
    const q = this.filtroTextoMonedaMenu.toLowerCase();
    return this.opcionesMonedaDisponibles.filter(o => o.moneda.toLowerCase().includes(q));
  }

  toggleMenuFiltroMoneda(event: Event): void {
    event.stopPropagation();
    this.menuFiltroMonedaAbierto = !this.menuFiltroMonedaAbierto;
  }

  estaMonedaSeleccionada(moneda: string): boolean {
    return this.monedasSeleccionadas.includes(moneda);
  }

  toggleSeleccionMoneda(moneda: string): void {
    const idx = this.monedasSeleccionadas.indexOf(moneda);
    if (idx >= 0) this.monedasSeleccionadas.splice(idx, 1);
    else this.monedasSeleccionadas.push(moneda);
  }

  seleccionarTodasMonedas(): void {
    this.monedasSeleccionadas = this.opcionesMonedaDisponibles.map(o => o.moneda);
  }

  limpiarFiltroMonedas(): void {
    this.monedasSeleccionadas = [];
  }

  removerFiltroColumna(tipo: string): void {
    switch (tipo) {
      case 'fecha': this.fechasSeleccionadas = []; break;
      case 'tipoCp': this.tiposCpSeleccionados = []; break;
      case 'serie': this.seriesSeleccionadas = []; break;
      case 'numero': this.numerosSeleccionados = []; break;
      case 'tipoDoc': this.tiposDocSeleccionados = []; break;
      case 'docCliente': this.docsClienteSeleccionados = []; break;
      case 'razonSocial': this.razonesSocialesSeleccionadas = []; break;
      case 'moneda': this.monedasSeleccionadas = []; break;
    }
  }

  limpiarTodosFiltros(): void {
    this.filtroTexto = '';
    this.fechasSeleccionadas = [];
    this.tiposCpSeleccionados = [];
    this.seriesSeleccionadas = [];
    this.numerosSeleccionados = [];
    this.tiposDocSeleccionados = [];
    this.docsClienteSeleccionados = [];
    this.razonesSocialesSeleccionadas = [];
    this.monedasSeleccionadas = [];
    this.criteriosOrden = [];
  }

  // Edición / Inserción
  iniciarEdicion(fila: FilaCompra, event?: Event): void {
    if (event) event.stopPropagation();
    fila.editando = true;
  }

  finalizarEdicion(fila: FilaCompra): void {
    fila.editando = false;
    this.verificarYMarcarModificacion(fila);
  }

  verificarYMarcarModificacion(fila: FilaCompra): void {
    if (!fila.esNuevo) {
      fila.modificado = true;
    }
    this.cdr.detectChanges();
  }

  insertarFilaEnPosicion(indice: number): void {
    const nueva: FilaCompra = {
      idCompraEmpresa: 'compra-nueva-' + Date.now(),
      numeroLinea: indice + 1,
      codigoTipoCp: '01',
      serie: 'F001',
      numero: '',
      fechaEmision: new Date().toLocaleDateString('es-PE'),
      codigoTipoDocIdentidad: '6',
      nroDocIdentidad: '',
      razonSocial: '',
      biGravada: 0,
      igvIpm: 0,
      totalCp: 0,
      codigoMoneda: 'PEN',
      esNuevo: true,
      editando: true,
      modificado: false
    };

    this.compras.splice(indice, 0, nueva);
    this.compras.forEach((c, idx) => c.numeroLinea = idx + 1);
    this.cdr.detectChanges();
  }

  eliminarFila(fila: FilaCompra, event: Event): void {
    event.stopPropagation();
    if (!fila.esNuevo && fila.idCompraEmpresa) {
      this.idsParaEliminar.push(fila.idCompraEmpresa);
    }
    const idx = this.compras.indexOf(fila);
    if (idx >= 0) {
      this.compras.splice(idx, 1);
      this.compras.forEach((c, i) => c.numeroLinea = i + 1);
    }
    this.cdr.detectChanges();
  }

  async guardarCambios(): Promise<void> {
    const nuevos = this.compras.filter(c => c.esNuevo);
    const modificados = this.compras.filter(c => !c.esNuevo && c.modificado);

    this.guardando = true;
    this.loadingService.show();

    this.workspaceService.actualizarComprasEmpresa(this.idCargaEmpresa, {
      eliminadosIds: this.idsParaEliminar,
      nuevos,
      modificados
    }).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.loadingService.hide();
        this.idsParaEliminar = [];
        this.compras.forEach(c => {
          c.esNuevo = false;
          c.editando = false;
          c.modificado = false;
        });
        this.cdr.detectChanges();

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
          message: err?.message || 'No se pudieron guardar los cambios.',
          confirmText: 'Volver'
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'compras'], { queryParams: { tab: 'empresa' } });
  }
}
