import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { VentasWorkspaceService } from '../../../services/ventas-workspace.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';

import * as XLSX from 'xlsx';

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
    // Cabeceras en mayúsculas limpias
    const cabeceras = [
      'FECHA EMISION',
      'TIPO CP',
      'SERIE',
      'NUMERO',
      'TIPO DOC',
      'NRO DOC CLIENTE',
      'RAZON SOCIAL',
      'BASE IMPONIBLE',
      'IGV',
      'TOTAL CP',
      'MONEDA'
    ];

    // 2 filas de ejemplo con ceros a la izquierda preservados
    const filasEjemplo = [
      [
        '2026-05-04',
        '01',
        'F001',
        '00215',
        '6',
        '20504012345',
        'DEBEL INVERSIONES S.A.C.',
        5000.00,
        900.00,
        5900.00,
        'PEN'
      ],
      [
        '2026-05-10',
        '03',
        'B001',
        '000450',
        '1',
        '08123456',
        'MENDOZA BAZAN CARLOS ENRIQUE',
        250.00,
        45.00,
        295.00,
        'PEN'
      ]
    ];

    const data = [cabeceras, ...filasEjemplo];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajustar anchos de columnas
    ws['!cols'] = [
      { wch: 18 }, // FECHA EMISION
      { wch: 12 }, // TIPO CP
      { wch: 10 }, // SERIE
      { wch: 16 }, // NUMERO
      { wch: 12 }, // TIPO DOC
      { wch: 22 }, // NRO DOC CLIENTE
      { wch: 38 }, // RAZON SOCIAL
      { wch: 18 }, // BASE IMPONIBLE
      { wch: 14 }, // IGV
      { wch: 16 }, // TOTAL CP
      { wch: 12 }  // MONEDA
    ];

    // Formatear columnas como texto explícito (@) para preservar ceros a la izquierda (ej. 00215, 08123456, F001)
    const columnasTexto = [1, 2, 3, 4, 5]; // B: TIPO CP, C: SERIE, D: NUMERO, E: TIPO DOC, F: NRO DOC CLIENTE
    for (let r = 1; r <= 1000; r++) {
      for (const col of columnasTexto) {
        const cellRef = XLSX.utils.encode_cell({ r, c: col });
        if (!ws[cellRef]) {
          ws[cellRef] = { t: 's', v: '', z: '@' };
        } else {
          ws[cellRef].z = '@';
          ws[cellRef].t = 's';
        }
      }
    }
    ws['!ref'] = 'A1:K1000';

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas_Empresa');
    XLSX.writeFile(wb, 'plantilla_ventas_empresa.xlsx');
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
