import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import {
  ComprasWorkspaceService,
  MatchComprasResumen,
  MatchComprasDetalleItem,
  ResultadoMatch
} from '../../../services/compras-workspace.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';

type FilaMatch = MatchComprasDetalleItem & { editando?: boolean; modificado?: boolean };

@Component({
  selector: 'app-match-resultado-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './match-resultado.component.html',
  styleUrl: './match-resultado.component.css'
})
export class MatchResultadoComprasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaContext = inject(EmpresaContextService);
  private workspaceService = inject(ComprasWorkspaceService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  idEmpresa: string = '';
  idMatch: string = '';

  resumen: MatchComprasResumen | null = null;
  detalles: FilaMatch[] = [];
  cargando: boolean = true;
  guardando: boolean = false;
  mensajeError: string | null = null;

  filtroResultado: 'Todos' | ResultadoMatch = 'Todos';
  filtroTexto: string = '';

  private readonly meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      this.idMatch = params.get('idMatch') || '';
      if (this.idMatch) {
        this.cargarMatch();
      }
    });
  }

  cargarMatch(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    this.workspaceService.obtenerMatch(this.idMatch).subscribe({
      next: (datos) => {
        this.resumen = datos.resumen;
        this.detalles = datos.detalles.map(d => ({ ...d, editando: false, modificado: false }));
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err?.message || 'No se pudo cargar el resultado del match de compras.';
        this.cdr.detectChanges();
      }
    });
  }

  get nombreEmpresa(): string {
    return this.empresaContext.empresa()?.razonSocial || 'Empresa';
  }

  formatearPeriodo(periodo?: string): string {
    if (!periodo || periodo.length < 6) return periodo || '';
    const anio = periodo.substring(0, 4);
    const mesNum = parseInt(periodo.substring(4, 6), 10);
    const mesNom = this.meses[mesNum - 1] || '';
    return `${mesNom} ${anio}`;
  }

  get detallesFiltrados(): FilaMatch[] {
    let res = [...this.detalles];

    if (this.filtroResultado !== 'Todos') {
      res = res.filter(d => d.resultado === this.filtroResultado);
    }

    if (this.filtroTexto.trim()) {
      const q = this.filtroTexto.trim().toLowerCase();
      res = res.filter(d =>
        (d.consolidado.serie || '').toLowerCase().includes(q) ||
        (d.consolidado.numero || '').toLowerCase().includes(q) ||
        (d.consolidado.nroDocIdentidad || '').toLowerCase().includes(q) ||
        (d.consolidado.razonSocial || '').toLowerCase().includes(q)
      );
    }

    return res;
  }

  get totalCambiosPendientes(): number {
    return this.detalles.filter(d => d.modificado).length;
  }

  async reejecutar(): Promise<void> {
    if (!this.resumen) return;
    const confirmado = await this.modalService.open({
      type: 'confirm',
      title: 'Re-ejecutar Match de Compras',
      message: `Se volverán a cruzar los comprobantes SIRE vs Empresa del periodo ${this.formatearPeriodo(this.resumen.periodo)}. ¿Continuar?`,
      confirmText: 'Sí, re-ejecutar',
      cancelText: 'Cancelar'
    });
    if (!confirmado) return;

    this.loadingService.show();
    this.workspaceService.ejecutarMatch(this.resumen.periodo).subscribe({
      next: (nuevoResumen) => {
        this.loadingService.hide();
        this.idMatch = nuevoResumen.idMatch;
        this.cargarMatch();
      },
      error: async (err) => {
        this.loadingService.hide();
        await this.modalService.open({
          type: 'error',
          title: 'Error',
          message: err?.message || 'No se pudo re-ejecutar el match.'
        });
      }
    });
  }

  async guardarCambios(): Promise<void> {
    const modificados = this.detalles.filter(d => d.modificado);
    this.guardando = true;
    this.loadingService.show();

    this.workspaceService.actualizarDetalleMatch(this.idMatch, { modificados }).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.loadingService.hide();
        this.detalles.forEach(d => d.modificado = false);
        this.cdr.detectChanges();
        await this.modalService.open({
          type: 'info',
          title: 'Guardado',
          message: res.mensaje
        });
      },
      error: async (err) => {
        this.guardando = false;
        this.loadingService.hide();
        this.cdr.detectChanges();
        await this.modalService.open({
          type: 'error',
          title: 'Error al Guardar',
          message: err?.message || 'No se pudieron guardar las modificaciones.'
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'compras'], { queryParams: { tab: 'match' } });
  }
}
