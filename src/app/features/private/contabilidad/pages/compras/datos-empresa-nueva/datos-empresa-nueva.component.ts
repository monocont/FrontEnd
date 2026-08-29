import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaContextService } from '../../../../../../core/services/empresa-context.service';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import { ComprasWorkspaceService, CompraEmpresaItem, ObservacionEmpresaItem } from '../../../services/compras-workspace.service';
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
  private workspaceService = inject(ComprasWorkspaceService);
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
    return this.anioSelector < this.obtenerMesAnterior().anio;
  }

  get etiquetaPeriodo(): string {
    if (!this.periodoSeleccionado || !this.mesSeleccionado) return 'Seleccionar periodo';
    const mesObj = this.listaMeses.find(m => m.value === this.mesSeleccionado);
    return `${mesObj?.nombreCompleto || ''} ${this.anioSeleccionado}`;
  }

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
        message: 'Solo se permiten archivos en formato XLSX o CSV.'
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
      'NRO DOC PROVEEDOR',
      'RAZON SOCIAL',
      'BASE IMPONIBLE',
      'IGV',
      'TOTAL CP',
      'MONEDA'
    ];

    // 2 filas de ejemplo con ceros a la izquierda preservados
    const filasEjemplo = [
      [
        '2026-05-02',
        '01',
        'F001',
        '00215',
        '6',
        '20100070970',
        'SUPERMERCADOS PERUANOS S.A.',
        1250.00,
        225.00,
        1475.00,
        'PEN'
      ],
      [
        '2026-05-05',
        '01',
        'F002',
        '000450',
        '6',
        '20504012345',
        'DISTRIBUIDORA LIMA NORTE S.A.C.',
        3400.00,
        612.00,
        4012.00,
        'PEN'
      ]
    ];

    const data = [cabeceras, ...filasEjemplo];
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 18 }, // FECHA EMISION
      { wch: 12 }, // TIPO CP
      { wch: 10 }, // SERIE
      { wch: 16 }, // NUMERO
      { wch: 12 }, // TIPO DOC
      { wch: 22 }, // NRO DOC PROVEEDOR
      { wch: 38 }, // RAZON SOCIAL
      { wch: 18 }, // BASE IMPONIBLE
      { wch: 14 }, // IGV
      { wch: 16 }, // TOTAL CP
      { wch: 12 }  // MONEDA
    ];

    // Formatear columnas como texto explícito (@) para preservar ceros a la izquierda (ej. 00215, 08123456, F001)
    const columnasTexto = [1, 2, 3, 4, 5]; // B: TIPO CP, C: SERIE, D: NUMERO, E: TIPO DOC, F: NRO DOC PROVEEDOR
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
    XLSX.utils.book_append_sheet(wb, ws, 'Compras_Empresa');
    XLSX.writeFile(wb, 'plantilla_compras_empresa.xlsx');
  }

  async procesarCarga(): Promise<void> {
    if (!this.archivoSeleccionado) {
      this.modalService.open({
        type: 'warning',
        title: 'Archivo requerido',
        message: 'Por favor, selecciona un archivo para procesar.'
      });
      return;
    }

    this.procesando = true;
    this.loadingService.show();

    // Generar registros simulados de compras
    const mockRegistros: CompraEmpresaItem[] = [
      {
        idCompraEmpresa: 'c-new-' + Date.now() + '-1',
        numeroLinea: 1,
        codigoTipoCp: '01',
        serie: 'F001',
        numero: '10452',
        fechaEmision: `02/${String(this.mesSeleccionado).padStart(2, '0')}/${this.anioSeleccionado}`,
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20100070970',
        razonSocial: 'SUPERMERCADOS PERUANOS S.A.',
        biGravada: 1250.00,
        igvIpm: 225.00,
        totalCp: 1475.00,
        codigoMoneda: 'PEN'
      },
      {
        idCompraEmpresa: 'c-new-' + Date.now() + '-2',
        numeroLinea: 2,
        codigoTipoCp: '01',
        serie: 'F002',
        numero: '8841',
        fechaEmision: `05/${String(this.mesSeleccionado).padStart(2, '0')}/${this.anioSeleccionado}`,
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20504012345',
        razonSocial: 'DISTRIBUIDORA LIMA NORTE S.A.C.',
        biGravada: 3400.00,
        igvIpm: 612.00,
        totalCp: 4012.00,
        codigoMoneda: 'PEN'
      },
      {
        idCompraEmpresa: 'c-new-' + Date.now() + '-3',
        numeroLinea: 3,
        codigoTipoCp: '03',
        serie: 'B001',
        numero: '5012',
        fechaEmision: `10/${String(this.mesSeleccionado).padStart(2, '0')}/${this.anioSeleccionado}`,
        codigoTipoDocIdentidad: '6',
        nroDocIdentidad: '20601234567',
        razonSocial: 'SERVICIOS GRAFICOS DEL SUR E.I.R.L.',
        biGravada: 450.00,
        igvIpm: 81.00,
        totalCp: 531.00,
        codigoMoneda: 'PEN'
      }
    ];

    const mockErrores: ObservacionEmpresaItem[] = [
      {
        numeroLinea: 3,
        tipoError: 'Formato RUC',
        campoError: 'nroDocIdentidad',
        valorLectura: '20601234567',
        mensaje: 'Se sugiere verificar dígito verificador del proveedor.',
        severidad: 'Advertencia'
      }
    ];

    this.workspaceService.crearCargaEmpresa({
      periodo: this.periodo,
      nombreArchivo: this.nombreArchivo,
      registros: mockRegistros,
      errores: mockErrores
    }).subscribe({
      next: (carga) => {
        this.procesando = false;
        this.loadingService.hide();
        this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, 'compras', 'empresa', carga.idCargaEmpresa]);
      },
      error: async (err) => {
        this.procesando = false;
        this.loadingService.hide();
        await this.modalService.open({
          type: 'error',
          title: 'Error al procesar',
          message: err?.message || 'No se pudo cargar el archivo.'
        });
      }
    });
  }
}
