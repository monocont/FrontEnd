import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaService, Empresa } from '../../../empresa/services/empresa.service';

interface ModuloOperacion {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  icono: string;
  colorClase: string;
  bgClase: string;
  borderClase: string;
  badgeTexto: string;
  badgeClase: string;
  ruta: string;
  disponible: boolean;
}

@Component({
  selector: 'app-contabilidad-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contabilidad-hub.component.html',
  styleUrl: './contabilidad-hub.component.css'
})
export class ContabilidadHubComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private cdr = inject(ChangeDetectorRef);

  ruc: string = '';
  empresa: Empresa | null = null;
  cargando: boolean = true;
  mensajeError: string | null = null;

  anioActual: number = new Date().getFullYear();
  mesActual: number = new Date().getMonth() + 1;

  modulos: ModuloOperacion[] = [
    {
      id: 'ventas',
      titulo: 'Registro de Ventas',
      subtitulo: 'SIRE / RVIE',
      descripcion: 'Ingesta de archivos TXT/CSV, control de correlatividad y detalle de comprobantes emitidos.',
      icono: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      colorClase: 'text-indigo-600',
      bgClase: 'bg-indigo-50 hover:bg-indigo-100/60',
      borderClase: 'hover:border-indigo-200',
      badgeTexto: 'Operativo',
      badgeClase: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ruta: 'ventas',
      disponible: true
    },
    {
      id: 'compras',
      titulo: 'Registro de Compras',
      subtitulo: 'SIRE / RCE',
      descripcion: 'Carga masiva de compras (80 columnas), crédito fiscal, detracción e inconsistencias.',
      icono: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      colorClase: 'text-emerald-600',
      bgClase: 'bg-emerald-50 hover:bg-emerald-100/60',
      borderClase: 'hover:border-emerald-200',
      badgeTexto: 'Operativo',
      badgeClase: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ruta: 'compras',
      disponible: true
    },
    {
      id: 'planillas',
      titulo: 'Planilla y RRHH',
      subtitulo: 'PLAME / T-Registro',
      descripcion: 'Gestión de aportes de ley, ONP, AFP, EsSalud y retenciones de quinta categoría.',
      icono: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      colorClase: 'text-amber-600',
      bgClase: 'bg-amber-50/50',
      borderClase: 'border-slate-100',
      badgeTexto: 'Próximamente',
      badgeClase: 'bg-slate-100 text-slate-500 border-slate-200',
      ruta: 'planillas',
      disponible: false
    },
    {
      id: 'asientos',
      titulo: 'Libro Diario / Asientos',
      subtitulo: 'Plan Contable PCGE',
      descripcion: 'Generación automática de asientos por compras y ventas, cuentas T y balance de comprobación.',
      icono: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      colorClase: 'text-sky-600',
      bgClase: 'bg-sky-50/50',
      borderClase: 'border-slate-100',
      badgeTexto: 'Próximamente',
      badgeClase: 'bg-slate-100 text-slate-500 border-slate-200',
      ruta: 'asientos',
      disponible: false
    }
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
      if (this.ruc) {
        this.cargarDatosEmpresa();
      }
    });
  }

  cargarDatosEmpresa(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    this.empresaService.listar({ ruc: this.ruc, pageSize: 1 }).subscribe({
      next: (res: any) => {
        this.cargando = false;
        const data = res?.data || res?.Data || res;
        const items = data?.items || (Array.isArray(data) ? data : res?.items) || [];
        if (items.length > 0) {
          this.empresa = items[0];
        } else {
          this.mensajeError = `No se encontró la empresa con RUC ${this.ruc}.`;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'Error al consultar información de la empresa.';
        this.cdr.detectChanges();
      }
    });
  }

  abrirModulo(modulo: ModuloOperacion): void {
    if (!modulo.disponible) return;
    this.router.navigate(['/home/contabilidad/empresa', this.ruc, modulo.ruta]);
  }
}
