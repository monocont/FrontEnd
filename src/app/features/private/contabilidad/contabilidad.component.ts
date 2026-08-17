import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaService, Empresa } from '../empresa/services/empresa.service';
import {
  OperacionesService,
  CargarArchivoSunatDTO,
  ArchivoCargaItem,
  ArchivoCargaErrorItem,
  CompraItem,
  VentaItem,
} from './services/operaciones.service';

type TabOperacion = 'ventas' | 'compras' | 'historial';

@Component({
  selector: 'app-contabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contabilidad.component.html',
  styleUrl: './contabilidad.component.css',
})
export class ContabilidadComponent implements OnInit {
  private empresaService = inject(EmpresaService);
  private operacionesService = inject(OperacionesService);

  // Estados de datos
  empresas: Empresa[] = [];
  empresaSeleccionada: Empresa | null = null;
  rucSeleccionado: string = '';
  
  // Periodo YYYYMM (por defecto el actual)
  anioSeleccionado: number = new Date().getFullYear();
  mesSeleccionado: number = new Date().getMonth() + 1;

  // Pestañas
  tabActiva: TabOperacion = 'ventas';

  // Subida de archivos
  archivoSeleccionado: File | null = null;
  cargando: boolean = false;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  resultadoCarga: CargarArchivoSunatDTO | null = null;

  // Historial de Cargas
  historialCargas: ArchivoCargaItem[] = [];
  totalCargas: number = 0;
  paginaHistorial: number = 1;
  tamanoPagina: number = 10;
  cargandoHistorial: boolean = false;

  // Detalle de comprobantes de la carga seleccionada
  cargaActiva: ArchivoCargaItem | null = null;
  comprasDetalle: CompraItem[] = [];
  ventasDetalle: VentaItem[] = [];
  erroresDetalle: ArchivoCargaErrorItem[] = [];
  cargandoDetalle: boolean = false;

  // Resumen estadístico
  totalComprobantesValidos: number = 0;
  totalBaseImponible: number = 0;
  totalIgv: number = 0;
  totalGeneral: number = 0;

  get periodoCalculado(): string {
    const mesStr = this.mesSeleccionado.toString().padStart(2, '0');
    return `${this.anioSeleccionado}${mesStr}`;
  }

  ngOnInit(): void {
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.empresaService.listar({ pageSize: 50 }).subscribe({
      next: (res) => {
        this.empresas = res.items || [];
        if (this.empresas.length > 0) {
          this.seleccionarEmpresa(this.empresas[0].ruc);
        }
      },
      error: () => {
        this.mensajeError = 'No se pudieron cargar las empresas registradas.';
      },
    });
  }

  seleccionarEmpresa(ruc: string): void {
    this.rucSeleccionado = ruc;
    this.empresaSeleccionada = this.empresas.find((e) => e.ruc === ruc) || null;
    this.limpiarResultado();
    this.cargarHistorial();
  }

  cambiarPeriodo(): void {
    this.limpiarResultado();
    this.cargarHistorial();
  }

