import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { VentasWorkspaceService } from '../../../services/ventas-workspace.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';

@Component({
  selector: 'app-datos-empresa-nueva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './datos-empresa-nueva.component.html',
  styleUrl: './datos-empresa-nueva.component.css'
})
export class DatosEmpresaNuevaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaContext = inject(EmpresaContextService);
  private workspaceService = inject(VentasWorkspaceService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  idEmpresa: string = '';
  archivoSeleccionado: File | null = null;
  cargando: boolean = false;

  // Selector de periodo (popup mes/año, patrón existente)
  mostrarSelector: boolean = false;
  anioSelector: number = new Date().getFullYear();
  mesSeleccionado: number | null = null;
  anioSeleccionado: number | null = null;
  periodoSeleccionado: string = '';

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
    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
    });
    const max = this.obtenerMesAnterior();
    this.anioSelector = max.anio;
  }

  get nombreEmpresa(): string {
    const empresa = this.empresaContext.empresa();
    return empresa?.razonSocial || this.idEmpresa;
  }

  // --------------------------------------------------------------------------
  // Selector de periodo
  // --------------------------------------------------------------------------

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

  navegarAnioSelector(delta: number): void {
    const max = this.obtenerMesAnterior();
    const nuevoAnio = this.anioSelector + delta;
    if (nuevoAnio >= 2000 && nuevoAnio <= max.anio) {
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
    this.cdr.detectChanges();
  }

  mesBloqueado(valor: number): boolean {
    const max = this.obtenerMesAnterior();
    return this.anioSelector > max.anio || (this.anioSelector === max.anio && valor > max.mes);
  }

  anioAnteriorHabilitado(): boolean {
    return this.anioSelector > 2000;
  }

  anioSiguienteHabilitado(): boolean {
    return this.anioSelector < this.obtenerMesAnterior().anio;
  }

  get etiquetaPeriodo(): string {
    if (!this.periodoSeleccionado || !this.mesSeleccionado) return 'Seleccionar periodo';
    const mesObj = this.listaMeses.find(m => m.value === this.mesSeleccionado);
    return `${mesObj?.nombreCompleto || ''} ${this.anioSeleccionado}`;
  }

  // --------------------------------------------------------------------------
  // Archivo
  // --------------------------------------------------------------------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      this.modalService.open({
        type: 'warning',
        title: 'Formato no permitido',
        message: 'Solo se aceptan archivos .xlsx o .csv generados según la plantilla del sistema.'
      });
      input.value = '';
      return;
    }
    this.archivoSeleccionado = file;
    this.cdr.detectChanges();
  }

  removerArchivo(): void {
    this.archivoSeleccionado = null;
    const input = document.getElementById('archivoEmpresaInput') as HTMLInputElement | null;
    if (input) input.value = '';
    this.cdr.detectChanges();
  }

  descargarPlantilla(): void {
    const cabecera = 'Tipo CP;Serie;Número;Fecha Emisión;Tipo Doc;N° Doc;Razón Social;Base Imponible;IGV;Total;Moneda';
    const ejemplos = [
      '01;F001;00000001;2026-07-05;6;20512345678;COMERCIAL ANDINA S.A.C.;5000.00;900.00;5900.00;PEN',
      '03;B001;00000008;2026-07-18;1;08123456;PEREZ LOPEZ, JUAN CARLOS;150.00;27.00;177.00;PEN',
      '07;F001;00000025;2026-07-24;6;20123456789;FARMACIA CENTRAL S.A.C.;-1000.00;-180.00;-1180.00;PEN'
    ];
    const csv = '\uFEFF' + [cabecera, ...ejemplos].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_datos_empresa.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------------------
  // Carga
  // --------------------------------------------------------------------------

  async ejecutarCarga(): Promise<void> {
    if (!this.archivoSeleccionado || !this.periodoSeleccionado) return;

    this.cargando = true;
    this.cdr.detectChanges();
    this.workspaceService.cargarArchivoEmpresa(this.periodoSeleccionado, this.archivoSeleccionado).subscribe({
      next: async (res) => {
        this.cargando = false;
        this.loadingService.hide();
        await this.modalService.open({
          type: 'info',
          title: 'Carga Completada',
          message: `${res.mensaje} Revisa las observaciones y corrige los datos si es necesario.`,
          confirmText: 'Ir a los datos'
        });
        this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'empresa', res.idCargaEmpresa]);
      },
      error: async (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        await this.modalService.open({
          type: 'error',
          title: 'Error al Cargar',
          message: err?.message || 'No se pudo procesar el archivo.',
          confirmText: 'Volver'
        });
      }
    });
  }
}
