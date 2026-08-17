import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import { OperacionesService, ArchivoCargaItem } from '../../../services/operaciones.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';

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
  private loadingService = inject(LoadingService);
  private cdr = inject(ChangeDetectorRef);

  ruc: string = '';
  empresa: Empresa | null = null;
  cargas: ArchivoCargaItem[] = [];
  cargando: boolean = true;
  mensajeError: string | null = null;

  totalArchivos: number = 0;

  // Selector de Periodo tipo Calendario (Popup Mes / Año)
  periodoSeleccionado: string = ''; // formato "YYYYMM" o vacio
  mostrarSelector: boolean = false;
  anioSelector: number = new Date().getFullYear();
  mesSeleccionado: number | null = null;
  anioSeleccionado: number | null = null;

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
      this.ruc = params.get('ruc') || '';
      if (this.ruc) {
        this.cargarDatosEmpresa();
        this.cargarCargasCompras();
      }
    });
  }

  obtenerMesAnterior(): { anio: number; mes: number } {
    const ahora = new Date();
    let anio = ahora.getFullYear();
    let mes = ahora.getMonth();
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
    this.cargarCargasCompras();
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
    this.cargarCargasCompras();
  }

  get etiquetaBotonPeriodo(): string {
    if (!this.periodoSeleccionado || !this.mesSeleccionado || !this.anioSeleccionado) {
      return 'Todos los periodos';
    }
    const mesObj = this.listaMeses.find(m => m.value === this.mesSeleccionado);
    return `${mesObj?.nombreCompleto || ''} ${this.anioSeleccionado}`;
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

  cargarCargasCompras(): void {
    this.cargando = true;
    this.mensajeError = null;
    this.loadingService.show();
    this.cdr.detectChanges();

    this.operacionesService.listarCargas(this.ruc, 'Compras', this.periodoSeleccionado, 1, 50).subscribe({
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
        this.mensajeError = 'No se pudo cargar el historial de compras.';
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPeriodo(): void {
    this.cargarCargasCompras();
  }

  irNuevaCarga(): void {
    this.router.navigate(['/home/contabilidad/empresa', this.ruc, 'compras', 'nueva']);
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
    this.router.navigate(['/home/contabilidad/empresa', this.ruc, 'compras', carga.idCarga]);
  }
}
