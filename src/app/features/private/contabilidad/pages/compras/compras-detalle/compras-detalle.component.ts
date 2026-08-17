import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmpresaService, Empresa } from '../../../../empresa/services/empresa.service';
import {
  OperacionesService,
  CargarArchivoSunatDTO,
  ArchivoCargaItem,
  ArchivoCargaErrorItem,
  CompraItem
} from '../../../services/operaciones.service';
import {
  CatalogoSunatService,
  TipoCpCatalogo,
  TipoDocIdentidadCatalogo,
  EstadoComprobanteCatalogo
} from '../../../services/catalogo-sunat.service';
import { ModalService } from '../../../../../../shared/ui/modal/modal.service';
import { LoadingService } from '../../../../../../shared/ui/loading/loading.service';

@Component({
  selector: 'app-compras-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './compras-detalle.component.html',
  styleUrl: './compras-detalle.component.css'
})
export class ComprasDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private operacionesService = inject(OperacionesService);
  private catalogoSunatService = inject(CatalogoSunatService);
  private modalService = inject(ModalService);
  private loadingService = inject(LoadingService);
  private cdr = inject(ChangeDetectorRef);

  // Catálogos SUNAT
  tiposCp: TipoCpCatalogo[] = [];
  tiposDocIdentidad: TipoDocIdentidadCatalogo[] = [];
  estadosComprobante: EstadoComprobanteCatalogo[] = [];

  ruc: string = '';
  idCarga: string | null = null;
  esNuevaCarga: boolean = false;
  periodoParam: string = '';

  empresa: Empresa | null = null;
  carga: ArchivoCargaItem | null = null;
  compras: CompraItem[] = [];
  errores: ArchivoCargaErrorItem[] = [];
  mostrarErrores: boolean = false;

  cargando: boolean = false;
  cargandoDatos: boolean = false;
  archivoSeleccionado: File | null = null;
  mensajeError: string | null = null;
  mensajeExito: string | null = null;
  resultadoCarga: CargarArchivoSunatDTO | null = null;

  // Selector de Periodo de Carga tipo Calendario (Popup Mes / Año)
  periodoSeleccionado: string = ''; // formato "YYYYMM"
  mostrarSelectorPeriodo: boolean = false;
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

  // Filtros internos tipo Excel con soporte Multi-Columna
  filtroTexto: string = '';
  criteriosOrden: { columna: string; ascendente: boolean }[] = [
    { columna: 'fechaEmision', ascendente: true }
  ];

  totalBaseImponible: number = 0;
  totalIgv: number = 0;
  totalGeneral: number = 0;

  get comprasFiltradas(): CompraItem[] {
    let list = this.compras;
    if (this.filtroTexto) {
      const txt = this.filtroTexto.toLowerCase().trim();
      list = list.filter(
        c =>
          (c.nroDocIdentidad && c.nroDocIdentidad.toLowerCase().includes(txt)) ||
          (c.razonSocial && c.razonSocial.toLowerCase().includes(txt)) ||
          `${c.serie}-${c.numero}`.toLowerCase().includes(txt) ||
          (c.codigoTipoCp && (c.codigoTipoCp.toLowerCase().includes(txt) || this.obtenerNombreTipoCp(c.codigoTipoCp).toLowerCase().includes(txt))) ||
          (c.codigoTipoDocIdentidad && (c.codigoTipoDocIdentidad.toLowerCase().includes(txt) || this.obtenerNombreTipoDocIdentidad(c.codigoTipoDocIdentidad).toLowerCase().includes(txt))) ||
          (c.carSunat && c.carSunat.toLowerCase().includes(txt))
      );
    }

    if (this.criteriosOrden.length === 0) {
      return list;
    }

    return list.slice().sort((a: any, b: any) => {
      for (const criterio of this.criteriosOrden) {
        let valA = a[criterio.columna] ?? '';
        let valB = b[criterio.columna] ?? '';

        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          valA = valA.toString().toLowerCase();
          valB = valB.toString().toLowerCase();
          if (valA < valB) cmp = -1;
          else if (valA > valB) cmp = 1;
        }

        if (cmp !== 0) {
          return criterio.ascendente ? cmp : -cmp;
        }
      }
      return 0;
    });
  }

  ngOnInit(): void {
    this.cargarCatalogosSunat();
    const max = this.obtenerMesAnterior();
    this.anioSelector = max.anio;

    this.route.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
      this.idCarga = params.get('idCarga');
      this.esNuevaCarga = this.route.snapshot.url.some(segment => segment.path === 'nueva');

      this.route.queryParamMap.subscribe(q => {
        this.periodoParam = q.get('periodo') || '';
        if (this.periodoParam && this.periodoParam.length === 6) {
          this.setPeriodoDesdeParam(this.periodoParam);
        }
      });

      if (this.ruc) {
        this.cargarDatosEmpresa();
        if (this.idCarga && !this.esNuevaCarga) {
          this.cargarDetalleExistente(this.idCarga);
        }
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

  setPeriodoDesdeParam(p: string): void {
    this.periodoSeleccionado = p;
    this.anioSeleccionado = parseInt(p.substring(0, 4), 10);
    this.mesSeleccionado = parseInt(p.substring(4, 6), 10);
    this.anioSelector = this.anioSeleccionado;
  }

  toggleSelectorPeriodo(): void {
    if (!this.mostrarSelectorPeriodo) {
      const max = this.obtenerMesAnterior();
      this.anioSelector = this.anioSeleccionado || max.anio;
    }
    this.mostrarSelectorPeriodo = !this.mostrarSelectorPeriodo;
  }

  cerrarSelectorPeriodo(): void {
    this.mostrarSelectorPeriodo = false;
  }

  navegarAnioPeriodo(delta: number): void {
    const anioMin = 2000;
    const max = this.obtenerMesAnterior();
    const nuevoAnio = this.anioSelector + delta;
    if (nuevoAnio >= anioMin && nuevoAnio <= max.anio) {
      this.anioSelector = nuevoAnio;
    }
  }

  seleccionarMesPeriodo(mes: number): void {
    if (this.mesPeriodoBloqueado(mes)) return;

    this.mesSeleccionado = mes;
    this.anioSeleccionado = this.anioSelector;
    const mesStr = mes.toString().padStart(2, '0');
    this.periodoSeleccionado = `${this.anioSeleccionado}${mesStr}`;
    this.mostrarSelectorPeriodo = false;
    this.cdr.detectChanges();
  }

  mesPeriodoBloqueado(valor: number): boolean {
    const max = this.obtenerMesAnterior();
    return (
      this.anioSelector > max.anio ||
      (this.anioSelector === max.anio && valor > max.mes)
    );
  }

  anioPeriodoAnteriorHabilitado(): boolean {
    return this.anioSelector > 2000;
  }

  anioPeriodoSiguienteHabilitado(): boolean {
    const max = this.obtenerMesAnterior();
    return this.anioSelector < max.anio;
  }

  get etiquetaBotonPeriodoCarga(): string {
    if (!this.periodoSeleccionado || !this.mesSeleccionado || !this.anioSeleccionado) {
      return 'Seleccione periodo de carga';
    }
    const mesObj = this.listaMeses.find(m => m.value === this.mesSeleccionado);
    return `${mesObj?.nombreCompleto || ''} ${this.anioSeleccionado} (${this.periodoSeleccionado})`;
  }

  cargarCatalogosSunat(): void {
    // 1. Catálogo Tipo Comprobante de Pago (catalogo.tipo_cp)
    this.catalogoSunatService.obtenerTiposCp().subscribe({
      next: (tipos) => {
        this.tiposCp = tipos || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar catálogo tipo_cp:', err);
      }
    });

    // 2. Catálogo Tipo Documento de Identidad (catalogo.tipo_doc_identidad)
    this.catalogoSunatService.obtenerTiposDocIdentidad().subscribe({
      next: (docs) => {
        this.tiposDocIdentidad = docs || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar catálogo tipo_doc_identidad:', err);
      }
    });

    // 3. Catálogo Estado de Comprobante (catalogo.estado_comprobante)
    this.catalogoSunatService.obtenerEstadosComprobante().subscribe({
      next: (estados) => {
        this.estadosComprobante = estados || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar catálogo estado_comprobante:', err);
      }
    });
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

  cargarDetalleExistente(idCarga: string): void {
    this.cargandoDatos = true;
    this.mensajeError = null;
    this.cdr.detectChanges();

    this.operacionesService.obtenerCargaPorId(idCarga).subscribe({
      next: (c: ArchivoCargaItem) => {
        this.carga = c;
        this.cdr.detectChanges();
      }
    });

    this.operacionesService.obtenerErroresCarga(idCarga).subscribe({
      next: (errs: ArchivoCargaErrorItem[]) => {
        this.errores = errs || [];
        this.cdr.detectChanges();
      }
    });

    this.operacionesService.listarComprasPorCarga(idCarga).subscribe({
      next: (c: CompraItem[]) => {
        this.cargandoDatos = false;
        this.compras = c || [];
        this.calcularTotales(this.compras);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoDatos = false;
        this.mensajeError = 'No se pudieron recuperar los comprobantes de compras.';
        this.cdr.detectChanges();
      }
    });
  }

  ordenarPor(columna: string): void {
    const index = this.criteriosOrden.findIndex(c => c.columna === columna);

    if (index >= 0) {
      if (this.criteriosOrden[index].ascendente) {
        // 2do clic en esta columna: pasa a descendente
        this.criteriosOrden[index].ascendente = false;
      } else {
        // 3er clic en esta columna: se quita del ordenamiento
        this.criteriosOrden.splice(index, 1);
      }
    } else {
      // 1er clic en esta columna: se agrega con orden ascendente conservando las demás
      this.criteriosOrden.push({ columna, ascendente: true });
    }
  }

  obtenerEstadoOrden(columna: string): { activo: boolean; ascendente: boolean; ordenIndice: number } {
    const idx = this.criteriosOrden.findIndex(c => c.columna === columna);
    if (idx >= 0) {
      return {
        activo: true,
        ascendente: this.criteriosOrden[idx].ascendente,
        ordenIndice: this.criteriosOrden.length > 1 ? idx + 1 : 0
      };
    }
    return { activo: false, ascendente: true, ordenIndice: 0 };
  }

  obtenerNombreTipoCp(codigo: string | null | undefined): string {
    if (!codigo) return '-';
    const clean = codigo.toString().trim().padStart(2, '0');
    const encontrado = this.tiposCp.find(t => t.codigo.trim().padStart(2, '0') === clean);
    return encontrado ? encontrado.nombre : codigo;
  }

  obtenerNombreTipoDocIdentidad(codigo: string | null | undefined): string {
    if (!codigo) return '-';
    const clean = codigo.toString().trim();
    const encontrado = this.tiposDocIdentidad.find(d => d.codigo.trim() === clean);
    return encontrado ? encontrado.nombre : codigo;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'txt' && ext !== 'csv') {
        this.mensajeError = 'Formato no soportado. Seleccione un archivo .txt o .csv';
        this.modalService.open({
          type: 'warning',
          title: 'Formato no válido',
          message: 'El archivo seleccionado no es válido. Solo se admiten archivos estructurados SUNAT RCE en formato .txt o .csv.'
        });
        this.archivoSeleccionado = null;
        input.value = '';
        return;
      }
      this.archivoSeleccionado = file;
      this.mensajeError = null;
    }
  }

  removerArchivoSeleccionado(): void {
    this.archivoSeleccionado = null;
    const input = document.getElementById('fileCompra') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  ejecutarCarga(): void {
    if (!this.archivoSeleccionado) {
      this.modalService.open({
        type: 'warning',
        title: 'Archivo Requerido',
        message: 'Por favor seleccione un archivo oficial SUNAT RCE (.txt o .csv) para iniciar la carga.'
      });
      return;
    }

    const periodo = this.periodoSeleccionado || this.periodoParam || (this.carga ? this.carga.periodo : '');
    if (!periodo) {
      this.modalService.open({
        type: 'warning',
        title: 'Periodo No Seleccionado',
        message: 'Por favor seleccione el periodo contable (Año y Mes) para la carga.'
      });
      return;
    }

    this.cargando = true;
    this.mensajeError = null;
    this.mensajeExito = null;
    this.loadingService.show();
    this.cdr.detectChanges();

    this.operacionesService.cargarCompras(this.ruc, periodo, this.archivoSeleccionado).subscribe({
      next: (res: CargarArchivoSunatDTO) => {
        this.cargando = false;
        this.loadingService.hide();
        this.resultadoCarga = res;
        if (res.estado === 'Duplicado') {
          this.mensajeError = `El archivo ya fue cargado anteriormente (${res.observaciones || ''}).`;
          this.modalService.open({
            type: 'alert',
            title: 'Archivo Duplicado',
            message: `El archivo ya fue registrado anteriormente (${res.observaciones || ''}).`
          });
        } else {
          this.mensajeExito = `Carga exitosa: ${res.numRegistrosValidos} válidos de ${res.numRegistros} registros leídos.`;
          this.modalService.open({
            type: 'info',
            title: 'Carga Completada con Éxito',
            message: `Se procesaron correctamente ${res.numRegistrosValidos} de ${res.numRegistros} comprobantes de compras para el periodo ${periodo}.`
          });
        }
        this.archivoSeleccionado = null;
        if (res.idCarga) {
          this.idCarga = res.idCarga;
          this.esNuevaCarga = false;
          this.router.navigate(['/home/contabilidad/empresa', this.ruc, 'compras', res.idCarga]);
          this.cargarDetalleExistente(res.idCarga);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.cargando = false;
        this.loadingService.hide();

        let msg = '';
        const errors = err.error?.errors || err.error?.Errors;
        if (Array.isArray(errors) && errors.length > 0) {
          msg = errors.join('\n');
        } else if (typeof errors === 'string') {
          msg = errors;
        } else {
          msg = err.error?.message || err.error?.detail || err.error?.title || (typeof err.error === 'string' ? err.error : err.message) || 'Error en el servidor al procesar la carga.';
        }

        this.modalService.open({
          type: 'error',
          title: 'Error en la Carga',
          message: msg
        });
        this.cdr.detectChanges();
      }
    });
  }

  exportarCSV(): void {
    if (this.compras.length === 0) return;

    const encabezados = [
      'CAR SUNAT',
      'Fecha Emisión',
      'Tipo CP',
      'Serie',
      'Número',
      'Tipo Doc',
      'RUC Proveedor',
      'Razón Social',
      'Base Imponible DG',
      'IGV DG',
      'Total CP',
      'Moneda',
      'Tipo Cambio',
      'Estado'
    ];

    const filas = this.comprasFiltradas.map(c => [
      `"${c.carSunat || ''}"`,
      `"${c.fechaEmision ? c.fechaEmision.substring(0, 10) : ''}"`,
      `"${c.codigoTipoCp || ''}"`,
      `"${c.serie || ''}"`,
      `"${c.numero || ''}"`,
      `"${c.codigoTipoDocIdentidad || ''}"`,
      `"${c.nroDocIdentidad || ''}"`,
      `"${(c.razonSocial || '').replace(/"/g, '""')}"`,
      c.biGravadoDg ?? 0,
      c.igvIpmDg ?? 0,
      c.totalCp ?? 0,
      `"${c.codigoMoneda || 'PEN'}"`,
      c.tipoCambio ?? 1,
      `"${c.codigoEstadoComprobante || 'Activo'}"`
    ]);

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Compras_${this.ruc}_${this.carga?.periodo || this.periodoParam || 'Periodo'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private calcularTotales(compras: CompraItem[]): void {
    this.totalBaseImponible = compras.reduce((acc, c) => acc + (c.biGravadoDg || 0), 0);
    this.totalIgv = compras.reduce((acc, c) => acc + (c.igvIpmDg || 0), 0);
    this.totalGeneral = compras.reduce((acc, c) => acc + (c.totalCp || 0), 0);
  }
}
