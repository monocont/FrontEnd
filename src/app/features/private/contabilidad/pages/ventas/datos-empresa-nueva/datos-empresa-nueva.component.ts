import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { OperacionesService } from '../../../services/operaciones.service';
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
  private operacionesService = inject(OperacionesService);
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

  get ruc(): string {
    const empresa = this.empresaContext.empresa();
    return empresa?.ruc || '';
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
  // Archivo & Drag and Drop
  // --------------------------------------------------------------------------

  arrastrando: boolean = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.asignarArchivo(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.asignarArchivo(file);
  }

  private asignarArchivo(file: File): void {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      this.modalService.open({
        type: 'warning',
        title: 'Formato no permitido',
        message: 'Solo se aceptan archivos .xlsx, .xls o .csv generados según la plantilla del sistema.'
      });
      const input = document.getElementById('archivoEmpresaInput') as HTMLInputElement | null;
      if (input) input.value = '';
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
    // 21 Cabeceras homologadas con formato de Registro de Ventas
    const cabeceras = [
      'FECHA EMISION',
      'FECHA VCTO',
      'TIPO CP',
      'SERIE',
      'NUMERO',
      'TIPO DOC',
      'RUC / DOC CLIENTE',
      'RAZON SOCIAL CLIENTE',
      'VALOR EXPORTACION',
      'BASE IMPONIBLE',
      'EXONERADO',
      'INAFECTO',
      'ISC',
      'IGV / IPM',
      'OTROS TRIBUTOS',
      'TOTAL CP',
      'TIPO CAMBIO',
      'FECHA EMISION DOC MODIFICADO',
      'TIPO CP MODIFICADO',
      'SERIE CP MODIFICADO',
      'NUMERO CP MODIFICADO'
    ];

    // Filas de ejemplo con datos tributarios realistas y preservación de formato
    const filasEjemplo = [
      [
        '2026-05-04',
        '2026-05-30',
        '01',
        'F001',
        '00215',
        '6',
        '20504012345',
        'DISTRIBUIDORA SAN JUAN S.A.C.',
        0.00,
        5000.00,
        0.00,
        0.00,
        0.00,
        900.00,
        0.00,
        5900.00,
        1.000,
        '',
        '',
        '',
        ''
      ],
      [
        '2026-05-10',
        '2026-05-10',
        '03',
        'B001',
        '000450',
        '1',
        '08123456',
        'PEREZ LOPEZ JUAN CARLOS',
        0.00,
        250.00,
        0.00,
        0.00,
        0.00,
        45.00,
        0.00,
        295.00,
        3.750,
        '',
        '',
        '',
        ''
      ],
      [
        '2026-05-15',
        '',
        '07',
        'FC01',
        '000012',
        '6',
        '20504012345',
        'DISTRIBUIDORA SAN JUAN S.A.C.',
        0.00,
        -500.00,
        0.00,
        0.00,
        0.00,
        -90.00,
        0.00,
        -590.00,
        1.000,
        '2026-05-04',
        '01',
        'F001',
        '00215'
      ]
    ];

    const data = [cabeceras, ...filasEjemplo];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ancho de cada una de las 21 columnas
    ws['!cols'] = [
      { wch: 15 }, // 0: FECHA EMISION
      { wch: 15 }, // 1: FECHA VCTO
      { wch: 10 }, // 2: TIPO CP
      { wch: 10 }, // 3: SERIE
      { wch: 14 }, // 4: NUMERO
      { wch: 10 }, // 5: TIPO DOC
      { wch: 20 }, // 6: RUC / DOC CLIENTE
      { wch: 32 }, // 7: RAZON SOCIAL CLIENTE
      { wch: 18 }, // 8: VALOR EXPORTACION
      { wch: 16 }, // 9: BASE IMPONIBLE
      { wch: 14 }, // 10: EXONERADO
      { wch: 14 }, // 11: INAFECTO
      { wch: 12 }, // 12: ISC
      { wch: 14 }, // 13: IGV / IPM
      { wch: 16 }, // 14: OTROS TRIBUTOS
      { wch: 14 }, // 15: TOTAL CP
      { wch: 12 }, // 16: TIPO CAMBIO
      { wch: 28 }, // 17: FECHA EMISION DOC MODIFICADO
      { wch: 20 }, // 18: TIPO CP MODIFICADO
      { wch: 20 }, // 19: SERIE CP MODIFICADO
      { wch: 22 }  // 20: NUMERO CP MODIFICADO
    ];

    // Formatear columnas de texto como texto explícito (@) para preservar ceros a la izquierda
    const columnasTexto = [2, 3, 4, 5, 6, 7, 18, 19, 20];
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
    ws['!ref'] = 'A1:AC1000';

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
    this.operacionesService.cargarVentasEmpresa(this.ruc, this.periodoSeleccionado, this.archivoSeleccionado).subscribe({
      next: async (res) => {
        this.cargando = false;
        this.loadingService.hide();
        await this.modalService.open({
          type: 'info',
          title: 'Carga Completada',
          message: `${res.observaciones || 'Carga procesada correctamente.'} Revisa las observaciones y corrige los datos si es necesario.`,
          confirmText: 'Ir a los datos'
        });
        this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'ventas', 'empresa', res.idCarga]);
      },
      error: async (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        await this.modalService.open({
          type: 'error',
          title: 'Error al Cargar',
          message: err?.error?.message || err?.message || 'No se pudo procesar el archivo.',
          confirmText: 'Volver'
        });
      }
    });
  }
}
