import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ObservacionItem {
  numeroLinea?: number;
  tipoError?: string;
  campoError?: string | null;
  valorLectura?: string | null;
  mensaje: string;
  severidad?: 'Error' | 'Advertencia' | string;
}

@Component({
  selector: 'app-modal-observaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-observaciones.component.html',
  styleUrl: './modal-observaciones.component.css'
})
export class ModalObservacionesComponent implements OnChanges {
  @Input() visible: boolean = false;
  @Input() titulo: string = 'Detalle de Observaciones y Advertencias';
  @Input() subtitulo?: string;
  @Input() observaciones: ObservacionItem[] = [];

  @Output() cerrar = new EventEmitter<void>();

  listaOrdenada: ObservacionItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observaciones']) {
      this.ordenarObservaciones();
    }
  }

  private ordenarObservaciones(): void {
    this.listaOrdenada = (this.observaciones || []).slice().sort((a, b) => {
      const tipoA = (a.tipoError || '').toLowerCase();
      const tipoB = (b.tipoError || '').toLowerCase();
      const cmpTipo = tipoA.localeCompare(tipoB);
      if (cmpTipo !== 0) return cmpTipo;

      const campoA = (a.campoError || '').toLowerCase();
      const campoB = (b.campoError || '').toLowerCase();
      const cmpCampo = campoA.localeCompare(campoB);
      if (cmpCampo !== 0) return cmpCampo;

      return (a.numeroLinea || 0) - (b.numeroLinea || 0);
    });
  }

  trackByObservacion(index: number, item: ObservacionItem): string {
    return `${item.tipoError}_${item.campoError}_${item.numeroLinea}_${item.mensaje}`;
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}
