import { Component, OnInit, inject, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OperacionesService,
  LimitesTributariosEmpresasResponseDTO,
  EmpresaLimiteItemDTO,
  ConsumoLimiteDTO
} from '../contabilidad/services/operaciones.service';
import { ModalService, ModalType } from '../../../shared/ui/modal/modal.service';

@Component({
  selector: 'app-indicadores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './indicadores.component.html',
  styleUrl: './indicadores.component.css'
})
export class IndicadoresComponent implements OnInit {
  private operacionesService = inject(OperacionesService);
  private modalService = inject(ModalService);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  // Control del Año Fiscal (Datepicker de Año)
  anioActual: number = new Date().getFullYear();
  anioSeleccionado: number = new Date().getFullYear();
  mostrarYearPicker: boolean = false;
  decadaInicio: number = Math.floor(new Date().getFullYear() / 10) * 10;

  // Estados de Carga y Datos
  cargando: boolean = true;
  mensajeError: string | null = null;
  datosResumen: LimitesTributariosEmpresasResponseDTO | null = null;
  empresas: EmpresaLimiteItemDTO[] = [];

  // Filtros
  filtroSemaforo: 'TODOS' | 'ROJO' | 'AMBAR' | 'VERDE' = 'TODOS';
  filtroRegimen: string = 'TODOS';
  filtroBusqueda: string = '';

  // Ordenamiento
  ordenColumna: 'ventasPorcentaje' | 'ventasMonto' | 'comprasMonto' | 'razonSocial' | 'estado' = 'ventasPorcentaje';
  ordenAscendente: boolean = false;

  // Paginación
  paginaActual: number = 1;
  tamanoPagina: number = 10;
  opcionesTamanoPagina: number[] = [5, 10, 20, 50];

  ngOnInit(): void {
    this.cargarIndicadores(this.anioSeleccionado);
  }

  // --------------------------------------------------------------------------
  // Carga de Datos desde Backend (Service.Operaciones)
  // --------------------------------------------------------------------------
  cargarIndicadores(anio: number): void {
    this.cargando = true;
    this.mensajeError = null;

    this.operacionesService.obtenerLimitesEmpresas(anio).subscribe({
      next: (res: any) => {
        const payload = (res && (res.data || res.Data)) ? (res.data || res.Data) : res;
        this.datosResumen = payload;
        this.empresas = payload?.empresas || payload?.Empresas || [];
        if (payload?.anio && payload.anio > 0) {
          this.anioSeleccionado = Math.min(payload.anio, this.anioActual);
        }
        this.paginaActual = 1;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = 'No se pudieron cargar los indicadores tributarios. Por favor, reintente más tarde.';
        console.error('Error al obtener límites de empresas:', err);
        this.cdr.markForCheck();
      }
    });
  }

  // --------------------------------------------------------------------------
  // Modal de Detalle de Alerta / Estado Tributario
  // --------------------------------------------------------------------------
  mostrarDetalleAlerta(emp: EmpresaLimiteItemDTO, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const mensajeAlerta =
      emp.ventas?.alertaMensaje ||
      emp.compras?.alertaMensaje ||
      `La empresa ${emp.razonSocial} (RUC: ${emp.empresaRuc}) se encuentra dentro de los parámetros y topes normales establecidos por la SUNAT para el régimen ${emp.codigoRegimenTributario} en el año fiscal ${emp.anio || this.anioSeleccionado}.`;

    const tipoModal: ModalType =
      emp.estadoGeneralSemaforo === 'ROJO'
        ? 'error'
        : emp.estadoGeneralSemaforo === 'AMBAR'
        ? 'warning'
        : 'info';

    const tituloModal =
      emp.estadoGeneralSemaforo === 'ROJO'
        ? `Alerta Crítica SUNAT - ${emp.razonSocial}`
        : emp.estadoGeneralSemaforo === 'AMBAR'
        ? `Alerta Preventiva SUNAT - ${emp.razonSocial}`
        : `Estado Óptimo SUNAT - ${emp.razonSocial}`;

    this.modalService.open({
      type: tipoModal,
      title: tituloModal,
      message: mensajeAlerta,
      confirmText: 'Entendido'
    });
  }

  // --------------------------------------------------------------------------
  // Lógica del Datepicker de Solo Año (Tope Máximo Año Actual)
  // --------------------------------------------------------------------------
  toggleYearPicker(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.mostrarYearPicker = !this.mostrarYearPicker;
    if (this.mostrarYearPicker) {
      this.decadaInicio = Math.floor(this.anioSeleccionado / 10) * 10;
    }
  }

  cerrarYearPicker(): void {
    this.mostrarYearPicker = false;
  }

  navegarDecada(delta: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const nuevaDecada = this.decadaInicio + delta * 10;
    if (delta > 0 && nuevaDecada > this.anioActual) {
      return;
    }
    this.decadaInicio = nuevaDecada;
  }

  get puedeAvanzarDecada(): boolean {
    return this.decadaInicio + 10 <= this.anioActual;
  }

  get listaAniosDecada(): number[] {
    const anios: number[] = [];
    for (let i = 0; i < 10; i++) {
      anios.push(this.decadaInicio + i);
    }
    return anios;
  }

  seleccionarAnio(anio: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    // Restricción: No permitir años futuros superiores al año actual
    if (anio > this.anioActual) {
      return;
    }
    if (this.anioSeleccionado !== anio) {
      this.anioSeleccionado = anio;
      this.cargarIndicadores(anio);
    }
    this.cerrarYearPicker();
  }

