import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaService, Empresa, RegimenTributario } from '../../services/empresa.service';
import { LoadingService } from '../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../shared/ui/modal/modal.service';

@Component({
  selector: 'app-empresa-list',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './empresa-list.component.html',
  styleUrl: './empresa-list.component.css',
})
export class EmpresaListComponent implements OnInit {
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  filtroRuc = '';
  filtroRazonSocial = '';
  filtroRegimen = '';

  paginaActual = 1;
  itemsPorPagina = 10;
  totalItems = 0;
  totalPaginas = 0;

  empresas: Empresa[] = [];
  regimenes: RegimenTributario[] = [];

  ngOnInit(): void {
    this.cargarRegimenes();
    this.cargarEmpresas();
  }

  private cargarRegimenes(): void {
    this.empresaService.obtenerRegimenes().subscribe({
      next: (regimenes) => {
        this.regimenes = regimenes;
      },
      error: () => {
        this.regimenes = [];
      }
    });
  }

  obtenerNombreRegimen(codigo: string): string {
    const regimen = this.regimenes.find((r) => r.codigo === codigo);
    return regimen ? regimen.descripcion : codigo;
  }

  obtenerClaseRegimen(codigo: string): string {
    const clases: Record<string, string> = {
      NRUS: 'regimen-nrus',
      RER: 'regimen-rer',
      RG: 'regimen-rg',
      RMT: 'regimen-rmt',
    };
    return clases[codigo] || 'regimen-default';
  }

  cargarEmpresas(): void {
    this.loadingService.show();
    const filtro = {
      ruc: this.filtroRuc || undefined,
      razonSocial: this.filtroRazonSocial || undefined,
      codigoRegimenTributario: this.filtroRegimen || undefined,
      pageNumber: this.paginaActual,
      pageSize: this.itemsPorPagina,
    };
    this.empresaService.listar(filtro).subscribe({
      next: (response) => {
        this.empresas = response.items || [];
        this.totalItems = response.total || 0;
        this.totalPaginas = response.totalPages || 0;
        this.cdr.detectChanges();
        this.loadingService.hide();
      },
      error: () => {
        this.loadingService.hide();
        this.modalService.open({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar el listado de empresas.',
          confirmText: 'Cerrar'
        });
      }
    });
  }

  irPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.cargarEmpresas();
    }
  }

  buscar(): void {
    this.paginaActual = 1;
    this.cargarEmpresas();
  }

  onFiltroChange(): void {
    // No se usa: la busqueda se hace con el boton Buscar
  }

  nuevaEmpresa(): void {
    this.router.navigate(['/home/empresa/nueva']);
  }

  editar(empresa: Empresa): void {
    this.router.navigate(['/home/empresa', empresa.idEmpresa]);
  }

  eliminar(empresa: Empresa): void {
    this.modalService.open({
      type: 'confirm',
      title: 'Eliminar Empresa',
      message: `¿Estás seguro de eliminar la empresa "${empresa.razonSocial}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    }).then((confirmado: boolean) => {
      if (confirmado) {
        this.loadingService.show();
        this.empresaService.eliminar(empresa.idEmpresa).subscribe({
          next: () => {
            this.cargarEmpresas();
            this.loadingService.hide();
            this.modalService.open({
              type: 'info',
              title: 'Éxito',
              message: 'Empresa eliminada correctamente.',
              confirmText: 'Cerrar'
            });
          },
          error: () => {
            this.loadingService.hide();
            this.modalService.open({
              type: 'error',
              title: 'Error',
              message: 'No se pudo eliminar la empresa.',
              confirmText: 'Cerrar'
            });
          }
        });
      }
    });
  }
}