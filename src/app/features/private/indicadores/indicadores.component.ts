import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export interface IndicadorEmpresa {
  idEmpresa: string;
  ruc: string;
  razonSocial: string;
  regimen: 'RER' | 'MYPE Tributario' | 'General' | 'NRUS';
  ventasAcumuladasAnual: number;
  comprasAcumuladasAnual: number;
  limiteRegimen: number;
  porcentajeUso: number; // 0-100+
  estadoAlerta: 'Normal' | 'Advertencia' | 'Critico';
  ultimoPeriodo: string;
  totalComprobantes: number;
}

@Component({
  selector: 'app-indicadores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './indicadores.component.html',
  styleUrl: './indicadores.component.css'
})
export class IndicadoresComponent implements OnInit {
  filtroRegimen: string = 'Todos';
  filtroAlerta: string = 'Todos';
  filtroBusqueda: string = '';
  ordenColumna: string = 'porcentajeUso';
  ordenAscendente: boolean = false;

  // Datos mock de prototipo para análisis tributario de empresas
  empresasIndicadores: IndicadorEmpresa[] = [
    {
      idEmpresa: 'emp-1',
      ruc: '20601234567',
      razonSocial: 'COMERCIALIZADORA LOS ANDES S.A.C.',
      regimen: 'RER',
      ventasAcumuladasAnual: 485200.00,
      comprasAcumuladasAnual: 390100.00,
      limiteRegimen: 525000.00, // Límite RER: S/ 525,000 anuales
      porcentajeUso: 92.42,
      estadoAlerta: 'Critico',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 428
    },
    {
      idEmpresa: 'emp-2',
      ruc: '20504012345',
      razonSocial: 'DEBEL INVERSIONES S.A.C.',
      regimen: 'RER',
      ventasAcumuladasAnual: 415600.00,
      comprasAcumuladasAnual: 298400.00,
      limiteRegimen: 525000.00,
      porcentajeUso: 79.16,
      estadoAlerta: 'Advertencia',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 653
    },
    {
      idEmpresa: 'emp-3',
      ruc: '20492837162',
      razonSocial: 'DISTRIBUIDORA FERRETERA DEL CENTRO S.R.L.',
      regimen: 'MYPE Tributario',
      ventasAcumuladasAnual: 1450200.00,
      comprasAcumuladasAnual: 1120000.00,
      limiteRegimen: 1700 * 5350, // 1700 UIT (UIT 2026 ~ 5,350 = S/ 9,095,000)
      porcentajeUso: 15.94,
      estadoAlerta: 'Normal',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 1240
    },
    {
      idEmpresa: 'emp-4',
      ruc: '20100070970',
      razonSocial: 'SERVICIOS LOGISTICOS GLOBALES S.A.C.',
      regimen: 'MYPE Tributario',
      ventasAcumuladasAnual: 2850000.00,
      comprasAcumuladasAnual: 2150000.00,
      limiteRegimen: 1700 * 5350,
      porcentajeUso: 31.33,
      estadoAlerta: 'Normal',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 890
    },
    {
      idEmpresa: 'emp-5',
      ruc: '20789456123',
      razonSocial: 'TEXTILES & CONFECCIONES DEL VALLE E.I.R.L.',
      regimen: 'RER',
      ventasAcumuladasAnual: 512400.00,
      comprasAcumuladasAnual: 410000.00,
      limiteRegimen: 525000.00,
      porcentajeUso: 97.60,
      estadoAlerta: 'Critico',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 312
    },
    {
      idEmpresa: 'emp-6',
      ruc: '20334455667',
      razonSocial: 'CONSULTORES EN INGENIERIA TECH S.A.C.',
      regimen: 'General',
      ventasAcumuladasAnual: 4200000.00,
      comprasAcumuladasAnual: 2900000.00,
      limiteRegimen: 0, // Sin tope límite
      porcentajeUso: 0,
      estadoAlerta: 'Normal',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 520
    },
    {
      idEmpresa: 'emp-7',
      ruc: '10436998525',
      razonSocial: 'QUIROZ CABAÑAS LIS LINDAURA',
      regimen: 'NRUS',
      ventasAcumuladasAnual: 88500.00,
      comprasAcumuladasAnual: 62000.00,
      limiteRegimen: 96000.00,
      porcentajeUso: 92.18,
      estadoAlerta: 'Critico',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 180
    },
    {
      idEmpresa: 'emp-8',
      ruc: '20608899112',
      razonSocial: 'INVERSIONES GASTRONOMICAS DEL SUR S.A.C.',
      regimen: 'RER',
      ventasAcumuladasAnual: 460000.00,
      comprasAcumuladasAnual: 310500.00,
      limiteRegimen: 525000.00,
      porcentajeUso: 87.61,
      estadoAlerta: 'Advertencia',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 395
    },
    {
      idEmpresa: 'emp-9',
      ruc: '20556677889',
      razonSocial: 'IMPORTADORA Y EXPORTADORA PACIFICO S.A.C.',
      regimen: 'MYPE Tributario',
      ventasAcumuladasAnual: 5200000.00,
      comprasAcumuladasAnual: 4100000.00,
      limiteRegimen: 1700 * 5350,
      porcentajeUso: 57.17,
      estadoAlerta: 'Normal',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 1650
    },
    {
      idEmpresa: 'emp-10',
      ruc: '20443322110',
      razonSocial: 'CONSTRUCTORA E INMOBILIARIA HORIZONTE S.A.C.',
      regimen: 'General',
      ventasAcumuladasAnual: 8900000.00,
      comprasAcumuladasAnual: 6700000.00,
      limiteRegimen: 0,
      porcentajeUso: 0,
      estadoAlerta: 'Normal',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 2100
    },
    {
      idEmpresa: 'emp-11',
      ruc: '10778899001',
      razonSocial: 'MENDOZA BAZAN CARLOS ENRIQUE',
      regimen: 'NRUS',
      ventasAcumuladasAnual: 65400.00,
      comprasAcumuladasAnual: 45000.00,
      limiteRegimen: 96000.00,
      porcentajeUso: 68.12,
      estadoAlerta: 'Normal',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 95
    },
    {
      idEmpresa: 'emp-12',
      ruc: '20112233445',
      razonSocial: 'AGROINDUSTRIAS DEL NORTE PERU S.A.C.',
      regimen: 'MYPE Tributario',
      ventasAcumuladasAnual: 8200000.00,
      comprasAcumuladasAnual: 6800000.00,
      limiteRegimen: 1700 * 5350,
      porcentajeUso: 90.15,
      estadoAlerta: 'Critico',
      ultimoPeriodo: '2026-05',
      totalComprobantes: 1840
    }
  ];

