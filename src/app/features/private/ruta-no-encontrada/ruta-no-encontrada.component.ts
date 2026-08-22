import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalService } from '../../../shared/ui/modal/modal.service';
import { NavigationHistoryService } from '../../../core/services/navigation-history.service';

/**
 * Componente "fantasma" para rutas inexistentes bajo /home: no renderiza nada,
 * avisa al usuario y lo devuelve a la última ruta válida (sin sacarlo de la
 * zona privada).
 */
@Component({
  selector: 'app-ruta-no-encontrada',
  standalone: true,
  template: '',
})
export class RutaNoEncontradaComponent {
  private router = inject(Router);
  private modalService = inject(ModalService);
  private history = inject(NavigationHistoryService);

  constructor() {
    this.modalService
      .open({
        type: 'info',
        title: 'Ruta no encontrada',
        message: 'La página a la que intentó acceder no existe. Será redirigido a la página anterior.',
        confirmText: 'Volver',
      })
      .then(() => this.router.navigateByUrl(this.history.anterior(this.router.url)));
  }
}
