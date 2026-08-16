import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import { OperacionesService, ArchivoCargaItem } from '../../../services/operaciones.service';

@Component({
  selector: 'app-compras-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './compras-list.component.html',
  styleUrl: './compras-list.component.css'
})
export class ComprasListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private operacionesService = inject(OperacionesService);

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

  totalArchivos: number = 0;
  totalComprobantesValidos: number = 0;
  totalObservaciones: number = 0;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
      if (this.ruc) {
        this.cargarDatosEmpresa();
        this.cargarCargasCompras();
      }
    });
  }

  cargarDatosEmpresa(): void {
    this.empresaService.listar({ ruc: this.ruc, pageSize: 1 }).subscribe({
      next: (res: any) => {
        if (res.items && res.items.length > 0) {
          this.empresa = res.items[0];
        }
      }
    });
  }

  cargarCargasCompras(): void {
    this.cargando = true;
    this.mensajeError = null;

    this.operacionesService.listarCargas(this.ruc, 'Compras', 1, 50).subscribe({
      next: (res: ArchivoCargaItem[]) => {
        this.cargando = false;
        this.cargas = res || [];
        this.calcularMetricas(this.cargas);
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'No se pudo cargar el historial de compras.';
      }
    });
  }

  cambiarPeriodo(): void {
    this.cargarCargasCompras();
  }

  private calcularMetricas(cargas: ArchivoCargaItem[]): void {
    this.totalArchivos = cargas.length;
    this.totalComprobantesValidos = cargas.reduce((acc, c) => acc + (c.numRegistrosValidos || 0), 0);
    this.totalObservaciones = cargas.reduce((acc, c) => acc + (c.numRegistrosError || 0), 0);
  }

  irNuevaCarga(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.ruc, 'compras', 'nueva'], {
      queryParams: { periodo: this.periodoCalculado }
    });
  }

  verDetalleCarga(carga: ArchivoCargaItem): void {
    this.router.navigate(['/home/contabilidad/empresa', this.ruc, 'compras', carga.idCarga]);
  }
}
