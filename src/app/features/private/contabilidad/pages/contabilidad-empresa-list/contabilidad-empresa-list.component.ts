import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EmpresaService, Empresa, RegimenTributario } from '../../../empresa/services/empresa.service';
import { LoadingService } from '../../../../../shared/ui/loading/loading.service';

@Component({
  selector: 'app-contabilidad-empresa-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contabilidad-empresa-list.component.html',
  styleUrl: './contabilidad-empresa-list.component.css'
})
export class ContabilidadEmpresaListComponent implements OnInit {
  private empresaService = inject(EmpresaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private loadingService = inject(LoadingService);

  empresas: Empresa[] = [];
  regimenes: RegimenTributario[] = [];
  cargando: boolean = false;
  mensajeError: string | null = null;

  filtroRuc: string = '';
  filtroRazonSocial: string = '';
  filtroRegimen: string = '';

  paginaActual: number = 1;
  tamanoPagina: number = 10;
  totalItems: number = 0;
  totalPaginas: number = 1;

  ngOnInit(): void {
    this.cargarRegimenes();
    this.cargarEmpresas();
  }

  cargarRegimenes(): void {
    this.empresaService.obtenerRegimenes().subscribe({
      next: (res: any) => {
        const data = res?.data || res?.Data || res;
        this.regimenes = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cargarEmpresas(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.loadingService.show();
    this.cdr.detectChanges();

    this.empresaService.listar({
      ruc: this.filtroRuc || undefined,
      razonSocial: this.filtroRazonSocial || undefined,
      codigoRegimenTributario: this.filtroRegimen || undefined,
      pageNumber: this.paginaActual,
      pageSize: this.tamanoPagina
    }).subscribe({
      next: (res: any) => {
        this.cargando = false;
        this.loadingService.hide();
        const data = res?.data || res?.Data || res;
        if (data && Array.isArray(data.items)) {
          this.empresas = data.items;
          this.totalItems = data.total ?? data.items.length;
          this.totalPaginas = data.totalPages ?? 1;
        } else if (Array.isArray(data)) {
          this.empresas = data;
          this.totalItems = data.length;
          this.totalPaginas = 1;
        } else if (res && Array.isArray(res.items)) {
          this.empresas = res.items;
          this.totalItems = res.total ?? res.items.length;
          this.totalPaginas = res.totalPages ?? 1;
        } else {
          this.empresas = [];
          this.totalItems = 0;
          this.totalPaginas = 1;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.loadingService.hide();
        this.mensajeError = 'No se pudieron cargar las empresas para operaciones contables.';
        this.cdr.detectChanges();
      }
    });
  }

  buscar(): void {
    this.paginaActual = 1;
    this.cargarEmpresas();
  }

  limpiarFiltros(): void {
    this.filtroRuc = '';
    this.filtroRazonSocial = '';
    this.filtroRegimen = '';
    this.buscar();
  }

  irPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || pagina === this.paginaActual) return;
    this.paginaActual = pagina;
    this.cargarEmpresas();
  }

  ingresarOperaciones(empresa: Empresa): void {
    this.router.navigate(['/home/contabilidad/empresa', empresa.idEmpresa]);
  }

  obtenerNombreRegimen(codigo: string): string {
    const reg = this.regimenes.find(r => r.codigo === codigo);
    return reg ? reg.descripcion : codigo || 'No asignado';
  }

  obtenerClaseRegimen(codigo: string): string {
    switch (codigo) {
      case 'RMT': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'RG': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RER': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'NRUS': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
}
