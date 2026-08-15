import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../../shared/ui/loading/loading.component';
import { LoadingService } from '../../../shared/ui/loading/loading.service';
import {
  TipoCambioRealService,
  TipoCambioDiario,
  TipoCambioEntry,
} from './services/tipo-cambio-real.service';

interface DiaCalendario {
  numero: number;
  fecha: string;
  enMesActual: boolean;
  datos: TipoCambioEntry | null;
  esHoy: boolean;
}

interface TipoCambioMensual {
  anio: number;
  mes: number;
  mesNombre: string;
  promeCompra: number;
  promeVenta: number;
  registros: TipoCambioEntry[];
}

@Component({
  selector: 'app-tipo-cambio',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './tipo_cambio.component.html',
  styleUrl: './tipo_cambio.component.css',
})
export class TipoCambioComponent implements OnInit {
  private servicioReal = inject(TipoCambioRealService);
  private cdr = inject(ChangeDetectorRef);
  private loading = inject(LoadingService);

  datosMes: TipoCambioMensual | null = null;
  datosDia: TipoCambioDiario | null = null;
  error: string | null = null;

  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  anioActual = new Date().getFullYear();
  mesActual = new Date().getMonth() + 1;

  anioSeleccionado = new Date().getFullYear();
  mesSeleccionado = new Date().getMonth() + 1;

  anioSelector = new Date().getFullYear();
  mostrarSelector = false;

