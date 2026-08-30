import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import { OperacionesService, ArchivoCargaItem } from '../../../services/operaciones.service';
import {
  VentasWorkspaceService,
  CargaEmpresaItem,
  PanelMatchItem
} from '../../../services/ventas-workspace.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';

type TabActiva = 'sire' | 'empresa' | 'match';

@Component({
  selector: 'app-ventas-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ventas-list.component.html',
  styleUrl: './ventas-list.component.css'
})
export class VentasListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private empresaContext = inject(EmpresaContextService);
  private operacionesService = inject(OperacionesService);
  private workspaceService = inject(VentasWorkspaceService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  idEmpresa: string = '';
  ruc: string = '';
  empresa: Empresa | null = null;

  // ------------------------------------------------------------------
  // Workspace: pestaña activa (?tab=sire|empresa|match)
  // ------------------------------------------------------------------
  tabActiva: TabActiva = 'sire';

  // ------------------------------------------------------------------
  // Pestaña 1 — Historial SIRE (existente)
  // ------------------------------------------------------------------
  cargas: ArchivoCargaItem[] = [];
  cargando: boolean = true;
  mensajeError: string | null = null;
  totalArchivos: number = 0;

  // Selector de Periodo tipo Calendario (Popup Mes / Año)
  periodoSeleccionado: string = '';
  mostrarSelector: boolean = false;
  anioSelector: number = new Date().getFullYear();
  mesSeleccionado: number | null = null;
  anioSeleccionado: number | null = null;

  // ------------------------------------------------------------------
  // Pestaña 2 — Datos de la Empresa (maqueta mock)
  // ------------------------------------------------------------------
  cargasEmpresa: CargaEmpresaItem[] = [];
  cargandoEmpresa: boolean = true;
  mensajeErrorEmpresa: string | null = null;

  // ------------------------------------------------------------------
  // Pestaña 3 — Match de Información (maqueta mock)
  // ------------------------------------------------------------------
  panelMatch: PanelMatchItem[] = [];
  cargandoMatch: boolean = true;
  mensajeErrorMatch: string | null = null;

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

  ngOnInit(): void {
    const max = this.obtenerMesAnterior();
    this.anioSelector = max.anio;

    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      if (this.idEmpresa) {
        this.cargarDatosEmpresa();
      }
    });

    this.route.queryParamMap.subscribe(q => {
      const tab = q.get('tab');
      this.tabActiva = tab === 'empresa' || tab === 'match' ? tab : 'sire';
      this.cdr.detectChanges();
    });
  }

  cambiarTab(tab: TabActiva): void {
    if (this.tabActiva === tab) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
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
        this.cargarCargasVentas();
        this.cargarCargasEmpresa();
        this.cargarPanelMatch();
      }
    });
  }

  // ------------------------------------------------------------------
  // Pestaña 1 — SIRE (existente)
  // ------------------------------------------------------------------

  obtenerMesAnterior(): { anio: number; mes: number } {
    const ahora = new Date();
    let anio = ahora.getFullYear();
    let mes = ahora.getMonth(); // 0-11 donde getMonth() es el mes anterior en base 1
    if (mes === 0) {
      mes = 12;
      anio -= 1;
    }
    return { anio, mes };
  }

  toggleSelector(): void {
    if (!this.mostrarSelector) {
      const max = this.obtenerMesAnterior();
      this.anioSelector = this.anioSeleccionado || max.anio;
    }
    this.mostrarSelector = !this.mostrarSelector;
  }

  cerrarSelector(): void {
    this.mostrarSelector = false;
  }

  navegarAnioSelector(delta: number): void {
    const anioMin = 2000;
    const max = this.obtenerMesAnterior();
    const nuevoAnio = this.anioSelector + delta;
    if (nuevoAnio >= anioMin && nuevoAnio <= max.anio) {
      this.anioSelector = nuevoAnio;
    }
  }

  seleccionarMes(mes: number): void {
    if (this.mesBloqueado(mes)) return;

    this.mesSeleccionado = mes;
    this.anioSeleccionado = this.anioSelector;
    const mesStr = mes.toString().padStart(2, '0');
    this.periodoSeleccionado = `${this.anioSeleccionado}${mesStr}`;
    this.mostrarSelector = false;
    this.cargarCargasVentas();
  }

  mesBloqueado(valor: number): boolean {
    const max = this.obtenerMesAnterior();
    return (
      this.anioSelector > max.anio ||
      (this.anioSelector === max.anio && valor > max.mes)
    );
  }

  anioSelectorAnteriorHabilitado(): boolean {
    return this.anioSelector > 2000;
  }

  anioSelectorSiguienteHabilitado(): boolean {
    const max = this.obtenerMesAnterior();
    return this.anioSelector < max.anio;
  }

  limpiarPeriodo(): void {
    this.periodoSeleccionado = '';
    this.mesSeleccionado = null;
    this.anioSeleccionado = null;
    this.mostrarSelector = false;
    this.cargarCargasVentas();
  }

  get etiquetaBotonPeriodo(): string {
    if (!this.periodoSeleccionado || !this.mesSeleccionado || !this.anioSeleccionado) {
      return 'Todos los periodos';
    }
    const mesObj = this.listaMeses.find(m => m.value === this.mesSeleccionado);
    return `${mesObj?.nombreCompleto || ''} ${this.anioSeleccionado}`;
  }

  cargarCargasVentas(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.loadingService.show();
    this.cdr.detectChanges();

    this.operacionesService.listarCargas(this.ruc, 'Ventas', this.periodoSeleccionado, 1, 50).subscribe({
      next: (res: any) => {
        this.cargando = false;
        this.loadingService.hide();

        const data = res?.data || res?.Data || res;
        if (Array.isArray(data)) {
          this.cargas = data;
        } else if (data && Array.isArray(data.items)) {
          this.cargas = data.items;
        } else if (res && Array.isArray(res.items)) {
          this.cargas = res.items;
        } else {
          this.cargas = [];
        }

        this.totalArchivos = this.cargas.length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.loadingService.hide();
        this.mensajeError = 'No se pudo cargar el historial de ventas.';
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPeriodo(): void {
    this.cargarCargasVentas();
  }

  irNuevaCarga(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'nueva']);
  }

  formatearPeriodo(periodo: string | number): string {
    if (!periodo) return '-';
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

  verDetalleCarga(carga: ArchivoCargaItem): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', carga.idCarga]);
  }

  async confirmarEliminarCarga(carga: ArchivoCargaItem, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Archivo de Ventas',
      message: `¿Está seguro de que desea eliminar definitivamente el archivo "${carga.nombreOriginal}" del periodo ${this.formatearPeriodo(carga.periodo)}? Se eliminarán todos los comprobantes y observaciones vinculadas. Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar archivo',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    this.loadingService.show();
    this.operacionesService.eliminarCarga(carga.idCarga).subscribe({
      next: (exito) => {
        this.loadingService.hide();
        this.modalService.open({
          type: 'info',
          title: 'Archivo Eliminado',
          message: `El archivo "${carga.nombreOriginal}" y todos sus registros han sido eliminados correctamente.`
        });
        this.cargarCargasVentas();
      },
      error: (err) => {
        this.loadingService.hide();
        const msg = err?.error?.message || err?.error?.Mensaje || 'No se pudo eliminar el archivo de ventas.';
        this.modalService.open({
          type: 'error',
          title: 'Error al Eliminar',
          message: msg
        });
      }
    });
  }

  // ------------------------------------------------------------------
  // Pestaña 2 — Datos de la Empresa (mock)
  // ------------------------------------------------------------------

  cargarCargasEmpresa(): void {
    this.cargandoEmpresa = true;
    this.mensajeErrorEmpresa = null;
    this.cdr.detectChanges();

    this.operacionesService.listarCargas(this.ruc, 'VentasEmpresa', this.periodoSeleccionado, 1, 50).subscribe({
      next: (res: any) => {
        this.cargandoEmpresa = false;
        const data = res?.data || res?.Data || res;
        let list: any[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.items)) {
          list = data.items;
        } else if (res && Array.isArray(res.items)) {
          list = res.items;
        }

        this.cargasEmpresa = list.map(c => ({
          idCargaEmpresa: c.idCarga,
          periodo: c.periodo,
          nombreOriginal: c.nombreOriginal,
          numRegistros: c.numRegistros,
          numObservaciones: c.numRegistrosError,
          fechaCreacion: c.fechaCreacion
        }));

        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoEmpresa = false;
        this.mensajeErrorEmpresa = 'No se pudo cargar el historial de archivos de la empresa.';
        this.cdr.detectChanges();
      }
    });
  }

  irCargarDatosEmpresa(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'empresa', 'nueva']);
  }

  verDatosEmpresa(carga: CargaEmpresaItem): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'empresa', carga.idCargaEmpresa]);
  }

  async eliminarCargaEmpresa(carga: CargaEmpresaItem): Promise<void> {
    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Datos de la Empresa',
      message: `¿Eliminar definitivamente el archivo "${carga.nombreOriginal}" del periodo ${this.formatearPeriodo(carga.periodo)}? Se eliminarán sus registros y observaciones.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.loadingService.show();
    this.operacionesService.eliminarCarga(carga.idCargaEmpresa).subscribe({
      next: () => {
        this.loadingService.hide();
        this.modalService.open({
          type: 'info',
          title: 'Archivo Eliminado',
          message: `El archivo "${carga.nombreOriginal}" fue eliminado correctamente.`
        });
        this.cargarCargasEmpresa();
      },
      error: (err) => {
        this.loadingService.hide();
        this.modalService.open({ type: 'error', title: 'Error', message: err?.error?.message || err?.message || 'No se pudo eliminar el archivo.' });
      }
    });
  }

  // ------------------------------------------------------------------
  // Pestaña 3 — Match de Información (mock)
  // ------------------------------------------------------------------

  cargarPanelMatch(): void {
    this.cargandoMatch = true;
    this.mensajeErrorMatch = null;
    this.cdr.detectChanges();
    this.workspaceService.obtenerPanelMatch().subscribe({
      next: (items) => {
        this.panelMatch = items;
        this.cargandoMatch = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoMatch = false;
        this.mensajeErrorMatch = 'No se pudo cargar el estado del match por periodo.';
        this.cdr.detectChanges();
      }
    });
  }

  puedeEjecutarMatch(item: PanelMatchItem): boolean {
    return item.sireCargado && item.empresaCargada;
  }

  async ejecutarMatch(item: PanelMatchItem): Promise<void> {
    if (!this.puedeEjecutarMatch(item)) return;

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: item.match ? 'Re-ejecutar Match' : 'Ejecutar Match',
      message: `Se cruzarán los comprobantes de SIRE contra los datos de la empresa para ${this.formatearPeriodo(item.periodo)}.${item.match ? ' El match anterior será reemplazado y se perderán las ediciones del consolidado.' : ''} ¿Desea continuar?`,
      confirmText: 'Sí, ejecutar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.loadingService.show();
    this.workspaceService.ejecutarMatch(item.periodo).subscribe({
      next: (resumen) => {
        this.loadingService.hide();
        this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'match', resumen.idMatch]);
      },
      error: async (err) => {
        this.loadingService.hide();
        await this.modalService.open({
          type: 'error',
          title: 'No se pudo ejecutar el match',
          message: err?.message || 'Ocurrió un error al cruzar la información.',
          confirmText: 'Volver'
        });
      }
    });
  }

  verMatch(item: PanelMatchItem): void {
    if (!item.match) return;
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'match', item.match.idMatch]);
  }

  formatearFecha(iso: string | undefined): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