  seleccionarAnioActual(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.seleccionarAnio(this.anioActual);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.mostrarYearPicker && !this.elementRef.nativeElement.contains(event.target)) {
      this.cerrarYearPicker();
    }
  }

  // --------------------------------------------------------------------------
  // Métricas y KPIs de Cabecera
  // --------------------------------------------------------------------------
  get totalEmpresas(): number {
    return this.datosResumen?.totalEmpresas ?? this.empresas.length;
  }

  get empresasEnRiesgo(): number {
    return this.datosResumen?.totalEmpresasEnRiesgoCritico ?? this.empresas.filter(e => e.estadoGeneralSemaforo === 'ROJO').length;
  }

  get empresasEnAlerta(): number {
    return this.datosResumen?.totalEmpresasEnAlerta ?? this.empresas.filter(e => e.estadoGeneralSemaforo === 'AMBAR').length;
  }

  get empresasNormales(): number {
    return this.datosResumen?.totalEmpresasNormales ?? this.empresas.filter(e => e.estadoGeneralSemaforo === 'VERDE').length;
  }

  get valorUitReferencia(): number {
    return this.datosResumen?.valorUitReferencia ?? 0;
  }

  get cantidadRer(): number {
    return this.empresas.filter(e => e.codigoRegimenTributario === 'RER').length;
  }

  get cantidadMype(): number {
    return this.empresas.filter(e => e.codigoRegimenTributario === 'RMT').length;
  }

  get cantidadGeneral(): number {
    return this.empresas.filter(e => e.codigoRegimenTributario === 'RG').length;
  }

  get cantidadNrus(): number {
    return this.empresas.filter(e => e.codigoRegimenTributario === 'NRUS').length;
  }

  get totalVentasGlobal(): number {
    return this.empresas.reduce((acc, e) => acc + (e.ventas?.acumuladoAnual || 0), 0);
  }

  get totalComprasGlobal(): number {
    return this.empresas.reduce((acc, e) => acc + (e.compras?.acumuladoAnual || 0), 0);
  }

  // --------------------------------------------------------------------------
  // Filtrado y Búsqueda
  // --------------------------------------------------------------------------
  get empresasFiltradas(): EmpresaLimiteItemDTO[] {
    if (!this.empresas || this.empresas.length === 0) {
      return [];
    }

    let lista = [...this.empresas];

    // 1. Filtro por Semáforo
    if (this.filtroSemaforo && this.filtroSemaforo !== 'TODOS') {
      lista = lista.filter(e => e.estadoGeneralSemaforo === this.filtroSemaforo);
    }

    // 2. Filtro por Régimen
    if (this.filtroRegimen && this.filtroRegimen !== 'TODOS') {
      lista = lista.filter(e => e.codigoRegimenTributario === this.filtroRegimen);
    }

    // 3. Filtro por Buscador (RUC o Razón Social)
    if (this.filtroBusqueda && this.filtroBusqueda.trim()) {
      const q = this.filtroBusqueda.toLowerCase().trim();
      lista = lista.filter(e =>
        (e.empresaRuc && e.empresaRuc.toLowerCase().includes(q)) ||
        (e.razonSocial && e.razonSocial.toLowerCase().includes(q)) ||
        (e.nombreComercial && e.nombreComercial.toLowerCase().includes(q))
      );
    }

    // 4. Ordenamiento defensivo
    lista.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (this.ordenColumna) {
        case 'ventasPorcentaje':
          valA = a.ventas?.porcentajeConsumo ?? -1;
          valB = b.ventas?.porcentajeConsumo ?? -1;
          break;
        case 'ventasMonto':
          valA = a.ventas?.acumuladoAnual || 0;
          valB = b.ventas?.acumuladoAnual || 0;
          break;
        case 'comprasMonto':
          valA = a.compras?.acumuladoAnual || 0;
          valB = b.compras?.acumuladoAnual || 0;
          break;
        case 'razonSocial':
          valA = (a.razonSocial || '').toLowerCase();
          valB = (b.razonSocial || '').toLowerCase();
          break;
        case 'estado':
          const pesos: Record<string, number> = { 'ROJO': 3, 'AMBAR': 2, 'VERDE': 1 };
          valA = pesos[a.estadoGeneralSemaforo || ''] || 0;
          valB = pesos[b.estadoGeneralSemaforo || ''] || 0;
          break;
      }

      if (valA < valB) return this.ordenAscendente ? -1 : 1;
      if (valA > valB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });

    return lista;
  }

  // --------------------------------------------------------------------------
  // Paginación
  // --------------------------------------------------------------------------
  get empresasPaginadas(): EmpresaLimiteItemDTO[] {
    const inicio = (this.paginaActual - 1) * this.tamanoPagina;
    return this.empresasFiltradas.slice(inicio, inicio + this.tamanoPagina);
  }

  get totalRegistrosFiltrados(): number {
    return this.empresasFiltradas.length;
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalRegistrosFiltrados / this.tamanoPagina) || 1;
  }

  get indiceInicio(): number {
    if (this.totalRegistrosFiltrados === 0) return 0;
    return (this.paginaActual - 1) * this.tamanoPagina + 1;
  }

  get indiceFin(): number {
    return Math.min(this.paginaActual * this.tamanoPagina, this.totalRegistrosFiltrados);
  }

  get listaPaginas(): number[] {
    const pags: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.paginaActual - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPaginas, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pags.push(i);
    }
    return pags;
  }

  cambiarPagina(pag: number): void {
    if (pag >= 1 && pag <= this.totalPaginas) {
      this.paginaActual = pag;
    }
  }

  cambiarTamanoPagina(tam: number): void {
    this.tamanoPagina = Number(tam);
    this.paginaActual = 1;
  }

  ordenar(columna: 'ventasPorcentaje' | 'ventasMonto' | 'comprasMonto' | 'razonSocial' | 'estado'): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = false;
    }
    this.paginaActual = 1;
  }
}