  // Paginador
  paginaActual: number = 1;
  tamanoPagina: number = 5;
  opcionesTamanoPagina: number[] = [5, 10, 20];

  ngOnInit(): void {}

  // Métricas calculadas para Dashboard Superior
  get totalEmpresas(): number {
    return this.empresasIndicadores.length;
  }

  get cantidadRer(): number {
    return this.empresasIndicadores.filter(e => e.regimen === 'RER').length;
  }

  get cantidadMype(): number {
    return this.empresasIndicadores.filter(e => e.regimen === 'MYPE Tributario').length;
  }

  get cantidadGeneral(): number {
    return this.empresasIndicadores.filter(e => e.regimen === 'General').length;
  }

  get cantidadNrus(): number {
    return this.empresasIndicadores.filter(e => e.regimen === 'NRUS').length;
  }

  get cantidadEnRiesgo(): number {
    return this.empresasIndicadores.filter(e => e.estadoAlerta === 'Critico' || e.estadoAlerta === 'Advertencia').length;
  }

  get totalVentasGlobales(): number {
    return this.empresasIndicadores.reduce((acc, e) => acc + e.ventasAcumuladasAnual, 0);
  }

  get totalComprasGlobales(): number {
    return this.empresasIndicadores.reduce((acc, e) => acc + e.comprasAcumuladasAnual, 0);
  }

  get empresasFiltradas(): IndicadorEmpresa[] {
    let lista = [...this.empresasIndicadores];

    if (this.filtroRegimen !== 'Todos') {
      lista = lista.filter(e => e.regimen === this.filtroRegimen);
    }

    if (this.filtroAlerta !== 'Todos') {
      lista = lista.filter(e => e.estadoAlerta === this.filtroAlerta);
    }

    if (this.filtroBusqueda.trim()) {
      const q = this.filtroBusqueda.trim().toLowerCase();
      lista = lista.filter(e =>
        e.razonSocial.toLowerCase().includes(q) ||
        e.ruc.includes(q)
      );
    }

    lista.sort((a: any, b: any) => {
      const valA = a[this.ordenColumna];
      const valB = b[this.ordenColumna];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.ordenAscendente ? valA - valB : valB - valA;
      }
      return this.ordenAscendente
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return lista;
  }

  // Lista paginada que se muestra en la tabla
  get empresasPaginadas(): IndicadorEmpresa[] {
    const inicio = (this.paginaActual - 1) * this.tamanoPagina;
    return this.empresasFiltradas.slice(inicio, inicio + this.tamanoPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.empresasFiltradas.length / this.tamanoPagina) || 1;
  }

  get totalRegistrosFiltrados(): number {
    return this.empresasFiltradas.length;
  }

  get indiceInicio(): number {
    if (this.totalRegistrosFiltrados === 0) return 0;
    return (this.paginaActual - 1) * this.tamanoPagina + 1;
  }

  get indiceFin(): number {
    const fin = this.paginaActual * this.tamanoPagina;
    return fin > this.totalRegistrosFiltrados ? this.totalRegistrosFiltrados : fin;
  }

  get listaPaginas(): number[] {
    const paginas: number[] = [];
    for (let i = 1; i <= this.totalPaginas; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  cambiarTamanoPagina(tamano: number): void {
    this.tamanoPagina = Number(tamano);
    this.paginaActual = 1;
  }

  aplicarFiltroRegimen(regimen: string): void {
    this.filtroRegimen = regimen;
    this.paginaActual = 1;
  }

  ordenar(columna: string): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = false;
    }
  }
}