  listaMeses = [
    { value: 1, nombre: 'Enero' },
    { value: 2, nombre: 'Febrero' },
    { value: 3, nombre: 'Marzo' },
    { value: 4, nombre: 'Abril' },
    { value: 5, nombre: 'Mayo' },
    { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' },
    { value: 8, nombre: 'Agosto' },
    { value: 9, nombre: 'Septiembre' },
    { value: 10, nombre: 'Octubre' },
    { value: 11, nombre: 'Noviembre' },
    { value: 12, nombre: 'Diciembre' },
  ];

  listaAnios: number[] = [];

  semanas: DiaCalendario[][] = [];

  ngOnInit(): void {
    const anioBase = new Date().getFullYear();
    this.listaAnios = [];
    for (let a = anioBase; a >= 2000; a--) {
      this.listaAnios.push(a);
    }
    this.cargarTipoCambioDelDia();
    this.cargarDatos();
  }

  cargarTipoCambioDelDia(): void {
    this.loading.show();
    this.servicioReal.insertarSiNoExiste().subscribe({
      next: () => {
        this.servicioReal.obtenerPorFecha('USD', this.formatearFechaHoy()).subscribe({
          next: (datos) => {
            this.datosDia = datos;
            this.loading.hide();
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.loading.hide();
            this.error = 'Error al obtener el tipo de cambio del día.';
            console.error(err);
          },
        });
      },
      error: (err) => {
        this.loading.hide();
        this.error = 'Error al preparar los datos del tipo de cambio del día.';
        console.error(err);
      },
    });
  }

  private formatearFechaHoy(): string {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  cargarDatos(): void {
    this.error = null;
    this.loading.show();
    this.servicioReal.insertarMasivo(this.anioSeleccionado, this.mesSeleccionado).subscribe({
      next: () => {
        this.servicioReal.obtenerPorMes(this.mesSeleccionado, this.anioSeleccionado).subscribe({
          next: (registros) => {
            this.anioActual = this.anioSeleccionado;
            this.mesActual = this.mesSeleccionado;
            this.datosMes = this.mapearRespuesta(registros);
            if (!this.datosMes.registros.length) {
              this.error = 'No se encontraron datos para el mes seleccionado';
            }
            this.generarCalendario();
            this.loading.hide();
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.loading.hide();
            this.error = 'Error al obtener los datos del mes. Intente de nuevo.';
            console.error(err);
          },
        });
      },
      error: (err) => {
        this.loading.hide();
        this.error = 'Error al preparar los datos del mes. Intente de nuevo.';
        console.error(err);
      },
    });
  }

  private mapearRespuesta(registros: TipoCambioDiario[]): TipoCambioMensual {
    const nombreMes = this.listaMeses.find((m) => m.value === this.mesActual)?.nombre || '';
    const registrosMapeados: TipoCambioEntry[] = registros.map((r) => ({
      fecha: r.fecha.substring(0, 10),
      compra: r.precioCompra,
      venta: r.precioVenta,
    }));

    const promeCompra =
      registrosMapeados.length > 0
        ? registrosMapeados.reduce((s, r) => s + r.compra, 0) / registrosMapeados.length
        : 0;
    const promeVenta =
      registrosMapeados.length > 0
        ? registrosMapeados.reduce((s, r) => s + r.venta, 0) / registrosMapeados.length
        : 0;

    return {
      anio: this.anioActual,
      mes: this.mesActual,
      mesNombre: nombreMes,
      promeCompra: Math.round(promeCompra * 1000) / 1000,
      promeVenta: Math.round(promeVenta * 1000) / 1000,
      registros: registrosMapeados,
    };
  }

  get mesNombre(): string {
    const m = this.listaMeses.find((x) => x.value === this.mesActual);
    return m ? m.nombre : '';
  }

  navegarMes(delta: number): void {
    const fecha = new Date(this.anioSeleccionado, this.mesSeleccionado - 1 + delta, 1);
    this.anioSeleccionado = fecha.getFullYear();
    this.mesSeleccionado = fecha.getMonth() + 1;
    this.cargarDatos();
  }

  irAlMesActual(): void {
    this.anioSeleccionado = new Date().getFullYear();
    this.mesSeleccionado = new Date().getMonth() + 1;
    this.cargarDatos();
  }

  toggleSelector(): void {
    this.anioSelector = this.anioSeleccionado;
    this.mostrarSelector = !this.mostrarSelector;
  }

  cerrarSelector(): void {
    this.mostrarSelector = false;
  }

  navegarAnioSelector(delta: number): void {
    const anioMin = 2000;
    const anioMax = new Date().getFullYear();
    const nuevoAnio = this.anioSelector + delta;
    if (nuevoAnio >= anioMin && nuevoAnio <= anioMax) {
      this.anioSelector = nuevoAnio;
    }
  }

  seleccionarMes(valor: number): void {
    const hoy = new Date();
    const anioHoy = hoy.getFullYear();
    const mesHoy = hoy.getMonth() + 1;

    const bloqueado =
      this.anioSelector > anioHoy ||
      (this.anioSelector === anioHoy && valor > mesHoy);

    if (bloqueado) return;

    this.mesSeleccionado = valor;
    this.anioSeleccionado = this.anioSelector;
    this.mostrarSelector = false;
  }

  mesBloqueado(valor: number): boolean {
    const hoy = new Date();
    const anioHoy = hoy.getFullYear();
    const mesHoy = hoy.getMonth() + 1;

    return (
      this.anioSelector > anioHoy ||
      (this.anioSelector === anioHoy && valor > mesHoy)
    );
  }

  anioSelectorAnteriorHabilitado(): boolean {
    return this.anioSelector > 2000;
  }

  anioSelectorSiguienteHabilitado(): boolean {
    return this.anioSelector < new Date().getFullYear();
  }

  get nombreMesSeleccionado(): string {
    const m = this.listaMeses.find((x) => x.value === this.mesSeleccionado);
    return m ? m.nombre : '';
  }

  private generarCalendario(): void {
    const primerDia = new Date(this.anioActual, this.mesActual - 1, 1);
    const diasEnMes = new Date(this.anioActual, this.mesActual, 0).getDate();
    const offset = primerDia.getDay();

    const mapa = new Map<string, TipoCambioEntry>();
    if (this.datosMes) {
      for (const r of this.datosMes.registros) mapa.set(r.fecha, r);
    }

    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    const celdas: DiaCalendario[] = [];
    const totalCeldas = Math.ceil((offset + diasEnMes) / 7) * 7;

    for (let i = 0; i < totalCeldas; i++) {
      const diaRelativo = i - offset + 1;
      let fecha: string;
      let enMesActual = true;

      if (diaRelativo < 1) {
        enMesActual = false;
        const diaMesAnt = new Date(this.anioActual, this.mesActual - 1, diaRelativo);
        fecha = this.formatearFecha(diaMesAnt);
      } else if (diaRelativo > diasEnMes) {
        enMesActual = false;
        const diaMesSig = new Date(this.anioActual, this.mesActual - 1, diaRelativo);
        fecha = this.formatearFecha(diaMesSig);
      } else {
        fecha = `${this.anioActual}-${String(this.mesActual).padStart(2, '0')}-${String(diaRelativo).padStart(2, '0')}`;
      }

      celdas.push({
        numero: parseInt(fecha.split('-')[2], 10),
        fecha,
        enMesActual,
        datos: mapa.get(fecha) || null,
        esHoy: fecha === hoyStr,
      });
    }

    this.semanas = [];
    for (let i = 0; i < celdas.length; i += 7) {
      this.semanas.push(celdas.slice(i, i + 7));
    }
  }

  private formatearFecha(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }
}