  cambiarTab(tab: TabOperacion): void {
    this.tabActiva = tab;
    this.limpiarResultado();
    if (tab === 'historial') {
      this.cargarHistorial();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'txt' && ext !== 'csv') {
        this.mensajeError = 'Formato inválido. Solo se admiten archivos .txt o .csv';
        this.archivoSeleccionado = null;
        input.value = '';
        return;
      }
      this.archivoSeleccionado = file;
      this.mensajeError = null;
    }
  }

  ejecutarCarga(): void {
    if (!this.rucSeleccionado) {
      this.mensajeError = 'Seleccione una empresa antes de cargar.';
      return;
    }
    if (!this.archivoSeleccionado) {
      this.mensajeError = 'Seleccione un archivo .txt o .csv para procesar.';
      return;
    }

    this.cargando = true;
    this.mensajeError = null;
    this.mensajeExito = null;
    this.resultadoCarga = null;

    const request$ =
      this.tabActiva === 'ventas'
        ? this.operacionesService.cargarVentas(this.rucSeleccionado, this.periodoCalculado, this.archivoSeleccionado)
        : this.operacionesService.cargarCompras(this.rucSeleccionado, this.periodoCalculado, this.archivoSeleccionado);

    request$.subscribe({
      next: (res) => {
        this.cargando = false;
        this.resultadoCarga = res;
        if (res.estado === 'Duplicado') {
          this.mensajeError = `El archivo ya fue cargado anteriormente (${res.observaciones || ''}).`;
        } else {
          this.mensajeExito = `Carga completada: ${res.numRegistrosValidos} válidos de ${res.numRegistros} registros totales.`;
        }
        this.archivoSeleccionado = null;
        this.cargarHistorial();
        if (res.idCarga) {
          this.verDetalleCargaPorId(res.idCarga, this.tabActiva === 'ventas' ? 'Ventas' : 'Compras');
        }
      },
      error: (err) => {
        this.cargando = false;
        const msg = err.error?.message || err.error?.title || err.message || 'Error al procesar la carga.';
        this.mensajeError = `Error en la carga: ${msg}`;
      },
    });
  }

  cargarHistorial(): void {
    if (!this.rucSeleccionado) return;
    this.cargandoHistorial = true;

    this.operacionesService
      .listarCargas(
        this.rucSeleccionado,
        this.tabActiva === 'ventas' ? 'Ventas' : 'Compras',
        undefined,
        this.paginaHistorial,
        this.tamanoPagina
      )
      .subscribe({
        next: (res) => {
          this.cargandoHistorial = false;
          this.historialCargas = res || [];
          this.totalCargas = this.historialCargas.length;
        },
        error: () => {
          this.cargandoHistorial = false;
        },
      });
  }

  verDetalleCarga(carga: ArchivoCargaItem): void {
    this.cargaActiva = carga;
    this.verDetalleCargaPorId(carga.idCarga, carga.tipoArchivo);
  }

  verDetalleCargaPorId(idCarga: string, tipoArchivo: string): void {
    this.cargandoDetalle = true;
    this.erroresDetalle = [];
    this.comprasDetalle = [];
    this.ventasDetalle = [];

    // Errores y advertencias
    this.operacionesService.obtenerErroresCarga(idCarga).subscribe({
      next: (errores) => {
        this.erroresDetalle = errores || [];
      },
    });

    if (tipoArchivo === 'Ventas') {
      this.operacionesService.listarVentasPorCarga(idCarga).subscribe({
        next: (res) => {
          this.cargandoDetalle = false;
          this.ventasDetalle = res || [];
          this.calcularTotalesVentas(this.ventasDetalle);
        },
        error: () => (this.cargandoDetalle = false),
      });
    } else {
      this.operacionesService.listarComprasPorCarga(idCarga).subscribe({
        next: (res) => {
          this.cargandoDetalle = false;
          this.comprasDetalle = res || [];
          this.calcularTotalesCompras(this.comprasDetalle);
        },
        error: () => (this.cargandoDetalle = false),
      });
    }
  }

  private calcularTotalesVentas(ventas: VentaItem[]): void {
    this.totalComprobantesValidos = ventas.length;
    this.totalBaseImponible = ventas.reduce((acc, v) => acc + (v.biGravada || 0), 0);
    this.totalIgv = ventas.reduce((acc, v) => acc + (v.igvIpm || 0), 0);
    this.totalGeneral = ventas.reduce((acc, v) => acc + (v.totalCp || 0), 0);
  }

  private calcularTotalesCompras(compras: CompraItem[]): void {
    this.totalComprobantesValidos = compras.length;
    this.totalBaseImponible = compras.reduce((acc, c) => acc + (c.biGravadoDg || 0), 0);
    this.totalIgv = compras.reduce((acc, c) => acc + (c.igvIpmDg || 0), 0);
    this.totalGeneral = compras.reduce((acc, c) => acc + (c.totalCp || 0), 0);
  }

  limpiarResultado(): void {
    this.mensajeExito = null;
    this.mensajeError = null;
    this.resultadoCarga = null;
    this.cargaActiva = null;
    this.comprasDetalle = [];
    this.ventasDetalle = [];
    this.erroresDetalle = [];
    this.totalComprobantesValidos = 0;
    this.totalBaseImponible = 0;
    this.totalIgv = 0;
    this.totalGeneral = 0;
  }
}