import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import {
  VentasWorkspaceService,
  CargaEmpresaItem,
  VentaEmpresaItem,
  ObservacionEmpresaItem
} from '../../../services/ventas-workspace.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';

type FilaVenta = VentaEmpresaItem & { esNuevo?: boolean; editando?: boolean; modificado?: boolean };

@Component({
  selector: 'app-datos-empresa-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './datos-empresa-detalle.component.html',
  styleUrl: './datos-empresa-detalle.component.css'
})
export class DatosEmpresaDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaContext = inject(EmpresaContextService);
  private workspaceService = inject(VentasWorkspaceService);
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
      next: (carga) => {
        this.carga = carga;
        this.workspaceService.obtenerVentasEmpresa(this.idCargaEmpresa).subscribe({
          next: (ventas) => {
            this.ventas = ventas;
            this.workspaceService.obtenerErroresEmpresa(this.idCargaEmpresa).subscribe({
              next: (errores) => {
                this.errores = errores;
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
  // Presentación
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
    return this.ventas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.biGravada) || 0), 0);
  }

  get totalIgv(): number {
    return this.ventas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.igvIpm) || 0), 0);
  }

  get totalGeneral(): number {
    return this.ventas.filter(v => !this.idsParaEliminar.includes(v.idVentaEmpresa))
      .reduce((acc, v) => acc + (Number(v.totalCp) || 0), 0);
  }

  formatearPeriodo(periodo: string | undefined): string {
    if (!periodo || periodo.length !== 6) return periodo || '-';
    const anio = periodo.substring(0, 4);
    const mes = this.meses[parseInt(periodo.substring(4, 6), 10) - 1] || periodo.substring(4, 6);
    return `${mes} ${anio}`;
  }

  // --------------------------------------------------------------------------
  // Edición de la grilla
  // --------------------------------------------------------------------------

  iniciarEdicion(fila: FilaVenta): void {
    if (fila.editando) return;
    (fila as any)._original = { ...fila };
    fila.editando = true;
    this.cdr.detectChanges();
  }

  finalizarEdicion(fila: FilaVenta): void {
    if (!fila.editando) return;
    fila.editando = false;

    const original = (fila as any)._original;
    if (original && !fila.esNuevo) {
      const cambia = (campo: keyof VentaEmpresaItem) =>
        String(original[campo] ?? '') !== String((fila as any)[campo] ?? '');
      if (cambia('codigoTipoCp') || cambia('serie') || cambia('numero') || cambia('fechaEmision') ||
          cambia('codigoTipoDocIdentidad') || cambia('nroDocIdentidad') || cambia('razonSocial') ||
          cambia('biGravada') || cambia('igvIpm') || cambia('totalCp') || cambia('codigoMoneda')) {
        fila.modificado = true;
      } else {
        fila.modificado = false;
      }
    }
    this.cdr.detectChanges();
  }

  insertarFila(): void {
    const periodo = this.carga?.periodo || '';
    const fechaBase = periodo.length === 6 ? `${periodo.substring(0, 4)}-${periodo.substring(4, 6)}-01` : '';
    this.ventas.unshift({
      idVentaEmpresa: 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      numeroLinea: 0,
      codigoTipoCp: '01',
      serie: 'F001',
      numero: '',
      fechaEmision: fechaBase,
      codigoTipoDocIdentidad: '6',
      nroDocIdentidad: '',
      razonSocial: '',
      biGravada: 0,
      igvIpm: 0,
      totalCp: 0,
      codigoMoneda: 'PEN',
      esNuevo: true,
      editando: true
    });
    this.cdr.detectChanges();
  }

  async eliminarFila(fila: FilaVenta): Promise<void> {
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

    // Validaciones mínimas de filas nuevas y modificadas
    const revisar = [...this.filasNuevas, ...this.filasModificadas];
    for (const fila of revisar) {
      if (!fila.serie?.trim() || !fila.numero?.trim() || !fila.razonSocial?.trim()) {
        await this.modalService.open({
          type: 'warning',
          title: 'Datos Incompletos',
          message: `La fila con serie "${fila.serie || '(vacía)'}" debe tener Serie, Número y Razón Social completos.`
        });
        return;
      }
      if (isNaN(Number(fila.biGravada)) || isNaN(Number(fila.igvIpm)) || isNaN(Number(fila.totalCp))) {
        await this.modalService.open({
          type: 'warning',
          title: 'Montos Inválidos',
          message: `El comprobante ${fila.serie}-${fila.numero} tiene montos que no son números válidos.`
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

    this.workspaceService.actualizarVentasEmpresa(this.idCargaEmpresa, this.idsParaEliminar, nuevos, modificados).subscribe({
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
          message: err?.message || 'No se pudieron guardar los cambios.',
          confirmText: 'Volver'
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas'], { queryParams: { tab: 'empresa' } });
  }

  // --------------------------------------------------------------------------
  // Exportar CSV
  // --------------------------------------------------------------------------

  exportarCSV(): void {
    const cabecera = ['Tipo CP', 'Serie', 'Numero', 'Fecha Emision', 'Tipo Doc', 'Nro Doc', 'Razon Social', 'Base Imponible', 'IGV', 'Total', 'Moneda'];
    const lineas = this.ventas.map(v => [
      v.codigoTipoCp, v.serie, v.numero, v.fechaEmision, v.codigoTipoDocIdentidad,
      v.nroDocIdentidad, v.razonSocial,
      Number(v.biGravada).toFixed(2), Number(v.igvIpm).toFixed(2), Number(v.totalCp).toFixed(2),
      v.codigoMoneda
    ].join(';'));

    const csv = '\uFEFF' + [cabecera.join(';'), ...lineas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datos_empresa_${this.carga?.periodo || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
