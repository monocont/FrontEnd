import { inject } from '@angular/core';
import { of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface TipoCambioEntry {
  fecha: string;
  compra: number;
  venta: number;
}

export interface TipoCambioMensual {
  anio: number;
  mes: number;
  mesNombre: string;
  promeCompra: number;
  promeVenta: number;
  registros: TipoCambioEntry[];
}

interface ResponseWrapper {
  data?: {
    exitoso: boolean;
    mensaje: string;
    resultado: TipoCambioMensual | null;
  };
  Data?: {
    exitoso: boolean;
    mensaje: string;
    resultado: TipoCambioMensual | null;
  };
}

export class ServicioTipoCambio {
  private static readonly MOCK: TipoCambioMensual[] = [
    {
      anio: 2026, mes: 8, mesNombre: 'Agosto',
      promeCompra: 3.72, promeVenta: 3.75,
      registros: [
        { fecha: '2026-08-03', compra: 3.71, venta: 3.74 },
        { fecha: '2026-08-04', compra: 3.72, venta: 3.75 },
        { fecha: '2026-08-05', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-06', compra: 3.72, venta: 3.75 },
        { fecha: '2026-08-07', compra: 3.71, venta: 3.74 },
        { fecha: '2026-08-08', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-11', compra: 3.74, venta: 3.77 },
        { fecha: '2026-08-12', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-13', compra: 3.72, venta: 3.75 },
        { fecha: '2026-08-14', compra: 3.71, venta: 3.74 },
        { fecha: '2026-08-15', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-16', compra: 3.74, venta: 3.77 },
        { fecha: '2026-08-17', compra: 3.72, venta: 3.75 },
        { fecha: '2026-08-18', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-19', compra: 3.74, venta: 3.77 },
        { fecha: '2026-08-20', compra: 3.75, venta: 3.78 },
        { fecha: '2026-08-21', compra: 3.74, venta: 3.77 },
        { fecha: '2026-08-22', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-23', compra: 3.72, venta: 3.75 },
        { fecha: '2026-08-24', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-25', compra: 3.74, venta: 3.77 },
        { fecha: '2026-08-26', compra: 3.75, venta: 3.78 },
        { fecha: '2026-08-27', compra: 3.73, venta: 3.76 },
        { fecha: '2026-08-28', compra: 3.74, venta: 3.77 },
        { fecha: '2026-08-29', compra: 3.75, venta: 3.78 },
      ],
    },
    {
      anio: 2026, mes: 7, mesNombre: 'Julio',
      promeCompra: 3.69, promeVenta: 3.72,
      registros: [
        { fecha: '2026-07-01', compra: 3.68, venta: 3.71 },
        { fecha: '2026-07-02', compra: 3.69, venta: 3.72 },
        { fecha: '2026-07-03', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-06', compra: 3.69, venta: 3.72 },
        { fecha: '2026-07-07', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-08', compra: 3.68, venta: 3.71 },
        { fecha: '2026-07-09', compra: 3.69, venta: 3.72 },
        { fecha: '2026-07-10', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-13', compra: 3.71, venta: 3.74 },
        { fecha: '2026-07-14', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-15', compra: 3.69, venta: 3.72 },
        { fecha: '2026-07-16', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-17', compra: 3.71, venta: 3.74 },
        { fecha: '2026-07-20', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-21', compra: 3.69, venta: 3.72 },
        { fecha: '2026-07-22', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-23', compra: 3.71, venta: 3.74 },
        { fecha: '2026-07-24', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-27', compra: 3.69, venta: 3.72 },
        { fecha: '2026-07-28', compra: 3.70, venta: 3.73 },
        { fecha: '2026-07-29', compra: 3.71, venta: 3.74 },
      ],
    },
    {
      anio: 2026, mes: 6, mesNombre: 'Junio',
      promeCompra: 3.66, promeVenta: 3.69,
      registros: [
        { fecha: '2026-06-01', compra: 3.65, venta: 3.68 },
        { fecha: '2026-06-02', compra: 3.66, venta: 3.69 },
        { fecha: '2026-06-03', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-04', compra: 3.66, venta: 3.69 },
        { fecha: '2026-06-05', compra: 3.65, venta: 3.68 },
        { fecha: '2026-06-08', compra: 3.66, venta: 3.69 },
        { fecha: '2026-06-09', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-10', compra: 3.68, venta: 3.71 },
        { fecha: '2026-06-11', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-12', compra: 3.66, venta: 3.69 },
        { fecha: '2026-06-15', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-16', compra: 3.68, venta: 3.71 },
        { fecha: '2026-06-17', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-18', compra: 3.66, venta: 3.69 },
        { fecha: '2026-06-19', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-22', compra: 3.68, venta: 3.71 },
        { fecha: '2026-06-23', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-24', compra: 3.66, venta: 3.69 },
        { fecha: '2026-06-25', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-26', compra: 3.68, venta: 3.71 },
        { fecha: '2026-06-29', compra: 3.67, venta: 3.70 },
        { fecha: '2026-06-30', compra: 3.66, venta: 3.69 },
      ],
    },
  ];

  obtenerPorMes(anio: number, mes: number) {
    const resultado = ServicioTipoCambio.MOCK.find((m) => m.anio === anio && m.mes === mes);
    const respuesta: ResponseWrapper = {
      data: {
        exitoso: !!resultado,
        mensaje: resultado ? 'Consulta exitosa' : 'No se encontraron datos para el mes seleccionado',
        resultado: resultado || null,
      },
    };
    return of(respuesta).pipe(
      catchError((error) => {
        console.error('Error al obtener tipo de cambiio:', error);
        return of({ data: { exitoso: false, mensaje: 'Error al obtener datos', resultado: null } });
      })
    );
  }
}