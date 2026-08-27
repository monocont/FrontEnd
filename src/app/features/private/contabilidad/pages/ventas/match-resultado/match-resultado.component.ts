import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import {
  VentasWorkspaceService,
  MatchResumen,
  MatchDetalleItem,
  ConsolidadoMatch,
  ResultadoMatch
} from '../../../services/ventas-workspace.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';

type FiltroActivo = 'Todos' | ResultadoMatch;

type FilaMatch = MatchDetalleItem & {
  esNuevoPendiente?: boolean;
  modificadoPendiente?: boolean;
};

@Component({
  selector: 'app-match-resultado',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './match-resultado.component.html',
  styleUrl: './match-resultado.component.css'
})
export class MatchResultadoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaContext = inject(EmpresaContextService);
  private workspaceService = inject(VentasWorkspaceService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  idEmpresa: string = '';
  idMatch: string = '';

  resumen: MatchResumen | null = null;
  detalle: FilaMatch[] = [];
  cargando: boolean = true;
  guardando: boolean = false;
  mensajeError: string | null = null;

  filtroActivo: FiltroActivo = 'Todos';
  busqueda: string = '';

  // Modal de edición de fila (comparativo + consolidado editable)
  filaEditando: FilaMatch | null = null;
  consolidadoEdit: ConsolidadoMatch | null = null;
  esFilaNueva: boolean = false;

  // Cambios pendientes del consolidado
  idsParaEliminar: string[] = [];

  private readonly meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  private readonly etiquetasResultado: Record<ResultadoMatch, string> = {
    Coincidente: 'Coincidente',
    Conflicto: 'Conflicto',
    SoloSire: 'Solo SIRE',
    SoloEmpresa: 'Solo Empresa'
  };

  private readonly etiquetasCampo: Record<string, string> = {
    bi_gravada: 'Base Imponible',
    igv_ipm: 'IGV',
    total: 'Total',
    duplicado: 'Duplicado'
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      this.idMatch = params.get('idMatch') || '';
      if (this.idMatch) {
        this.cargar();
      }
    });
  }

  cargar(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.idsParaEliminar = [];
    this.cdr.detectChanges();

    this.workspaceService.obtenerMatch(this.idMatch).subscribe({
      next: (resumen) => {
        this.resumen = resumen;
        this.workspaceService.listarMatchDetalle(this.idMatch).subscribe({
          next: (detalle) => {
            this.detalle = detalle;
            this.cargando = false;
            this.cdr.detectChanges();
          },
          error: () => this.errorCarga('No se pudo cargar el detalle del match.')
        });
      },
      error: () => this.errorCarga('No se encontró el match indicado (pudo ser invalidado por una nueva carga).')
    });
  }

  private errorCarga(mensaje: string): void {
    this.cargando = false;
    this.mensajeError = mensaje;
    this.cdr.detectChanges();
  }

  volver(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas'], { queryParams: { tab: 'match' } });
  }

  // --------------------------------------------------------------------------
  // Filtros y búsqueda
  // --------------------------------------------------------------------------

  get detalleFiltrado(): FilaMatch[] {
    let list = this.detalle;
    if (this.filtroActivo !== 'Todos') {
      list = list.filter(d => d.resultado === this.filtroActivo);
    }
    const q = this.busqueda.trim().toLowerCase();
    if (q) {
      list = list.filter(d =>
        d.consolidado.serie.toLowerCase().includes(q) ||
        d.consolidado.numero.toLowerCase().includes(q) ||
        d.consolidado.razonSocial.toLowerCase().includes(q) ||
        (d.sire?.nroDocIdentidad || d.empresa?.nroDocIdentidad || '').includes(q)
      );
    }
    return list;
  }

  contar(resultado: ResultadoMatch): number {
    return this.detalle.filter(d => d.resultado === resultado && !d.esNuevoPendiente).length;
  }

  // --------------------------------------------------------------------------
  // Edición del consolidado (modal)
  // --------------------------------------------------------------------------

  get pendientesNuevos(): FilaMatch[] {
    return this.detalle.filter(d => d.esNuevoPendiente);
  }

  get pendientesModificados(): FilaMatch[] {
    return this.detalle.filter(d => d.modificadoPendiente && !d.esNuevoPendiente);
  }

  get totalCambiosPendientes(): number {
    return this.pendientesNuevos.length + this.pendientesModificados.length + this.idsParaEliminar.length;
  }

  abrirFila(fila: FilaMatch): void {
    this.esFilaNueva = false;
    this.filaEditando = fila;
    this.consolidadoEdit = { ...fila.consolidado };
    this.cdr.detectChanges();
  }

  abrirFilaNueva(): void {
    const periodo = this.resumen?.periodo || '';
    const fechaBase = periodo.length === 6 ? `${periodo.substring(0, 4)}-${periodo.substring(4, 6)}-01` : '';
    this.esFilaNueva = true;
    this.filaEditando = null;
    this.consolidadoEdit = {
      codigoTipoCp: '01', serie: 'F001', numero: '',
      fechaEmision: fechaBase,
      codigoTipoDocIdentidad: '6', nroDocIdentidad: '', razonSocial: '',
      biGravada: 0, igvIpm: 0, totalCp: 0, codigoMoneda: 'PEN'
    };
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.filaEditando = null;
    this.consolidadoEdit = null;
    this.esFilaNueva = false;
  }

  guardarFila(): void {
    if (!this.consolidadoEdit) return;

    if (!this.consolidadoEdit.serie?.trim() || !this.consolidadoEdit.numero?.trim() || !this.consolidadoEdit.razonSocial?.trim()) {
      this.modalService.open({
        type: 'warning',
        title: 'Datos Incompletos',
        message: 'Serie, Número y Razón Social son obligatorios para el comprobante consolidado.'
      });
      return;
    }

    if (this.esFilaNueva || !this.filaEditando) {
      this.detalle.push({
        idDetalle: 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        resultado: 'Coincidente',
        origen: 'Manual',
        sire: null,
        empresa: null,
        consolidado: { ...this.consolidadoEdit },
        camposConflicto: null, difBi: null, difIgv: null, difTotal: null,
        esNuevoPendiente: true
      });
    } else {
      this.filaEditando.consolidado = { ...this.consolidadoEdit };
      if (!this.filaEditando.esNuevoPendiente) {
        this.filaEditando.modificadoPendiente = true;
      }
    }
    this.cerrarModal();
    this.cdr.detectChanges();
  }

  async eliminarFila(fila: FilaMatch): Promise<void> {
    if (fila.esNuevoPendiente) {
      this.detalle = this.detalle.filter(d => d.idDetalle !== fila.idDetalle);
      this.cdr.detectChanges();
      return;
    }

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Eliminar del Consolidado',
      message: `¿Eliminar el comprobante ${fila.consolidado.serie}-${fila.consolidado.numero} del consolidado? Los datos de origen (SIRE/Empresa) no se modifican. El cambio se aplicará al guardar.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.idsParaEliminar.push(fila.idDetalle);
    this.detalle = this.detalle.filter(d => d.idDetalle !== fila.idDetalle);
    this.cdr.detectChanges();
  }

  // --------------------------------------------------------------------------
  // Guardar / Re-ejecutar / Exportar
  // --------------------------------------------------------------------------

  async guardarCambios(): Promise<void> {
    if (this.totalCambiosPendientes === 0) return;

    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Guardar Cambios del Consolidado',
      message: `Se aplicarán: ${this.pendientesNuevos.length} nuevos, ${this.pendientesModificados.length} modificados y ${this.idsParaEliminar.length} eliminados. Los datos de origen no se alteran.`,
      confirmText: 'Sí, guardar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.guardando = true;
    this.loadingService.show();
    this.cdr.detectChanges();

    const nuevos = this.pendientesNuevos.map(f => ({ ...f.consolidado }));
    const modificados = this.pendientesModificados.map(f => ({ idDetalle: f.idDetalle, consolidado: { ...f.consolidado } }));

    this.workspaceService.actualizarMatchDetalle(this.idMatch, this.idsParaEliminar, nuevos, modificados).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.loadingService.hide();
        this.cargar();
        await this.modalService.open({
          type: 'info',
          title: 'Consolidado Actualizado',
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

  async reejecutar(): Promise<void> {
    if (!this.resumen) return;
    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Re-ejecutar Match',
      message: `Se cruzarán nuevamente los datos de ${this.formatearPeriodo(this.resumen.periodo)}. El match actual será REEMPLAZADO y se perderán las ediciones del consolidado. ¿Desea continuar?`,
      confirmText: 'Sí, re-ejecutar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.loadingService.show();
    this.workspaceService.ejecutarMatch(this.resumen.periodo).subscribe({
      next: (resumen) => {
        this.loadingService.hide();
        this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'match', resumen.idMatch]);
        if (resumen.idMatch === this.idMatch) {
          this.cargar();
        }
      },
      error: async (err) => {
        this.loadingService.hide();
        await this.modalService.open({
          type: 'error',
          title: 'Error',
          message: err?.message || 'No se pudo re-ejecutar el match.',
          confirmText: 'Volver'
        });
      }
    });
  }

  exportarCSV(): void {
    const cabecera = ['Tipo CP', 'Serie', 'Numero', 'Fecha', 'Documento', 'Razon Social',
      'Resultado', 'BI SIRE', 'BI Empresa', 'IGV SIRE', 'IGV Empresa', 'Total SIRE', 'Total Empresa',
      'BI Consol', 'IGV Consol', 'Total Consol', 'Moneda'];
    const lineas = this.detalleFiltrado.map(d => [
      d.consolidado.codigoTipoCp, d.consolidado.serie, d.consolidado.numero,
      d.consolidado.fechaEmision, d.consolidado.nroDocIdentidad, d.consolidado.razonSocial,
      d.origen === 'Manual' ? 'Manual' : this.etiqueta(d.resultado),
      d.sire ? d.sire.biGravada.toFixed(2) : '',
      d.empresa ? d.empresa.biGravada.toFixed(2) : '',
      d.sire ? d.sire.igvIpm.toFixed(2) : '',
      d.empresa ? d.empresa.igvIpm.toFixed(2) : '',
      d.sire ? d.sire.totalCp.toFixed(2) : '',
      d.empresa ? d.empresa.totalCp.toFixed(2) : '',
      d.consolidado.biGravada.toFixed(2),
      d.consolidado.igvIpm.toFixed(2),
      d.consolidado.totalCp.toFixed(2),
      d.consolidado.codigoMoneda
    ].join(';'));

    const csv = '\uFEFF' + [cabecera.join(';'), ...lineas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_${this.resumen?.periodo || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------------------
  // Presentación
  // --------------------------------------------------------------------------

  get nombreEmpresa(): string {
    return this.empresaContext.empresa()?.razonSocial || this.idEmpresa;
  }

  etiqueta(resultado: ResultadoMatch): string {
    return this.etiquetasResultado[resultado] || resultado;
  }

  etiquetaCampo(campo: string): string {
    return this.etiquetasCampo[campo] || campo;
  }

  camposConflictoLista(fila: FilaMatch): string[] {
    return (fila.camposConflicto || '').split(',').filter(c => c.trim());
  }

  resultadoClase(resultado: ResultadoMatch): string {
    switch (resultado) {
      case 'Coincidente': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Conflicto': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SoloSire': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'SoloEmpresa': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  filaClase(fila: FilaMatch): string {
    if (fila.esNuevoPendiente) return 'fila-manual';
    if (fila.modificadoPendiente) return 'fila-editada';
    switch (fila.resultado) {
      case 'Coincidente': return 'fila-coincidente';
      case 'Conflicto': return 'fila-conflicto';
      case 'SoloSire': return 'fila-solo-sire';
      case 'SoloEmpresa': return 'fila-solo-empresa';
      default: return '';
    }
  }

  deltaTexto(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    if (Math.abs(valor) < 0.005) return '0.00';
    const signo = valor > 0 ? '+' : '';
    return `${signo}${valor.toFixed(2)}`;
  }

  deltaClase(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return 'text-slate-300';
    if (Math.abs(valor) < 0.005) return 'text-slate-400';
    return valor > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
  }

  deltaResumenClase(valor: number): string {
    if (Math.abs(valor) < 0.005) return 'text-slate-400';
    return valor > 0 ? 'text-emerald-600' : 'text-rose-600';
  }

  formatearPeriodo(periodo: string | undefined): string {
    if (!periodo || periodo.length !== 6) return periodo || '-';
    const anio = periodo.substring(0, 4);
    const mes = this.meses[parseInt(periodo.substring(4, 6), 10) - 1] || periodo.substring(4, 6);
    return `${mes} ${anio}`;
  }
}
