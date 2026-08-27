import { Component, viewChild, inject, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnrutadorComprobantesService } from './services/enrutador_comprobantes.service';
import { ComprobanteUniversal, FichaCdr } from './models/comprobante-universal.model';

type EstadoVista = 'vacio' | 'analizando' | 'listo' | 'error';

const COLORES_ACENTO: Record<string, string> = {
  FACTURA: '#0d9488',
  BOLETA: '#d97706',
  NOTA_CREDITO: '#be185d',
  NOTA_DEBITO: '#ea580c',
  CDR: '#4f46e5',
};

@Component({
  selector: 'app-visor-comprobantes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visor-comprobantes.component.html',
  styleUrl: './visor-comprobantes.component.css',
})
export class VisorComprobantesComponent {
  private enrutador = inject(EnrutadorComprobantesService);
  private inputArchivoRef = viewChild<ElementRef<HTMLInputElement>>('inputArchivo');

  estado = signal<EstadoVista>('vacio');
  arrastrando = signal(false);
  nombreArchivo = signal('');
  comprobante = signal<ComprobanteUniversal | null>(null);
  cdr = signal<FichaCdr | null>(null);
  colorAcento = signal(COLORES_ACENTO['FACTURA']);

  private archivoPendiente: File | null = null;

  get acentoSuave(): string {
    return this.colorAcento() + '14';
  }

  get acentoSombra(): string {
    return this.colorAcento() + '2e';
  }

  get esNota(): boolean {
    const tipo = this.comprobante()?.tipo;
    return tipo === 'NOTA_CREDITO' || tipo === 'NOTA_DEBITO';
  }

  alSeleccionar(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    if (archivo) this.prepararArchivo(archivo);
    input.value = '';
  }

  alArrastrarSobre(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(true);
  }

  alSalirDelArrastre(): void {
    this.arrastrando.set(false);
  }

  alSoltar(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo) this.prepararArchivo(archivo);
  }

  async visualizar(): Promise<void> {
    const archivo = this.archivoPendiente;
    if (!archivo) return;

    this.estado.set('analizando');
    const resultado = await this.enrutador.analizarArchivo(archivo);

    if (!resultado.ok) {
      this.estado.set('error');
      return;
    }

    this.comprobante.set(resultado.comprobante);
    this.cdr.set(resultado.cdr);
    this.colorAcento.set(
      resultado.cdr ? COLORES_ACENTO['CDR'] : COLORES_ACENTO[resultado.comprobante!.tipo],
    );
    this.estado.set('listo');
  }

  reiniciar(): void {
    this.estado.set('vacio');
    this.nombreArchivo.set('');
    this.comprobante.set(null);
    this.cdr.set(null);
    this.archivoPendiente = null;
    const input = this.inputArchivoRef();
    if (input) input.nativeElement.value = '';
  }

  sumaOperaciones(comp: ComprobanteUniversal): number | null {
    if (comp.totalPagar == null) return null;
    return comp.totalPagar - (comp.totalIgv ?? 0);
  }

  simboloMoneda(codigo: string): string {
    switch (codigo.toUpperCase()) {
      case 'PEN':
        return 'S/';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      default:
        return codigo || 'S/';
    }
  }

  private prepararArchivo(archivo: File): void {
    this.archivoPendiente = archivo;
    this.nombreArchivo.set(archivo.name);
    if (this.estado() === 'error') this.estado.set('vacio');
  }
}
