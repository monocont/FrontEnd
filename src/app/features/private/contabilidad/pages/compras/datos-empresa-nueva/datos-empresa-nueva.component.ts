import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import { OperacionesService } from '../../../services/operaciones.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-datos-empresa-nueva-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './datos-empresa-nueva.component.html',
  styleUrl: './datos-empresa-nueva.component.css'
})
export class DatosEmpresaNuevaComprasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaContext = inject(EmpresaContextService);
  private empresaService = inject(EmpresaService);
  private operacionesService = inject(OperacionesService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  idEmpresa: string = '';
  ruc: string = '';
  empresa: Empresa | null = null;

  periodo: string = '';
  archivoSeleccionado: File | null = null;
  nombreArchivo: string = '';
  tamanoArchivoKB: number = 0;
  arrastrando: boolean = false;
  procesando: boolean = false;

  // Selector de periodo (popup mes/año calendario interactivo)
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
    const max = this.obtenerMesAnterior();
    this.anioSelector = max.anio;

    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      this.cargarDatosEmpresa();
    });
  }

  get nombreEmpresa(): string {
    const empresa = this.empresaContext.empresa();
    return empresa?.razonSocial || this.nombreEmpresaLocal || this.idEmpresa;
  }

  private nombreEmpresaLocal: string = '';

  cargarDatosEmpresa(): void {
    const delContexto = this.empresaContext.empresa();
    if (delContexto && delContexto.idEmpresa === this.idEmpresa) {
      this.empresa = delContexto;
      this.nombreEmpresaLocal = delContexto.razonSocial;
      this.ruc = delContexto.ruc || '';
    }

    this.empresaService.obtenerPorId(this.idEmpresa).subscribe({
      next: (emp) => {
        if (emp) {
          this.empresa = emp;
          this.nombreEmpresaLocal = emp.razonSocial;
          this.ruc = emp.ruc || '';
          this.cdr.detectChanges();
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // Selector de periodo tipo calendario
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
    this.periodo = this.periodoSeleccionado;
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
    const max = this.obtenerMesAnterior();
    return this.anioSelector < max.anio;
  }

  get etiquetaPeriodo(): string {
    if (!this.mesSeleccionado || !this.anioSeleccionado) return 'Seleccionar periodo';
    const mesObj = this.listaMeses.find(m => m.value === this.mesSeleccionado);
    return `${mesObj?.nombreCompleto || ''} ${this.anioSeleccionado}`;
  }

  // --------------------------------------------------------------------------
  // Manejo de archivo y Drag & Drop
  // --------------------------------------------------------------------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.asignarArchivo(input.files[0]);
    }
  }

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
      this.asignarArchivo(event.dataTransfer.files[0]);
    }
  }

  asignarArchivo(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls' && extension !== 'csv') {
      this.modalService.open({
        type: 'error',
        title: 'Formato no soportado',
        message: 'Solo se permiten archivos en formato XLSX, XLS o CSV.'
      });
      return;
    }
    this.archivoSeleccionado = file;
    this.nombreArchivo = file.name;
    this.tamanoArchivoKB = Math.round(file.size / 1024);
    this.cdr.detectChanges();
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
    this.nombreArchivo = '';
    this.tamanoArchivoKB = 0;
    const input = document.getElementById('archivoEmpresaInput') as HTMLInputElement | null;
    if (input) input.value = '';
    this.cdr.detectChanges();
  }

  descargarPlantilla(): void {
    // 27 Cabeceras ordenadas según formato completo RCE del archivo adjunto y con nomenclatura estándar del sistema
    const cabeceras = [
      'FECHA EMISION',
      'FECHA VCTO',
      'TIPO CP',
      'SERIE',
      'AÑO DUA',
      'NUMERO',
      'TIPO DOC',
      'RUC / DOC PROVEEDOR',
      'RAZON SOCIAL PROVEEDOR',
      'BASE IMPONIBLE GRAVADA',
      'IGV / IPM',
      'BI OPERACIONES MIXTAS',
      'IGV OPERACIONES MIXTAS',
      'BI SIN CREDITO FISCAL',
      'IGV SIN CREDITO FISCAL',
      'NO GRAVADAS',
      'ISC',
      'OTROS TRIBUTOS Y CARGOS',
      'TOTAL CP',
      'COMPROBANTE NO DOMICILIADO',
      'NUMERO DETRACCION',
      'FECHA DETRACCION',
      'TIPO CAMBIO',
      'FECHA EMISION DOC MODIFICADO',
      'TIPO CP MODIFICADO',
      'SERIE CP MODIFICADO',
      'NUMERO CP MODIFICADO'
    ];

    // Filas de ejemplo con datos tributarios y preservación de formato
    const filasEjemplo = [
      [
        '2026-07-01',
        '2026-07-01',
        '01',
        'FV01',
        '',
        '00007354',
        '6',
        '20546872654',
        'PCSOFT TECNOLOGIA SOCIEDAD ANONIMA CERRADA',
        694.58,
        125.02,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        819.60,
        '',
        '',
        '',
        3.415,
        '',
        '',
        '',
        ''
      ],
      [
        '2026-07-01',
        '2026-07-31',
        '01',
        'F009',
        '',
        '00637020',
        '6',
        '20123053037',
        'COMPUDISKETT S R L',
        5722.75,
        1030.10,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        6752.86,
        '',
        '',
        '',
        3.415,
        '',
        '',
        '',
        ''
      ],
      [
        '2026-07-01',
        '2026-07-31',
        '01',
        'F016',
        '',
        '00005954',
        '6',
        '20474136991',
        'MACRO WORK S.A.C.',
        5473.56,
        985.26,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        6458.82,
        '',
        '',
        '',
        3.415,
        '',
        '',
        '',
        ''
      ],
      [
        '2026-07-01',
        '2026-07-01',
        '01',
        'FC01',
        '',
        '00623660',
        '6',
        '20100047218',
        'BANCO DE CREDITO DEL PERU',
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        153.50,
        0.00,
        0.00,
        153.50,
        '',
        '',
        '',
        1.000,
        '',
        '',
        '',
        ''
      ],
      [
        '2026-07-01',
        '2026-07-01',
        '01',
        'FN01',
        '',
        '47963079',
        '6',
        '20100047218',
        'BANCO DE CREDITO DEL PERU',
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        4.30,
        0.00,
        0.00,
        4.30,
        '',
        '',
        '',
        1.000,
        '',
        '',
        '',
        ''
      ],
      [
        '2026-07-05',
        '',
        '07',
        'FC01',
        '',
        '00000042',
        '6',
        '20546872654',
        'PCSOFT TECNOLOGIA SOCIEDAD ANONIMA CERRADA',
        -100.00,
        -18.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        -118.00,
        '',
        '',
        '',
        3.415,
        '2026-07-01',
        '01',
        'FV01',
        '00007354'
      ]
    ];

    const data = [cabeceras, ...filasEjemplo];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ancho sugerido para cada una de las 27 columnas
    ws['!cols'] = [
      { wch: 15 }, // 0: FECHA EMISION
      { wch: 15 }, // 1: FECHA VCTO
      { wch: 10 }, // 2: TIPO CP
      { wch: 10 }, // 3: SERIE
      { wch: 10 }, // 4: AÑO DUA
      { wch: 14 }, // 5: NUMERO
      { wch: 10 }, // 6: TIPO DOC
      { wch: 22 }, // 7: RUC / DOC PROVEEDOR
      { wch: 38 }, // 8: RAZON SOCIAL PROVEEDOR
      { wch: 22 }, // 9: BASE IMPONIBLE GRAVADA
      { wch: 14 }, // 10: IGV / IPM
      { wch: 22 }, // 11: BI OPERACIONES MIXTAS
      { wch: 22 }, // 12: IGV OPERACIONES MIXTAS
      { wch: 22 }, // 13: BI SIN CREDITO FISCAL
      { wch: 22 }, // 14: IGV SIN CREDITO FISCAL
      { wch: 14 }, // 15: NO GRAVADAS
      { wch: 12 }, // 16: ISC
      { wch: 24 }, // 17: OTROS TRIBUTOS Y CARGOS
      { wch: 16 }, // 18: TOTAL CP
      { wch: 28 }, // 19: COMPROBANTE NO DOMICILIADO
      { wch: 20 }, // 20: NUMERO DETRACCION
      { wch: 18 }, // 21: FECHA DETRACCION
      { wch: 12 }, // 22: TIPO CAMBIO
      { wch: 28 }, // 23: FECHA EMISION DOC MODIFICADO
      { wch: 20 }, // 24: TIPO CP MODIFICADO
      { wch: 20 }, // 25: SERIE CP MODIFICADO
      { wch: 22 }  // 26: NUMERO CP MODIFICADO
    ];

    // Formatear columnas de códigos/texto como texto explícito (@) para preservar ceros a la izquierda
    const columnasTexto = [2, 3, 4, 5, 6, 7, 19, 20, 24, 25, 26];
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
    ws['!ref'] = 'A1:AA1000';

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras_Empresa');
    XLSX.writeFile(wb, 'plantilla_compras_empresa.xlsx');
  }

  // --------------------------------------------------------------------------
  // Carga
  // --------------------------------------------------------------------------

  async procesarCarga(): Promise<void> {
    if (!this.archivoSeleccionado || !this.periodoSeleccionado) {
      this.modalService.open({
        type: 'warning',
        title: 'Datos requeridos',
        message: 'Por favor, selecciona el periodo y un archivo para procesar.'
      });
      return;
    }

    this.procesando = true;
    this.loadingService.show();
    this.cdr.detectChanges();

    this.operacionesService.cargarComprasEmpresa(this.ruc, this.periodoSeleccionado, this.archivoSeleccionado).subscribe({
      next: async (res) => {
        this.procesando = false;
        this.loadingService.hide();
        await this.modalService.open({
          type: 'info',
          title: 'Carga Completada',
          message: `${res.observaciones || 'Carga procesada correctamente.'} Puedes revisar y ajustar los comprobantes en la siguiente pantalla.`,
          confirmText: 'Ir a los datos'
        });
        this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'compras', 'empresa', res.idCarga]);
      },
      error: async (err) => {
        this.procesando = false;
        this.loadingService.hide();
        this.cdr.detectChanges();
        await this.modalService.open({
          type: 'error',
          title: 'Error al Cargar',
          message: err?.error?.message || err?.message || 'No se pudo procesar el archivo de compras de la empresa.',
          confirmText: 'Volver'
        });
      }
    });
  }
}
