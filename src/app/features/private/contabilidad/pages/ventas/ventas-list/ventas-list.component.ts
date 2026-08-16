import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import { OperacionesService, ArchivoCargaItem } from '../../../services/operaciones.service';

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
  private operacionesService = inject(OperacionesService);
  private cdr = inject(ChangeDetectorRef);

  ruc: string = '';
  empresa: Empresa | null = null;
  cargas: ArchivoCargaItem[] = [];
  cargando: boolean = true;
  mensajeError: string | null = null;

  anioSeleccionado: number = new Date().getFullYear();
  mesSeleccionado: number = new Date().getMonth() + 1;

  get periodoCalculado(): string {
    const mesStr = this.mesSeleccionado.toString().padStart(2, '0');
    return `${this.anioSeleccionado}${mesStr}`;
  }

  // Métricas acumuladas del periodo
  totalArchivos: number = 0;
  totalComprobantesValidos: number = 0;
  totalObservaciones: number = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
      if (this.ruc) {
        this.cargarDatosEmpresa();
        this.cargarCargasVentas();
      }
    });
  }

  cargarDatosEmpresa(): void {
    this.empresaService.listar({ ruc: this.ruc, pageSize: 1 }).subscribe({
      next: (res: any) => {
        const data = res?.data || res?.Data || res;
        const items = data?.items || (Array.isArray(data) ? data : res?.items) || [];
        if (items.length > 0) {
          this.empresa = items[0];
          this.cdr.detectChanges();
        }
      }
    });
  }

  cargarCargasVentas(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    this.operacionesService.listarCargas(this.ruc, 'Ventas', 1, 50).subscribe({
      next: (res: ArchivoCargaItem[]) => {
        this.cargando = false;
        this.cargas = res || [];
        this.calcularMetricas(this.cargas);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'No se pudo cargar el historial de ventas.';
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPeriodo(): void {
    this.cargarCargasVentas();
  }

  private calcularMetricas(cargas: ArchivoCargaItem[]): void {
    this.totalArchivos = cargas.length;
    this.totalComprobantesValidos = cargas.reduce((acc, c) => acc + (c.numRegistrosValidos || 0), 0);
    this.totalObservaciones = cargas.reduce((acc, c) => acc + (c.numRegistrosError || 0), 0);
  }

  irNuevaCarga(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.ruc, 'ventas', 'nueva'], {
      queryParams: { periodo: this.periodoCalculado }
    });
  }

  verDetalleCarga(carga: ArchivoCargaItem): void {
    this.router.navigate(['/home/contabilidad/empresa', this.ruc, 'ventas', carga.idCarga]);
  }
}
